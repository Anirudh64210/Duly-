"""Gate 6. Changed lines must be covered: 80 percent overall, 95 in the engine."""

import argparse
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
OVERALL = 80
ENGINE = 95


def _repo_relative_lcov(root: Path, app: str) -> Path | None:
    source = root / app / "coverage" / "lcov.info"
    if not source.exists():
        return None
    out = root / ".scratch" / "coverage" / f"{app}.lcov"
    out.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        f"SF:{app}/{line[3:]}"
        if line.startswith("SF:") and not line.startswith(f"SF:{app}/")
        else line
        for line in source.read_text().splitlines()
    ]
    out.write_text("\n".join(lines) + "\n")
    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="main")
    args = parser.parse_args()
    root = Path.cwd()

    reports = [root / "coverage.xml"]
    if not reports[0].exists():
        print("diff coverage: coverage.xml is missing. Run gate 5 first.")
        return 1
    reports += [p for p in (_repo_relative_lcov(root, app) for app in ("web", "ops")) if p]
    names = [str(p) for p in reports]

    overall = subprocess.run(
        ["diff-cover", *names, f"--compare-branch={args.base}", f"--fail-under={OVERALL}"],
        cwd=root,
        check=False,
    )
    engine = subprocess.run(
        [
            "diff-cover",
            names[0],
            f"--compare-branch={args.base}",
            f"--fail-under={ENGINE}",
            "--include",
            "engine/*",
        ],
        cwd=root,
        check=False,
    )
    if overall.returncode or engine.returncode:
        print("diff coverage: below the floor")
        return 1
    print("diff coverage: clean")
    return 0


if __name__ == "__main__":
    sys.exit(main())
