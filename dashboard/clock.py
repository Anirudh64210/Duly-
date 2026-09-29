"""The one place the dashboard reads the time.

The dashboard stands alone, with no import from the rest of the repository, so it cannot
use engine.clocks. Everything else in the dashboard is handed the time.
"""

from datetime import datetime


def now() -> datetime:
    return datetime.now().astimezone()
