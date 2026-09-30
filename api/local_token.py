"""The desktop app's launch token. Only the app that started the api may call it."""

import hmac
import os

TOKEN_ENV = "DULY_LOCAL_TOKEN"  # noqa: S105 (the name of the variable, not its value)
TOKEN_HEADER = "X-Duly-Local"  # noqa: S105 (the name of the header)
OPEN_PATHS = frozenset({"/health"})
NOT_FROM_THE_APP = "This request did not come from the Duly app on this Mac."


def expected_token() -> str | None:
    """Read at each request, so the value the process was started with is the one used."""
    return os.environ.get(TOKEN_ENV)


def request_allowed(path: str, sent: str | None, expected: str | None) -> bool:
    if expected is None or path in OPEN_PATHS:
        return True
    if sent is None:
        return False
    # Constant time, on bytes, so a header outside ASCII is refused and not an error.
    return hmac.compare_digest(sent.encode("utf-8"), expected.encode("utf-8"))
