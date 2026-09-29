"""Numbers for each run, and a trace in the OpenTelemetry shape.

metrics.jsonl: one line per finished run, for success rate, retries, cost and time.
otel/traces.jsonl: one span per run and one per attempt, in OTLP JSON, using the GenAI
attribute names. Set OTEL_EXPORTER_OTLP_ENDPOINT to also send them to a collector.
"""

import hashlib
import json
import os
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any

from tools.factory.paths import state_dir


def record_run(outcome: dict[str, Any], cwd: Path | None = None) -> None:
    with (state_dir(cwd) / "metrics.jsonl").open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(outcome) + "\n")


def read_runs(cwd: Path | None = None) -> list[dict[str, Any]]:
    path = state_dir(cwd) / "metrics.jsonl"
    if not path.exists():
        return []
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return rows


def summary(runs: list[dict[str, Any]]) -> dict[str, dict[str, float]]:
    """Per agent: runs, success rate, mean attempts, mean cost, mean minutes."""
    by_agent: dict[str, list[dict[str, Any]]] = {}
    for run in runs:
        by_agent.setdefault(run.get("agent", "?"), []).append(run)
    out = {}
    for agent, rows in by_agent.items():
        n = len(rows)
        out[agent] = {
            "runs": n,
            "success_rate": round(sum(r.get("status") == "done" for r in rows) / n, 3),
            "mean_attempts": round(sum(r.get("attempts", 0) for r in rows) / n, 2),
            "mean_cost_usd": round(sum(r.get("cost_usd", 0.0) for r in rows) / n, 2),
            "mean_minutes": round(sum(r.get("seconds", 0) for r in rows) / n / 60, 1),
        }
    return out


def _nanos(iso: str) -> str:
    return str(int(datetime.fromisoformat(iso).timestamp() * 1_000_000_000))


def _attr(key: str, value: Any) -> dict[str, Any]:
    if isinstance(value, bool):
        return {"key": key, "value": {"boolValue": value}}
    if isinstance(value, int):
        return {"key": key, "value": {"intValue": str(value)}}
    if isinstance(value, float):
        return {"key": key, "value": {"doubleValue": value}}
    return {"key": key, "value": {"stringValue": str(value)}}


def span(
    trace_key: str,
    name: str,
    start: str,
    end: str,
    attributes: dict[str, Any],
    parent_key: str = "",
    ok: bool = True,
) -> dict[str, Any]:
    trace_id = hashlib.sha256(trace_key.encode()).hexdigest()[:32]
    span_id = hashlib.sha256((trace_key + name + start).encode()).hexdigest()[:16]
    parent = hashlib.sha256(parent_key.encode()).hexdigest()[:16] if parent_key else ""
    return {
        "traceId": trace_id,
        "spanId": span_id,
        "parentSpanId": parent,
        "name": name,
        "kind": 3,
        "startTimeUnixNano": _nanos(start),
        "endTimeUnixNano": _nanos(end),
        "attributes": [_attr(k, v) for k, v in attributes.items()],
        "status": {"code": 1 if ok else 2},
    }


def export(spans: list[dict[str, Any]], cwd: Path | None = None) -> None:
    body = {
        "resourceSpans": [
            {
                "resource": {"attributes": [_attr("service.name", "duly-factory")]},
                "scopeSpans": [{"scope": {"name": "tools.factory"}, "spans": spans}],
            }
        ]
    }
    folder = state_dir(cwd) / "otel"
    folder.mkdir(exist_ok=True)
    with (folder / "traces.jsonl").open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(body) + "\n")
    endpoint = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "").rstrip("/")
    if not endpoint.startswith(("http://localhost", "http://127.0.0.1")):
        return  # only a collector on this machine; traces hold prompts and paths
    request = urllib.request.Request(  # noqa: S310
        endpoint + "/v1/traces",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        urllib.request.urlopen(request, timeout=3)  # noqa: S310
    except OSError:
        return
