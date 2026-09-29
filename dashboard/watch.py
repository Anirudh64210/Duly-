# /// script
# requires-python = ">=3.12"
# dependencies = ["textual>=0.80"]
# ///
"""Factory watch: a terminal dashboard for the agents.

Run:  make watch        (or: uv run --script dashboard/watch.py [repo])
Keys: arrows to move, enter to open an agent, escape to go back, q to quit.
"""

import sys
from datetime import UTC, datetime
from pathlib import Path

from rich.text import Text
from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.screen import Screen
from textual.widgets import DataTable, Footer, RichLog, Static, TabbedContent, TabPane

try:
    from dashboard import factory_data as data
except ImportError:  # run as a script
    import factory_data as data  # type: ignore[no-redef]

STATE_STYLE = {
    "working": "bold #2b4ea2",
    "done": "#1b7a57",
    "failed": "#a1271e",
    "blocked": "#a1271e",
    "stopped": "#b45309",
    "idle": "dim",
}
LINE_STYLE = {
    "say": "",
    "tool": "bold #2b4ea2",
    "result": "dim",
    "error": "#a1271e",
    "prompt": "#b45309",
}
COLUMNS = (
    "Lane",
    "Agent",
    "State",
    "Time",
    "Round",
    "Actions",
    "Tests",
    "Commits",
    "Files",
    "Lessons",
    "Tokens",
    "Doing now",
)


def now() -> datetime:
    return datetime.now(UTC)


def clock(at: datetime | None) -> str:
    return at.astimezone().strftime("%H:%M:%S") if at else "        "


class AgentScreen(Screen[None]):
    BINDINGS = [
        Binding("escape", "app.pop_screen", "Back"),
        Binding("f", "toggle_follow", "Follow on/off"),
        Binding("1", "tab('tab-trace')", "Trace"),
        Binding("2", "tab('tab-activity')", "Activity"),
        Binding("3", "tab('tab-progress')", "Progress log"),
        Binding("4", "tab('tab-changes')", "Changes"),
    ]

    def __init__(self, repo: Path, lane: str) -> None:
        super().__init__()
        self.repo, self.lane = repo, lane
        self.follow = True
        self.sizes: dict[str, int] = {}

    def compose(self) -> ComposeResult:
        yield Static(id="agent-head")
        with TabbedContent():
            with TabPane("Trace", id="tab-trace"):
                yield RichLog(id="trace", wrap=True, markup=False, highlight=False)
            with TabPane("Activity", id="tab-activity"):
                yield RichLog(id="activity", wrap=True, markup=False, highlight=False)
            with TabPane("Progress log", id="tab-progress"):
                yield RichLog(id="progress", wrap=True, markup=False, highlight=False)
            with TabPane("Changes", id="tab-changes"):
                yield RichLog(id="changes", wrap=False, markup=False, highlight=False)
        yield Footer()

    def on_mount(self) -> None:
        self.reload()
        self.set_interval(2, self.reload)

    def action_tab(self, name: str) -> None:
        self.query_one(TabbedContent).active = name

    def action_toggle_follow(self) -> None:
        self.follow = not self.follow
        self.reload()

    def reload(self) -> None:
        self.run_worker(self._load, thread=True, exclusive=True, group="agent")

    def _load(self) -> None:
        snapshot = data.load(self.repo, with_tokens=False)
        agent = next((a for a in snapshot.agents if a.lane == self.lane), None)
        if agent is None:
            return
        files = data.session_files(agent.worktree, agent.started_at) if agent.worktree else []
        lines, tokens_in, tokens_out = data.transcript(files)
        agent.tokens_in, agent.tokens_out = tokens_in, tokens_out
        events = [e for e in data.read_events(self.repo) if e.get("lane") == self.lane]
        progress = data.progress_text(agent.worktree) if agent.worktree else ""
        diff = data.changes(self.repo, agent)
        self.app.call_from_thread(self._show, agent, lines, events, progress, diff)

    def _fill(self, name: str, rows: list[Text]) -> None:
        if self.sizes.get(name) == len(rows) and name != "changes":
            return
        self.sizes[name] = len(rows)
        log = self.query_one(f"#{name}", RichLog)
        log.auto_scroll = self.follow
        log.clear()
        for row in rows:
            log.write(row)

    def _show(
        self,
        agent: data.Agent,
        lines: list[data.Line],
        events: list[dict],
        progress: str,
        diff: str,
    ) -> None:
        end = agent.ended_at or now()
        head = Text()
        head.append(f" {agent.lane} ", style="bold reverse")
        head.append(f"  {agent.agent}  ")
        head.append(agent.state, style=STATE_STYLE.get(agent.state, ""))
        head.append(f"   {data.span(agent.started_at, end)}   round {agent.iteration or '-'}")
        head.append(f"   {agent.actions} actions   {agent.commits} commits   ")
        head.append(
            f"{data.short_count(agent.tokens_in)} tokens read, "
            f"{data.short_count(agent.tokens_out)} written"
        )
        head.append(f"   follow {'on' if self.follow else 'off'}\n", style="dim")
        head.append(" " + agent.mission[:300], style="dim")
        self.query_one("#agent-head", Static).update(head)

        trace = []
        for line in lines[-600:]:
            row = Text()
            row.append(clock(line.at) + "  ", style="dim")
            row.append(f"{line.kind:<7}", style="dim")
            row.append(line.text, style=LINE_STYLE.get(line.kind, ""))
            trace.append(row)
        self._fill("trace", trace or [Text("No session log found for this agent yet.")])

        activity = []
        for event in events[-600:]:
            row = Text()
            row.append(clock(data.parse_time(event.get("at", ""))) + "  ", style="dim")
            row.append(
                f"{event.get('kind', ''):<8}", style=STATE_STYLE.get(event.get("kind", ""), "dim")
            )
            row.append(event.get("message", ""))
            activity.append(row)
        self._fill("activity", activity)
        self._fill(
            "progress",
            [Text(line) for line in progress.splitlines()]
            or [Text("This agent has not written a progress log yet.")],
        )
        self._fill("changes", [Text(line) for line in diff.splitlines()])


class Watch(App[None]):
    TITLE = "Factory watch"
    CSS = """
    #summary { padding: 1 2 0 2; height: auto; }
    #agents { margin: 1 1 0 1; height: 1fr; }
    #learning { padding: 0 2; height: auto; }
    #orchestrator { margin: 0 1; height: 9; border-top: solid $panel; }
    #agent-head { padding: 1 1; height: auto; }
    """
    BINDINGS = [Binding("q", "quit", "Quit"), Binding("enter", "open", "Open agent")]

    def __init__(self, repo: Path) -> None:
        super().__init__()
        self.repo = repo
        self.seen_events = -1

    def compose(self) -> ComposeResult:
        yield Static(id="summary")
        yield DataTable(id="agents", cursor_type="row", zebra_stripes=True)
        yield Static(id="learning")
        yield RichLog(id="orchestrator", wrap=True, markup=False, highlight=False)
        yield Footer()

    def on_mount(self) -> None:
        self.query_one("#agents", DataTable).add_columns(*COLUMNS)
        self.reload()
        self.set_interval(2, self.reload)

    def reload(self) -> None:
        self.run_worker(self._load, thread=True, exclusive=True, group="main")

    def _load(self) -> None:
        snapshot = data.load(self.repo)
        self.call_from_thread(self._show, snapshot)

    def _show(self, snap: data.Snapshot) -> None:
        running = [a for a in snap.agents if a.alive]
        first = min((a.started_at for a in snap.agents if a.started_at), default=None)
        summary = Text()
        summary.append(f"{len(running)} running", style="bold #2b4ea2" if running else "bold")
        summary.append(f"   {len(snap.agents)} lanes used   ")
        summary.append(f"{sum(a.actions for a in snap.agents)} actions   ")
        summary.append(f"{data.short_count(sum(a.tokens_in for a in snap.agents))} tokens read, ")
        summary.append(f"{data.short_count(sum(a.tokens_out for a in snap.agents))} written   ")
        summary.append(f"since first start {data.span(first, now())}\n")
        summary.append(snap.round_line or "No round has started.", style="dim")
        summary.append(f"    {snap.head}", style="dim")
        self.query_one("#summary", Static).update(summary)

        table = self.query_one("#agents", DataTable)
        at = table.cursor_row
        table.clear()
        for a in snap.agents:
            end = a.ended_at or (now() if a.alive else a.last_at)
            table.add_row(
                a.lane,
                a.agent,
                Text(a.state, style=STATE_STYLE.get(a.state, "")),
                data.span(a.started_at, end),
                a.iteration or "-",
                str(a.actions),
                str(a.tests_run),
                str(a.commits),
                f"{a.files_changed}+{a.uncommitted}",
                str(a.lessons),
                data.short_count(a.tokens_in + a.tokens_out),
                a.last_action[:90],
                key=a.lane,
            )
        if snap.agents:
            table.move_cursor(row=min(at, len(snap.agents) - 1))

        learning = Text()
        learning.append("Learning  ", style="bold")
        learning.append(f"{sum(a.lessons for a in snap.agents)} lessons written by agents   ")
        learning.append(f"{snap.proposals} waiting for review   ")
        learning.append(f"{snap.skills} skills, {snap.skills_replayed} proven by replay")
        if snap.gates:
            learning.append("\nChecks    ", style="bold")
            for name, result in snap.gates.items():
                learning.append(f"{name}: ")
                learning.append(
                    result + "   ", style=STATE_STYLE["done" if result == "pass" else "failed"]
                )
        self.query_one("#learning", Static).update(learning)

        if len(snap.orchestrator) != self.seen_events:
            self.seen_events = len(snap.orchestrator)
            log = self.query_one("#orchestrator", RichLog)
            log.clear()
            for event in snap.orchestrator[-40:]:
                row = Text()
                row.append(clock(data.parse_time(event.get("at", ""))) + "  ", style="dim")
                row.append(
                    event.get("message", ""), style=STATE_STYLE.get(event.get("kind", ""), "")
                )
                log.write(row)

    def on_data_table_row_selected(self, event: DataTable.RowSelected) -> None:
        if event.row_key.value:
            self.push_screen(AgentScreen(self.repo, event.row_key.value))

    def action_open(self) -> None:
        table = self.query_one("#agents", DataTable)
        if table.row_count:
            table.action_select_cursor()


def find_repo(start: Path) -> Path:
    for folder in (start, *start.parents):
        if (folder / ".factory").is_dir():
            return folder
    return start


def main() -> None:
    start = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd()
    Watch(find_repo(start)).run()


if __name__ == "__main__":
    main()
