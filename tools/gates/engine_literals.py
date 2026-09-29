"""No number in the engine's rule code may come from nowhere.

A number in engine/f1.py is either law, which lives in a rule pack with its
source and quote, or Duly's own choice, which lives in
contracts/product_settings.yaml. This check fails on any other number.

Allowed without a source: 0, 1 and -1, which are arithmetic, not rules.
"""

import ast
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CHECKED = ("engine/f1.py",)
ARITHMETIC = {0, 1, -1}


def findings(path: Path) -> list[str]:
    tree = ast.parse(path.read_text(encoding="utf-8"))
    docstrings = {
        id(node.body[0].value)
        for node in ast.walk(tree)
        if isinstance(node, ast.Module | ast.FunctionDef | ast.ClassDef | ast.AsyncFunctionDef)
        and node.body
        and isinstance(node.body[0], ast.Expr)
        and isinstance(node.body[0].value, ast.Constant)
    }
    found = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.Constant) or id(node) in docstrings:
            continue
        value = node.value
        if isinstance(value, bool) or not isinstance(value, int | float):
            continue
        if value in ARITHMETIC:
            continue
        found.append(f"{path.name}:{node.lineno}: the number {value} has no source")
    return found


def main() -> int:
    root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else REPO_ROOT
    problems = [p for rel in CHECKED if (root / rel).exists() for p in findings(root / rel)]
    for problem in problems:
        print(problem)
    if problems:
        print(
            f"engine literals: {len(problems)} number(s) with no source. "
            "Law goes in the rule pack. Duly's choices go in contracts/product_settings.yaml."
        )
        return 1
    print("engine literals: every number has a source")
    return 0


if __name__ == "__main__":
    sys.exit(main())
