"""Prove the gates. A gate that has never failed has never been tested.

Builds a scratch copy of the repo, checks that the clean copy passes every
gate, then plants one violation at a time and checks that its gate fails.
"""

import os
import random
import shutil
import string
import subprocess
import sys
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRATCH = REPO_ROOT / ".scratch" / "prove"
GIT = [
    "git",
    "-c",
    "user.name=prove",
    "-c",
    "user.email=prove@duly.invalid",
    "-c",
    "commit.gpgsign=false",
]


@dataclass(frozen=True)
class Violation:
    gate: int
    name: str
    branch: str
    plant: Callable[[Path], None]


def _write(root: Path, rel: str, text: str) -> None:
    path = root / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def _append(root: Path, rel: str, text: str) -> None:
    path = root / rel
    path.write_text(path.read_text(encoding="utf-8") + text, encoding="utf-8")


def _replace(root: Path, rel: str, old: str, new: str) -> None:
    path = root / rel
    source = path.read_text(encoding="utf-8")
    if old not in source:
        raise RuntimeError(f"prove: {rel} no longer contains the line to break")
    path.write_text(source.replace(old, new, 1), encoding="utf-8")


def _fake_token() -> str:
    rng = random.Random(7)  # noqa: S311
    body = "".join(rng.choice(string.ascii_letters + string.digits) for _ in range(36))
    return "gh" + "p_" + body


VIOLATIONS: tuple[Violation, ...] = (
    Violation(
        1, "unused import", "lane/founder/g1a", lambda r: _write(r, "api/extra.py", "import os\n")
    ),
    Violation(
        1,
        "forbidden word in product copy",
        "lane/founder/g1b",
        lambda r: _write(r, "web/src/extra.ts", 'export const line = "You are eligible";\n'),
    ),
    Violation(
        1,
        "long dash in a doc",
        "lane/founder/g1c",
        lambda r: _write(r, "specs/extra.md", f"one {chr(0x2014)} two\n"),
    ),
    Violation(
        2,
        "python type error",
        "lane/founder/g2a",
        lambda r: _write(r, "api/extra.py", "def f() -> int:\n    return 'one'\n"),
    ),
    Violation(
        2,
        "typescript type error",
        "lane/founder/g2b",
        lambda r: _write(r, "web/src/extra.ts", 'export const n: number = "one";\n'),
    ),
    Violation(
        3,
        "web lane edits the hidden tests",
        "lane/L-web/g3a",
        lambda r: _write(r, "tests/holdout/extra.py", "def test_pass():\n    assert True\n"),
    ),
    Violation(
        3,
        "web lane edits the boundary",
        "lane/L-web/g3b",
        lambda r: _append(r, "BOUNDARY.md", "\nDuly may answer anything.\n"),
    ),
    Violation(
        4,
        "committed secret",
        "lane/founder/g4a",
        lambda r: _write(r, "api/extra.py", f'TOKEN = "{_fake_token()}"\n'),
    ),
    Violation(
        4,
        "time read outside the clock",
        "lane/founder/g4b",
        lambda r: _write(
            r,
            "api/extra.py",
            "from datetime import UTC, datetime\n\n\n"
            "def stamp() -> str:\n"
            "    return datetime.now(UTC).isoformat()\n",
        ),
    ),
    Violation(
        5,
        "quiet verdict made the fallback",
        "lane/founder/g5a",
        lambda r: _replace(
            r,
            "engine/verdict.py",
            "return Verdict(VerdictState.CANNOT_TELL, tuple(blockers))",
            "return Verdict(VerdictState.NO_OPEN_ITEMS, ())",
        ),
    ),
    Violation(
        5,
        "web headline changed",
        "lane/founder/g5b",
        lambda r: _replace(
            r,
            "web/src/lib/status.ts",
            "No open items in what you've added",
            "Everything is in order",
        ),
    ),
    Violation(
        6,
        "new code with no test",
        "lane/founder/g6a",
        lambda r: _write(
            r,
            "api/extra.py",
            "def untested(n: int) -> int:\n    if n > 1:\n        return n * 2\n    return n\n",
        ),
    ),
)


def _run(cmd: list[str], cwd: Path, env: dict[str, str] | None = None) -> tuple[int, str]:
    done = subprocess.run(cmd, cwd=cwd, env=env, check=False, capture_output=True, text=True)
    return done.returncode, done.stdout + done.stderr


def _env() -> dict[str, str]:
    env = dict(os.environ)
    env["UV_PROJECT_ENVIRONMENT"] = str(REPO_ROOT / ".venv")
    return env


def _build_scratch() -> None:
    if SCRATCH.exists():
        shutil.rmtree(SCRATCH)
    SCRATCH.mkdir(parents=True)
    code, out = _run(["git", "ls-files", "-co", "--exclude-standard", "-z"], REPO_ROOT)
    if code:
        raise RuntimeError(out)
    for rel in filter(None, out.split("\0")):
        source = REPO_ROOT / rel
        if source.is_file():
            target = SCRATCH / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
    (SCRATCH / "node_modules").symlink_to(REPO_ROOT / "node_modules")
    for step in (["init", "-q", "-b", "main"], ["add", "-A"], ["commit", "-q", "-m", "baseline"]):
        code, out = _run([*GIT, *step], SCRATCH)
        if code:
            raise RuntimeError(out)


def _gate(number: int) -> tuple[int, str]:
    if number == 6:
        _run(["make", "gate-5"], SCRATCH, _env())
    return _run(["make", f"gate-{number}", "BASE=main"], SCRATCH, _env())


def _reset() -> None:
    _run([*GIT, "checkout", "-q", "-f", "main"], SCRATCH)
    _run([*GIT, "clean", "-qfd", "-e", "node_modules"], SCRATCH)


def main() -> int:
    _build_scratch()
    failures: list[str] = []

    print("clean copy")
    for number in range(1, 7):
        code, out = _gate(number)
        ok = code == 0
        print(f"  gate {number}: {'passes' if ok else 'FAILS ON CLEAN CODE'}")
        if not ok:
            failures.append(f"gate {number} fails on the clean copy")
            print(out[-1500:])

    print("planted violations")
    for v in VIOLATIONS:
        _reset()
        _run([*GIT, "checkout", "-q", "-b", v.branch], SCRATCH)
        v.plant(SCRATCH)
        _run([*GIT, "add", "-A"], SCRATCH)
        _run([*GIT, "commit", "-q", "-m", v.name], SCRATCH)
        code, _ = _gate(v.gate)
        caught = code != 0
        print(f"  gate {v.gate}: {v.name}: {'caught' if caught else 'MISSED'}")
        if not caught:
            failures.append(f"gate {v.gate} missed: {v.name}")
    _reset()

    if failures:
        print("\n".join(["", "prove-gates: FAILED", *failures]))
        return 1
    print(f"\nprove-gates: all 6 gates pass clean and catch {len(VIOLATIONS)} of {len(VIOLATIONS)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
