"""Mutation check: would the tests notice if the code were wrong?

Makes one small change at a time to the engine (a comparison flipped, a plus made a
minus, an "and" made an "or", a number moved by one) and runs the engine's tests,
hidden ones included, against each. A change the tests do not notice is a survivor.
The score is the share of changes caught, and the floor is in factory/config.yaml.

Usage: make mutation [FILES="engine/verdict.py engine/dates.py"]
"""

import ast
import copy
import json
import shutil
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path

from engine.clocks import SystemClock
from tools.factory.config import load_config
from tools.factory.paths import REPO_ROOT, state_dir

COPIED = (
    "engine",
    "tests",
    "contracts",
    "rulepacks",
    "api",
    "tools",
    "assistant",
    "pipeline",
    "factory",
    ".claude",
    "pyproject.toml",
)
COMPARE = {
    ast.Lt: ast.LtE,
    ast.LtE: ast.Lt,
    ast.Gt: ast.GtE,
    ast.GtE: ast.Gt,
    ast.Eq: ast.NotEq,
    ast.NotEq: ast.Eq,
}
BINARY = {ast.Add: ast.Sub, ast.Sub: ast.Add}
BOOLEAN = {ast.And: ast.Or, ast.Or: ast.And}
WORKERS = 6


@dataclass(frozen=True)
class Mutant:
    file: str
    line: int
    what: str
    source: str


def mutants(path: Path, rel: str) -> list[Mutant]:
    tree = ast.parse(path.read_text(encoding="utf-8"))
    out: list[Mutant] = []
    docstrings = {
        id(n.body[0].value)
        for n in ast.walk(tree)
        if isinstance(n, ast.Module | ast.FunctionDef | ast.ClassDef)
        and n.body
        and isinstance(n.body[0], ast.Expr)
        and isinstance(n.body[0].value, ast.Constant)
    }
    targets = [
        n
        for n in ast.walk(tree)
        if isinstance(n, ast.Compare | ast.BinOp | ast.BoolOp | ast.Constant | ast.UnaryOp)
    ]
    for index, node in enumerate(targets):
        clone = copy.deepcopy(tree)
        twin = [
            n
            for n in ast.walk(clone)
            if isinstance(n, ast.Compare | ast.BinOp | ast.BoolOp | ast.Constant | ast.UnaryOp)
        ][index]
        what = ""
        if isinstance(twin, ast.Compare) and type(twin.ops[0]) in COMPARE:
            new = COMPARE[type(twin.ops[0])]
            what = f"{type(twin.ops[0]).__name__} to {new.__name__}"
            twin.ops[0] = new()
        elif isinstance(twin, ast.BinOp) and type(twin.op) in BINARY:
            new_op = BINARY[type(twin.op)]
            what = f"{type(twin.op).__name__} to {new_op.__name__}"
            twin.op = new_op()
        elif isinstance(twin, ast.BoolOp) and type(twin.op) in BOOLEAN:
            new_bool = BOOLEAN[type(twin.op)]
            what = f"{type(twin.op).__name__} to {new_bool.__name__}"
            twin.op = new_bool()
        elif isinstance(twin, ast.UnaryOp) and isinstance(twin.op, ast.Not):
            what = "not removed"
            twin.op = ast.UAdd()
            twin.operand = ast.Call(ast.Name("bool", ast.Load()), [twin.operand], [])
        elif (
            isinstance(twin, ast.Constant)
            and isinstance(twin.value, int)
            and not isinstance(twin.value, bool)
            and id(node) not in docstrings
        ):
            what = f"{twin.value} to {twin.value + 1}"
            twin.value += 1
        if what:
            ast.fix_missing_locations(clone)
            out.append(Mutant(rel, getattr(node, "lineno", 0), what, ast.unparse(clone)))
    return out


def _copy(root: Path, to: Path) -> None:
    for name in COPIED:
        source = root / name
        if source.is_dir():
            shutil.copytree(source, to / name, ignore=shutil.ignore_patterns("__pycache__"))
        elif source.exists():
            shutil.copy2(source, to / name)


def _tests(where: Path) -> bool:
    done = subprocess.run(
        [
            sys.executable,
            "-m",
            "pytest",
            "tests/unit/engine",
            "tests/holdout",
            "-x",
            "-q",
            "-p",
            "no:cacheprovider",
            "--no-header",
            "-o",
            "addopts=",
        ],
        cwd=where,
        check=False,
        capture_output=True,
        text=True,
        timeout=300,
        env={
            "PATH": "/usr/bin:/bin",
            "PYTHONPATH": str(where),
            "PYTHONDONTWRITEBYTECODE": "1",
            "HYPOTHESIS_MAX_EXAMPLES": "25",
        },
    )
    return done.returncode == 0


def run(files: list[str], root: Path = REPO_ROOT) -> dict[str, object]:
    todo = [m for rel in files for m in mutants(root / rel, rel)]
    base = Path(tempfile.mkdtemp(prefix="duly-mutation-"))
    try:
        copies = []
        for n in range(WORKERS):
            copies.append(base / str(n))
            copies[-1].mkdir()
            _copy(root, copies[-1])
        if not _tests(copies[0]):
            return {"error": "the tests fail before any change is made"}

        def check(job: tuple[int, Mutant]) -> Mutant | None:
            index, mutant = job
            where = copies[index % WORKERS]
            target = where / mutant.file
            original = (root / mutant.file).read_text(encoding="utf-8")
            target.write_text(mutant.source, encoding="utf-8")
            try:
                return mutant if _tests(where) else None
            except subprocess.TimeoutExpired:
                return None  # a change that hangs the tests is caught
            finally:
                target.write_text(original, encoding="utf-8")

        survivors: list[Mutant] = []
        # Each worker owns one copy, so jobs are dealt out in lanes of their own.
        lanes: list[list[tuple[int, Mutant]]] = [[] for _ in range(WORKERS)]
        for index, mutant in enumerate(todo):
            lanes[index % WORKERS].append((index, mutant))
        with ThreadPoolExecutor(max_workers=WORKERS) as pool:
            for found in pool.map(lambda lane: [check(job) for job in lane], lanes):
                survivors += [m for m in found if m is not None]
    finally:
        shutil.rmtree(base, ignore_errors=True)
    caught = len(todo) - len(survivors)
    return {
        "files": files,
        "changes": len(todo),
        "caught": caught,
        "score": round(caught / len(todo), 3) if todo else 1.0,
        "survivors": [
            {"file": m.file, "line": m.line, "what": m.what}
            for m in sorted(survivors, key=lambda m: (m.file, m.line))
        ],
    }


def main() -> int:
    files = sys.argv[1:] or [
        "engine/verdict.py",
        "engine/dates.py",
        "engine/f1.py",
        "engine/rulepack.py",
        "engine/settings.py",
    ]
    result = run([f for f in files if (REPO_ROOT / f).exists()])
    if "error" in result:
        print(f"mutation: {result['error']}")
        return 1
    floor = float(load_config()["gates"]["mutation_score_min"])
    result["at"] = SystemClock().now().isoformat(timespec="seconds")
    result["floor"] = floor
    with (state_dir() / "mutation.jsonl").open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(result) + "\n")
    for s in result["survivors"]:  # type: ignore[attr-defined]
        print(f"survived  {s['file']}:{s['line']}  {s['what']}")
    print(
        f"mutation: {result['caught']} of {result['changes']} changes caught, "
        f"score {result['score']}, floor {floor}"
    )
    return 0 if float(result["score"]) >= floor else 1  # type: ignore[arg-type]


if __name__ == "__main__":
    sys.exit(main())
