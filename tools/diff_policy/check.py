"""Diff policy. A lane may only change the paths it owns.

Implementation lanes can never own the paths that grade them.
"""

import argparse
import subprocess
import sys
from dataclasses import dataclass
from fnmatch import fnmatch
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]

PROTECTED: tuple[str, ...] = (
    "tests/**",
    "evals/**",
    "security/**",
    ".claude/**",
    ".github/**",
    "tools/gates/**",
    "tools/copy_lint/**",
    "tools/diff_policy/**",
    "contracts/**",
    "BOUNDARY.md",
    "DECISIONS.md",
    "CLAUDE.md",
    "Makefile",
    "pyproject.toml",
)


class LaneError(ValueError):
    pass


@dataclass(frozen=True)
class Lane:
    name: str
    kind: str
    owned: tuple[str, ...]
    test: str


def matches(path: str, pattern: str) -> bool:
    if pattern.endswith("/**"):
        return path.startswith(pattern[:-2])
    return fnmatch(path, pattern)


def load_lane(name: str, root: Path = REPO_ROOT) -> Lane:
    path = root / ".claude" / "lanes" / f"{name}.yaml"
    if not path.exists():
        raise LaneError(f"unknown lane {name}")
    raw = yaml.safe_load(path.read_text())
    lane = Lane(
        name=raw["name"], kind=raw["kind"], owned=tuple(raw["owned"]), test=raw.get("test", "")
    )
    if lane.kind not in {"implementation", "guard", "founder"}:
        raise LaneError(f"{name}: unknown kind {lane.kind}")
    if lane.kind == "implementation":
        for pattern in lane.owned:
            probe = pattern[:-3] + "/x" if pattern.endswith("/**") else pattern
            if pattern in {"**", "*"} or any(matches(probe, p) for p in PROTECTED):
                raise LaneError(f"{name}: an implementation lane cannot own {pattern}")
    return lane


def violations(lane: Lane, changed: list[str]) -> list[str]:
    out: list[str] = []
    for path in changed:
        if lane.kind == "founder":
            continue
        if not any(matches(path, p) for p in lane.owned):
            out.append(path)
    return out


def changed_files(base: str, root: Path = REPO_ROOT) -> list[str]:
    diff = subprocess.run(
        ["git", "diff", "--name-only", f"{base}...HEAD"],
        cwd=root,
        check=True,
        capture_output=True,
        text=True,
    ).stdout.splitlines()
    return sorted({line.strip() for line in diff if line.strip()})


def lane_from_branch(root: Path = REPO_ROOT) -> str:
    branch = subprocess.run(
        ["git", "rev-parse", "--abbrev-ref", "HEAD"],
        cwd=root,
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()
    parts = branch.split("/")
    if len(parts) >= 2 and parts[0] == "lane":
        return parts[1]
    return "founder"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lane", default="")
    parser.add_argument("--base", default="main")
    parser.add_argument("--root", default=str(REPO_ROOT))
    parser.add_argument("--files", nargs="*")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    name = args.lane or lane_from_branch(root)
    try:
        lane = load_lane(name, root)
    except LaneError as err:
        print(f"diff policy: {err}")
        return 1
    files = args.files if args.files is not None else changed_files(args.base, root)
    bad = violations(lane, files)
    for path in bad:
        print(f"diff policy: lane {lane.name} may not change {path}")
    if bad:
        return 1
    print(f"diff policy: lane {lane.name}, {len(files)} file(s), clean")
    return 0


if __name__ == "__main__":
    sys.exit(main())
