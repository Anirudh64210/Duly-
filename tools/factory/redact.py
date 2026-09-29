"""Take secrets out of text before it is written to a log or shown on a screen."""

import re

MARK = "[redacted]"

PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"sk-ant-[A-Za-z0-9_-]{20,}"),
    re.compile(r"gh[pousr]_[A-Za-z0-9]{30,}"),
    re.compile(r"github_pat_[A-Za-z0-9_]{30,}"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"xox[baprs]-[A-Za-z0-9-]{10,}"),
    re.compile(r"sk_(?:live|test)_[A-Za-z0-9]{16,}"),
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----.*?-----END [A-Z ]*PRIVATE KEY-----", re.S),
    re.compile(r"eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}"),
    re.compile(r"(?i)\b(authorization|x-api-key)\s*:\s*\S+(?:\s+\S+)?"),
    re.compile(
        r"(?i)\b([a-z0-9_]*(?:password|passwd|secret|token|api_?key)[a-z0-9_]*)"
        r"(\s*[=:]\s*)(['\"]?)[^\s'\"]{8,}\3"
    ),
)


def redact(text: str) -> str:
    for pattern in PATTERNS[:-2]:
        text = pattern.sub(MARK, text)
    text = PATTERNS[-2].sub(lambda m: f"{m.group(1)}: {MARK}", text)
    return PATTERNS[-1].sub(lambda m: f"{m.group(1)}{m.group(2)}{MARK}", text)
