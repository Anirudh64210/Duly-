"""Agents run on the founder's subscription login, and on nothing else.

Usage credits are charged only when an API key, an auth token or a cloud provider's
credentials are in use. This module is the guard against that:

- nothing starts unless the Claude login on this machine is a subscription login
- no key, token or provider setting is ever handed to an agent's process
- the project's settings may not name a key or a helper that fetches one
- a run that reports a key in use is ended at once

One thing cannot be seen from here: whether the subscription itself allows paid extra
usage once its limits are reached. That is a setting on claude.ai, under Settings, Usage.
"""

import json
import subprocess
from pathlib import Path
from typing import Any


class BillingError(RuntimeError):
    pass


# Any of these in an agent's environment could route its work to paid credits.
PAID_ROUTES = (
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_AUTH_TOKEN",
    "ANTHROPIC_BASE_URL",
    "ANTHROPIC_BEDROCK_BASE_URL",
    "ANTHROPIC_VERTEX_BASE_URL",
    "ANTHROPIC_VERTEX_PROJECT_ID",
    "CLAUDE_CODE_USE_BEDROCK",
    "CLAUDE_CODE_USE_VERTEX",
    "CLAUDE_CODE_USE_FOUNDRY",
    "AWS_BEARER_TOKEN_BEDROCK",
)
PAID_SETTINGS = ("apiKeyHelper", "awsAuthRefresh", "awsCredentialExport")


def auth_status() -> str:
    done = subprocess.run(
        ["claude", "auth", "status"], check=False, capture_output=True, text=True, timeout=30
    )
    return done.stdout


def login(auth_json: str | None = None) -> dict[str, Any]:
    try:
        found: dict[str, Any] = json.loads(auth_status() if auth_json is None else auth_json)
    except (json.JSONDecodeError, OSError, subprocess.TimeoutExpired):
        return {}
    return found


def require_subscription(auth_json: str | None = None) -> str:
    """The plan in use. Raises unless it is a subscription login."""
    found = login(auth_json)
    if not found.get("loggedIn"):
        raise BillingError("Claude is not logged in on this machine. Run: claude auth login")
    if found.get("authMethod") != "claude.ai":
        raise BillingError(
            f"Claude is logged in by {found.get('authMethod') or 'an unknown method'}, which "
            "is charged per use. The factory runs on a subscription login only."
        )
    return str(found.get("subscriptionType") or "subscription")


def strip_paid_routes(environ: dict[str, str]) -> dict[str, str]:
    return {k: v for k, v in environ.items() if k not in PAID_ROUTES}


def settings_problems(root: Path) -> list[str]:
    """Anything in the project's settings that could bring a key into a run."""
    found: list[str] = []
    for name in ("settings.json", "settings.local.json"):
        path = root / ".claude" / name
        if not path.exists():
            continue
        try:
            data = json.loads(path.read_text())
        except json.JSONDecodeError:
            found.append(f".claude/{name} is not readable")
            continue
        found += [f".claude/{name} sets {key}" for key in PAID_SETTINGS if key in data]
        found += [
            f".claude/{name} sets {key} in env"
            for key in (data.get("env") or {})
            if key in PAID_ROUTES
        ]
    return found


def key_in_use(init_event: dict[str, Any]) -> str:
    """The source of the key a run reports, or an empty string when it reports none."""
    source = str(init_event.get("apiKeySource") or "").strip()
    return "" if source.lower() in {"", "none"} else source
