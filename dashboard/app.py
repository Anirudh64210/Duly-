# /// script
# requires-python = ">=3.12"
# dependencies = ["pywebview>=5.3"]
# ///
"""Factory: a native window that shows what the agents are doing.

No server and no port. The page asks this process for data through the
window's own bridge.

Run:  make watch        (or: uv run --script dashboard/app.py [repo])
"""

import sys
from pathlib import Path
from typing import Any

import webview

try:
    from dashboard import factory_data as data
except ImportError:  # run as a script
    import factory_data as data  # type: ignore[no-redef]

HERE = Path(__file__).resolve().parent


class Bridge:
    def __init__(self, repo: Path) -> None:
        self._repo = repo

    def snapshot(self) -> dict[str, Any]:
        return data.snapshot_json(self._repo)

    def agent(self, lane: str) -> dict[str, Any]:
        return data.agent_json(self._repo, str(lane))


def find_repo(start: Path) -> Path:
    for folder in (start, *start.parents):
        if (folder / ".factory").is_dir():
            return folder
    return start


def main() -> None:
    start = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else HERE.parent
    webview.create_window(
        "Factory",
        url=str(HERE / "ui.html"),
        js_api=Bridge(find_repo(start)),
        width=1280,
        height=860,
        min_size=(900, 600),
    )
    webview.start()


if __name__ == "__main__":
    main()
