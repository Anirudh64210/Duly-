"""The line from BOUNDARY.md, as code.

This is the deterministic floor. A model may sit on top of it later, but a
model can only move a turn from answer to step back, never the other way.
"""

import re
from dataclasses import dataclass
from enum import StrEnum


class Side(StrEnum):
    ANSWER = "answer"
    STEP_BACK = "step_back"


@dataclass(frozen=True)
class Decision:
    side: Side
    test: str
    matched: str


_ME = r"(?:i|i'm|im|me|my|mine|we|our|myself)"

# Test 1: a judgement about the person's facts against a standard with no fixed number.
_JUDGEMENT = re.compile(
    r"\b(?:does|do|would|will|is|are|did)\s+(?:my|our|this|that|these|it)\b[^?.!]*"
    r"\b(?:count|counts|qualify|qualifies|related|relate|enough|ok|okay|fine|valid|bona fide|"
    r"legal|allowed|acceptable|sufficient)\b",
    re.IGNORECASE,
)

# Test 2: a modal or status word with the user as the subject.
_MODAL = re.compile(
    r"\b(?:should|can|could|may|must|will|would|do|does|am|are|is)\s+" + _ME + r"\b"
    r"|\b" + _ME + r"\s+(?:should|can|could|may|must|will|would|need to|have to|am|qualify)\b"
    r"|\b(?:am i|are we)\b"
    r"|\bwhich\s+(?:form|code|category|visa|option)\b"
    r"|\bwhat\s+(?:should|do i|would you)\b"
    r"|\b(?:better|best|recommend|advise|advice|suggest|chances|odds|likely|risky|safe)\b"
    r"|\b(?:write|draft|fill|prepare)\b[^?.!]*\b(?:uscis|rfe|sevp|i-?\d{3}|petition|cover letter|"
    r"declaration|response)\b",
    re.IGNORECASE,
)

# Test 3 and the information side: questions about what a rule says.
_INFORMATION = re.compile(
    r"^\s*(?:what\s+(?:is|are|does|do)|how\s+(?:many|long|does|do|is)|when\s+(?:does|do|is|did)|"
    r"where\s+(?:is|does|can one)|who\s+(?:is|decides|signs)|explain|define|show)\b",
    re.IGNORECASE,
)

_DRAFT_TO_DSO = re.compile(
    r"\b(?:write|draft|prepare)\b[^?.!]*\b(?:dso|advisor|isss|international office)\b",
    re.IGNORECASE,
)


def classify_turn(text: str) -> Decision:
    if _DRAFT_TO_DSO.search(text):
        return Decision(Side.STEP_BACK, "dso_draft", "asks for a DSO draft")
    m = _JUDGEMENT.search(text)
    if m:
        return Decision(Side.STEP_BACK, "judgement", m.group(0))
    m = _MODAL.search(text)
    if m:
        return Decision(Side.STEP_BACK, "modal", m.group(0))
    m = _INFORMATION.search(text)
    if m:
        return Decision(Side.ANSWER, "information", m.group(0))
    return Decision(Side.STEP_BACK, "doubt", "")


def classify_conversation(turns: list[str]) -> Decision:
    """The last turn decides, unless it leans on an earlier personal turn.

    A short follow-up such as "and what about for a startup?" carries the
    subject of the turn before it, so it inherits that turn's decision.
    """
    if not turns:
        return Decision(Side.STEP_BACK, "doubt", "")
    last = classify_turn(turns[-1])
    if last.side is Side.STEP_BACK:
        return last
    follow_up = re.match(r"^\s*(?:and|so|then|ok|okay|what about|how about)\b", turns[-1], re.I)
    if follow_up and len(turns) > 1:
        earlier = classify_turn(turns[-2])
        if earlier.side is Side.STEP_BACK:
            return Decision(Side.STEP_BACK, "drift", earlier.matched)
    return last


# Output side: what a drafted answer may never contain.
_CONCLUSION = re.compile(
    r"\byou(?:'re| are| will| would| should| can| could| may| must| need to| have to| qualify|"
    r" do not need| don't need)\b"
    r"|\byour\s+\w+(?:\s+\w+)?\s+(?:counts|qualifies|is fine|is valid|is safe|is enough)\b"
    r"|\b(?:eligible|ineligible|in status|out of status|compliant|qualif\w+|guarantee\w*|"
    r"nothing to worry|don't worry|do not worry|you're fine|plenty of time)\b"
    r"|\b(?:i|we)\s+(?:recommend|advise|suggest)\b",
    re.IGNORECASE,
)
# An instruction to the person, however it is phrased. "File this form now" tells the
# person what to do as surely as "you should file". The only instruction Duly gives is to
# take the question to the people whose question it is.
_TO_THE_DSO = re.compile(
    r"^\s*(?:ask|confirm(?: this| it)? with|take (?:this|it|the question) to|check with|"
    r"talk to|speak (?:to|with)|write to|show (?:this|it) to)\s+"
    r"(?:your|the|an?)\s+(?:dso|school|isss|international (?:student )?office|advisor|"
    r"attorney|lawyer|immigration attorney)\b",
    re.IGNORECASE,
)
_ACTIONS = (
    "file",
    "submit",
    "apply",
    "sign",
    "send",
    "mail",
    "pay",
    "travel",
    "leave",
    "stay",
    "return",
    "enter",
    "re-enter",
    "reenter",
    "report",
    "renew",
    "request",
    "register",
    "enroll",
    "enrol",
    "withdraw",
    "transfer",
    "accept",
    "decline",
    "quit",
    "resign",
    "start",
    "begin",
    "stop",
    "wait",
    "hurry",
    "avoid",
    "keep",
    "get",
    "make",
    "be",
    "take",
    "use",
    "choose",
    "pick",
    "select",
    "write",
    "upload",
    "book",
    "schedule",
    "change",
    "update",
    "consider",
    "try",
    "remember",
    "ensure",
    "check",
    "confirm",
    "contact",
    "call",
    "ask",
    "tell",
    "go",
    "work",
    "continue",
    "hold",
    "prepare",
    "gather",
    "collect",
    "attach",
    "include",
    "answer",
    "respond",
    "reply",
    "move",
    "buy",
    "cancel",
)
_IMPERATIVE = re.compile(
    r"^\s*(?:please\s+|then\s+|next,?\s+|first,?\s+|now\s+|just\s+|simply\s+|also\s+)*"
    r"(?:do\s+not\s+|don't\s+|never\s+|always\s+)?"
    r"(?:" + "|".join(_ACTIONS) + r")\b(?!\s*:)",
    re.IGNORECASE,
)
_IMPERSONAL_ADVICE = re.compile(
    r"\b(?:it\s+is|it's|it\s+would\s+be|it\s+may\s+be)\s+(?:best|better|wise|wiser|safe|safer|"
    r"safest|advisable|recommended|a\s+good\s+idea|important|necessary|risky|too\s+late|"
    r"not\s+too\s+late|fine|ok|okay)\b"
    r"|\b(?:there\s+is|there's)\s+no\s+(?:need|reason|rush|risk|problem)\b"
    r"|\bno\s+need\s+to\b|\bbest\s+to\b|\bbetter\s+to\b|\bthe\s+best\s+(?:option|choice|time)\b"
    r"|\b(?:the\s+)?(?:safest|smartest|right)\s+(?:option|choice|move|thing)\b"
    r"|\b(?:make|be)\s+sure\b|\bas\s+soon\s+as\s+possible\b|\bright\s+away\b",
    re.IGNORECASE,
)
_CLAUSE = re.compile(
    r"(?<=[.!?;])\s+|\s+(?:and|then|but|so)\s+(?=[A-Za-z]+\s)|,\s+(?:and\s+)?then\s+"
)


def instructs(text: str) -> str:
    """The part of the text that tells the person what to do, or an empty string."""
    found = _IMPERSONAL_ADVICE.search(text)
    if found:
        return found.group(0).strip()
    for clause in _CLAUSE.split(text):
        if not clause or _TO_THE_DSO.match(clause):
            continue
        hit = _IMPERATIVE.match(clause)
        if hit:
            return " ".join(clause.split()[:4])
    return ""


# Citations and form names carry digits that are not values.
_CITATION = re.compile(
    r"\b\d+\s+(?:C\.?F\.?R\.?|U\.?S\.?C\.?|FR)\s+\d[\d.]*(?:\([0-9A-Za-z]+\))*"
    r"|\bINA\s+\d+(?:\([0-9A-Za-z]+\))*"
    r"|\b[A-Z]{1,4}-\d[\w-]*",
)
_NUMBER = re.compile(r"(?<![\w.(])\d+(?:\.\d+)?(?![\w)]|\.\d)")


@dataclass(frozen=True)
class Sentence:
    text: str
    source_ids: tuple[str, ...]


@dataclass(frozen=True)
class ValidationResult:
    ok: bool
    problems: tuple[str, ...]


def validate_answer(
    sentences: list[Sentence],
    known_source_ids: set[str],
    allowed_numbers: set[str],
) -> ValidationResult:
    problems: list[str] = []
    for i, s in enumerate(sentences):
        m = _CONCLUSION.search(s.text)
        if m:
            problems.append(f"sentence {i}: conclusion about the user ({m.group(0).strip()})")
        told = instructs(s.text)
        if told:
            problems.append(f"sentence {i}: tells the person what to do ({told})")
        if not s.source_ids:
            problems.append(f"sentence {i}: no source")
        problems.extend(
            f"sentence {i}: unknown source {sid}"
            for sid in s.source_ids
            if sid not in known_source_ids
        )
        problems.extend(
            f"sentence {i}: number {n} is not an engine or rule value"
            for n in _NUMBER.findall(_CITATION.sub(" ", s.text))
            if n not in allowed_numbers
        )
    return ValidationResult(ok=not problems, problems=tuple(problems))
