"""Append one line to the factory ledger from the command line.

Usage: uv run python -m tools.factory.log --lane L-engine --agent builder --kind step "what I did"
"""

import argparse
import sys
from pathlib import Path

from tools.factory import ledger
from tools.factory.paths import state_dir


def factory_dir(cwd: Path | None = None) -> Path:
    return state_dir(cwd)


def append(lane: str, agent: str, kind: str, message: str, cwd: Path | None = None) -> None:
    ledger.append(lane, agent, kind, message, cwd)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lane", required=True)
    parser.add_argument("--agent", required=True)
    parser.add_argument("--kind", choices=ledger.KINDS, default="step")
    parser.add_argument("message")
    args = parser.parse_args()
    append(args.lane, args.agent, args.kind, args.message)
    return 0


if __name__ == "__main__":
    sys.exit(main())
