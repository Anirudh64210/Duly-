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

    python_report = root / "coverage.xml"
    if not python_report.exists():
        print("diff coverage: coverage.xml is missing. Run gate 5 first.")
        return 1
    web_reports = [p for p in (_repo_relative_lcov(root, app) for app in ("web", "ops")) if p]
    if len(web_reports) < 2:
        print("diff coverage: a web or ops coverage report is missing. Run gate 5 first.")
        return 1

    # diff-cover cannot mix report formats in one run, so each format gets its own.
    runs = [
        [str(python_report), f"--fail-under={OVERALL}"],
        [*(str(p) for p in web_reports), f"--fail-under={OVERALL}"],
        [str(python_report), f"--fail-under={ENGINE}", "--include", "engine/*"],
    ]
    failed = False
    for extra in runs:
        done = subprocess.run(
            ["diff-cover", *extra, f"--compare-branch={args.base}"], cwd=root, check=False
        )
        if done.returncode == 1:
            failed = True
        elif done.returncode:
            print("diff coverage: the coverage tool itself failed")
            return 2
    if failed:
        print("diff coverage: below the floor")
        return 1
    print("diff coverage: clean")
    return 0


if __name__ == "__main__":
    sys.exit(main())
