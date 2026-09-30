"""Make the engine samples in web/samples from the engine itself.

Each `<name>.json` is `engine.path.compute` run on `<name>.case.json` with the rule packs on
this branch and a FixedClock at 16:00 UTC on the day below. `make samples` runs this, and
`make design-shots` runs `make samples` first, so the samples the shots and the web tests read
are always the engine's own output.

    uv run python web/samples/make.py           write every sample
    uv run python web/samples/make.py --check   exit 1 if a sample differs from the engine
"""

from __future__ import annotations

import json
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent))

from engine import path  # noqa: E402
from engine.clocks import FixedClock  # noqa: E402
from engine.rulepack import load_all  # noqa: E402

DAYS = {
    "path-stem-next": "2026-09-29",
    "path-window-open": "2026-12-01",
}


def render(name: str, day: str) -> str:
    case: dict[str, Any] = json.loads((HERE / f"{name}.case.json").read_text())
    clock = FixedClock(datetime.fromisoformat(f"{day}T16:00:00").replace(tzinfo=UTC))
    out = path.compute(case, load_all(), clock)
    return json.dumps(out, indent=2, ensure_ascii=False, sort_keys=True) + "\n"


def main(argv: list[str]) -> int:
    check = "--check" in argv
    stale: list[str] = []
    for name, day in DAYS.items():
        target = HERE / f"{name}.json"
        text = render(name, day)
        if check:
            if not target.exists() or json.loads(target.read_text()) != json.loads(text):
                stale.append(name)
        else:
            target.write_text(text)
    for name in stale:
        print(f"web/samples/{name}.json differs from the engine's output", file=sys.stderr)
    return 1 if stale else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
