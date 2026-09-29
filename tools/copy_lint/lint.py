"""Copy linter. Two scopes.

Everywhere we write: no long dashes, no emoji.
Product copy (what a user can read): no word from the forbidden list.

The list only grows or shrinks by founder decision.
"""

import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

SKIP_DIRS = {
    ".git",
    ".venv",
    "node_modules",
    "dist",
    ".scratch",
    ".mypy_cache",
    ".ruff_cache",
    ".pytest_cache",
    "htmlcov",
    "__pycache__",
    ".hypothesis",
}
# Raw research quotes its sources as written; the prototype is a design artifact.
SKIP_PREFIXES = ("docs/research/", "workbook-handoff/prototype/", "design/canvas/")
SKIP_FILES = {"uv.lock", "package-lock.json"}
TEXT_SUFFIXES = {
    ".py",
    ".md",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".css",
    ".html",
    ".json",
    ".yaml",
    ".yml",
    ".toml",
    ".sh",
    ".txt",
    ".mjml",
    ".conf",
    "",
}

PRODUCT_PREFIXES = (
    "web/src/",
    "ops/src/",
    "web/index.html",
    "ops/index.html",
    "emails/",
    "desktop/",
    "assistant/prompts/",
)

DASHES = re.compile(r"[\u2012-\u2015]")
EMOJI = re.compile(r"[\U0001F000-\U0001FAFF\u2600-\u27BF\uFE0F]")

FORBIDDEN_PHRASES: tuple[str, ...] = (
    # handoff rule 10
    "sealed",
    "cryptographic",
    "ai-generated",
    "ai generated",
    # legal conclusions
    "eligible",
    "ineligible",
    "eligibility",
    "compliant",
    "compliance",
    "qualifies",
    "qualify",
    "qualified",
    "in status",
    "out of status",
    # reassurance and urgency
    "worry",
    "you're fine",
    "you are fine",
    "plenty of time",
    "hurry",
    "act now",
    "urgent",
    "don't miss",
    "last chance",
    # what Duly never calls itself or promises
    "ai lawyer",
    "robot lawyer",
    "lawyer-quality",
    "lawyer quality",
    "like a lawyer",
    "immigration consultant",
    "paralegal",
    "notario",
    "guarantee",
    "guaranteed",
    "never miss",
    "protects your status",
    "keeps you in status",
    "prevents",
    # privacy claims that must be scoped
    "never leaves",
    "never leave",
    # quality adjectives
    "successfully",
    "critical",
    "significant",
    "seamless",
    "powerful",
)
_WORDS = re.compile(
    r"(?<![\w-])(" + "|".join(re.escape(p) for p in FORBIDDEN_PHRASES) + r")(?![\w-])",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class Finding:
    path: str
    line: int
    rule: str
    text: str


def _allowed(root: Path) -> set[tuple[str, str]]:
    allow = root / "tools" / "copy_lint" / "allow.txt"
    out: set[tuple[str, str]] = set()
    if allow.exists():
        for raw in allow.read_text().splitlines():
            line = raw.split("#", 1)[0].strip()
            if ":" in line:
                path, phrase = line.split(":", 1)
                out.add((path.strip(), phrase.strip().lower()))
    return out


def _candidates(root: Path) -> list[Path]:
    """What could be committed: tracked files and untracked files git does not ignore.

    Output the build or the tests write, such as a coverage report, is ignored by git and
    so never read here; a second run of the gates finds what the first did. Outside a git
    repository every file is a candidate, and SKIP_DIRS does the same work.
    """
    listed = subprocess.run(
        ["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
        cwd=root,
        capture_output=True,
        check=False,
    )
    inside = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"],
        cwd=root,
        capture_output=True,
        text=True,
        check=False,
    )
    if (
        listed.returncode
        or Path(inside.stdout.strip() or "/nonexistent").resolve() != root.resolve()
    ):
        return list(root.rglob("*"))
    return [root / name for name in listed.stdout.decode().split("\0") if name]


def _files(root: Path) -> list[Path]:
    found: list[Path] = []
    for path in _candidates(root):
        # The type is checked before the file is touched: a builder's sandbox denies reading
        # the hidden tests, and a path it may not read is not copy it wrote.
        if path.suffix not in TEXT_SUFFIXES or path.name in SKIP_FILES:
            continue
        try:
            if not path.is_file():
                continue
        except OSError:
            continue
        rel = path.relative_to(root)
        if any(part in SKIP_DIRS for part in rel.parts):
            continue
        if rel.as_posix().startswith(SKIP_PREFIXES):
            continue
        # Saved copies of sources are kept exactly as published.
        if rel.parts[0] == "rulepacks" and "sources" in rel.parts:
            continue
        found.append(path)
    return sorted(found)


def lint(root: Path = REPO_ROOT) -> list[Finding]:
    allowed = _allowed(root)
    findings: list[Finding] = []
    for path in _files(root):
        rel = path.relative_to(root).as_posix()
        try:
            lines = path.read_text(encoding="utf-8").splitlines()
        except (UnicodeDecodeError, OSError):
            continue
        product = rel.startswith(PRODUCT_PREFIXES)
        for number, line in enumerate(lines, start=1):
            if DASHES.search(line):
                findings.append(Finding(rel, number, "dash", line.strip()[:120]))
            if EMOJI.search(line):
                findings.append(Finding(rel, number, "emoji", line.strip()[:120]))
            if product:
                for m in _WORDS.finditer(line):
                    phrase = m.group(1).lower()
                    if (rel, phrase) not in allowed:
                        findings.append(
                            Finding(rel, number, f"phrase:{phrase}", line.strip()[:120])
                        )
    return findings


def main() -> int:
    root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else REPO_ROOT
    findings = lint(root)
    for f in findings:
        print(f"{f.path}:{f.line}: {f.rule}: {f.text}")
    if findings:
        print(f"copy lint: {len(findings)} problem(s)")
        return 1
    print("copy lint: clean")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
