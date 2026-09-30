"""Plain words for the law, checked before anyone reads them (DECISIONS.md D56).

Every rule and regime in a pack may carry `plain`: what the rule says, in calm, short words an
average student can read. The exact words stay one tap away. Plain words are Duly's own, so
they are held to more than the quote is:

- general, never about a person: no "you" or "your", no conclusion, no instruction
  (assistant/boundary.py);
- no new facts: every number in them is in the rule's quote, note or value;
- calm: none of the alarm words below;
- readable: short sentences, a reading grade no higher than GRADE;
- the copy rules: no long dashes, no emoji, no forbidden phrase.

Usage: python -m tools.sources.plain [rulepacks] [--require CATEGORY ...]
With --require, every rule and regime of those packs must carry plain words.
"""

import re
import sys
from pathlib import Path
from typing import Any

import yaml

from assistant.boundary import _CONCLUSION, instructs
from tools.copy_lint.lint import _WORDS, DASHES, EMOJI

REPO_ROOT = Path(__file__).resolve().parents[2]
GRADE = 9.0
SENTENCES = {"rule": 3, "regime": 4}
# The contract's limits (contracts/rulepack.schema.json, plain maxLength); a longer text
# makes the pack fail to load.
CHARACTERS = {"rule": 320, "regime": 480}
SECOND_PERSON = re.compile(r"\b(?:you|your|yours|yourself|yourselves)\b", re.IGNORECASE)
ALARM = re.compile(
    r"\b(?:urgent\w*|danger\w*|warning\w*|immediately|deport\w*|illegal\w*|unlawful\w*|"
    r"violat\w*|penalt\w*|punish\w*|terminat\w*|sever(?:e|ely)|alarm\w*|panic\w*|"
    r"out of status)\b",
    re.IGNORECASE,
)
# Plain words are plain first. A citation lives with the exact words, one tap away, and
# legal phrasing that an everyday word can carry without changing who or what the rule
# covers is said in everyday words (point 58).
CITATION = re.compile(
    r"\b\d+\s*(?:CFR|C\.F\.R\.|U\.S\.C\.|FR)\b|\(\w{1,4}\)\(\w{1,4}\)|§", re.IGNORECASE
)
LEGALESE = re.compile(
    r"\b(?:accru\w*|aggregate|pursuant|thereof|therein|herein|hereby|successor form|"
    r"properly file\w*|engage in|described in|notwithstanding|in accordance with)\b",
    re.IGNORECASE,
)
MAX_TERMS = 3
NUMBER = re.compile(r"\d+(?:[.,]\d+)*")
SENTENCE = re.compile(r"[^.!?]+[.!?]?")
VOWELS = re.compile(r"[aeiouy]+")


# Abbreviations whose periods do not end a sentence. "U.S." once split one sentence into
# three, so a text at a real reading grade of 24 was scored under 9 (review of fix 8).
ABBREVIATIONS = re.compile(
    r"\b(?:U\.S\.|e\.g\.|i\.e\.|etc\.|No\.|Dr\.|Mr\.|Ms\.|Mrs\.)", re.IGNORECASE
)


def _unabbreviated(text: str) -> str:
    """The text with each abbreviation written as one word with no period, for counting."""
    return ABBREVIATIONS.sub(lambda m: m.group(0).replace(".", ""), text)


def _sentences(text: str) -> list[str]:
    return [s for s in SENTENCE.findall(_unabbreviated(text)) if s.strip()]


def _syllables(word: str) -> int:
    word = word.lower().strip("'")
    if not word:
        return 0
    groups = len(VOWELS.findall(word))
    if word.endswith("e") and not word.endswith(("le", "ee")) and groups > 1:
        groups -= 1
    return max(groups, 1)


def grade(text: str) -> float:
    """The Flesch-Kincaid grade of a text: 0.39 words per sentence plus 11.8 syllables per
    word, less 15.59."""
    sentences = _sentences(text)
    words = re.findall(r"[A-Za-z']+", _unabbreviated(text))
    if not sentences or not words:
        return 0.0
    syllables = sum(_syllables(w) for w in words)
    return 0.39 * len(words) / len(sentences) + 11.8 * syllables / len(words) - 15.59


def _numbers(text: str) -> set[str]:
    return {n.replace(",", "") for n in NUMBER.findall(text)}


def problems(plain: str, kind: str, grounds: str) -> list[str]:
    """What is wrong with one plain text. grounds holds the words it may take numbers from."""
    found: list[str] = []
    if SECOND_PERSON.search(plain):
        found.append("speaks to a person; plain words say what the rule says, in general")
    hit = _CONCLUSION.search(plain)
    if hit:
        found.append(f"concludes: {hit.group(0)!r}")
    told = instructs(plain)
    if told:
        found.append(f"instructs: {told!r}")
    cited = CITATION.search(plain)
    if cited:
        found.append(f"cites {cited.group(0)!r}; citations go with the exact words")
    legal = LEGALESE.search(plain)
    if legal:
        found.append(f"legal phrasing {legal.group(0)!r}; say it in everyday words")
    alarm = ALARM.search(plain)
    if alarm:
        found.append(f"alarms: {alarm.group(0)!r}")
    new = sorted(_numbers(plain) - _numbers(grounds))
    if new:
        found.append(f"numbers not in the rule's own words: {', '.join(new)}")
    if len(plain) > CHARACTERS[kind]:
        found.append(f"{len(plain)} characters; the contract allows {CHARACTERS[kind]}")
    count = len(_sentences(plain))
    if count > SENTENCES[kind]:
        found.append(f"{count} sentences; at most {SENTENCES[kind]}")
    level = grade(plain)
    if level > GRADE:
        found.append(f"reading grade {level:.1f}; at most {GRADE:.0f}")
    if DASHES.search(plain) or EMOJI.search(plain):
        found.append("a long dash or an emoji")
    word = _WORDS.search(plain)
    if word:
        found.append(f"forbidden phrase: {word.group(0)!r}")
    return found


def _flat(text: str) -> str:
    return " ".join(text.replace("\u2019", "'").lower().split())


def term_problems(entry: dict[str, Any], plain: str, require: bool) -> list[str]:
    """The quote's terms of art, kept word for word in the plain words (D56, point 54).

    Simplifying tempts a writer to trade a term of art for an everyday word ("academic
    training" for "practical training", "U.S. worker" for "worker in the United States"). Each
    rule lists its terms in plain_terms; each must be in the quote and in the plain words.
    """
    terms = entry.get("plain_terms")
    if terms is None:
        return (
            ["no plain_terms: list the quote's terms of art, or [] if it has none"]
            if require
            else []
        )
    quote = _flat(str((entry.get("source") or {}).get("quote", "")))
    words = _flat(plain)
    found = []
    if len(terms) > MAX_TERMS:
        found.append(
            f"{len(terms)} terms; at most {MAX_TERMS}: keep a term only where an everyday word "
            "would change who or what the rule covers"
        )
    for term in terms:
        if CITATION.search(str(term)) or LEGALESE.search(str(term)):
            found.append(f"term {term!r} is a citation or legal phrasing, not a term of art")
            continue
        flat = _flat(str(term))
        if flat not in quote:
            found.append(f"term {term!r} is not in the quote")
        elif flat not in words:
            found.append(f"term {term!r} is not kept in the plain words")
    return found


def _grounds(entry: dict[str, Any]) -> str:
    source = entry.get("source") or {}
    return " ".join(
        str(part)
        for part in (entry.get("value", ""), entry.get("note", ""), source.get("quote", ""))
    )


def check_pack(pack: dict[str, Any], require: bool) -> list[str]:
    found: list[str] = []
    entries = [("regime", r) for r in pack.get("regimes") or []]
    entries += [("rule", p) for p in pack.get("parameters") or []]
    for kind, entry in entries:
        name = f"{pack.get('category')} {kind} {entry.get('id')}"
        if kind == "rule" and entry.get("regime"):
            name += f" ({entry['regime']})"
        plain = entry.get("plain")
        if not plain:
            if require:
                found.append(f"{name}: no plain words")
            continue
        found += [f"{name}: {p}" for p in problems(str(plain), kind, _grounds(entry))]
        if kind == "rule":
            found += [f"{name}: {p}" for p in term_problems(entry, str(plain), require)]
    return found


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    required: set[str] = set()
    if "--require" in args:
        at = args.index("--require")
        required = set(args[at + 1 :])
        args = args[:at]
    base = Path(args[0]) if args else REPO_ROOT / "rulepacks"
    found: list[str] = []
    for path in sorted(base.glob("*/*/parameters.yaml")):
        pack = yaml.safe_load(path.read_text()) or {}
        found += check_pack(pack, str(pack.get("category")) in required)
    for problem in found[:60]:
        print(problem)
    if found:
        print(f"plain words: {len(found)} problem(s)")
        return 1
    print("plain words: every plain text is general, calm, readable and grounded")
    return 0


if __name__ == "__main__":
    sys.exit(main())
