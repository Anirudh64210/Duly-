"""The cause of a failure, read from its text where a machine can tell it.

Every stop carries a cause so the factory can count stops by cause, and for two days every
one was unknown until the founder named it by hand. Some causes leave a mark in the text: a
remote error that passes on its own, a sandbox denial, a used up budget. This table names
them at the source, before any retry is decided. It recognises only marks that cannot be
misread. Telling plan from spec from code needs judgement, so anything else stays unknown
until it is answered, and two marks that disagree give unknown too.

flake and interrupted are never read from text. The caller sets them, since only it knows
that a retry passed or that a run's process is gone. A project adds its own marks through
the extra argument of classify (the profile's signatures).
"""

import re
from collections.abc import Sequence
from dataclasses import dataclass
from functools import cache

CAUSES = (
    "plan",
    "spec",
    "cross-lane",
    "code",
    "factory",
    "infra",
    "wording",
    "flake",
    "interrupted",
    "unknown",
)
# Causes the caller sets from what it saw happen, never from a failure's text.
CALLER_CAUSES = ("flake", "interrupted")
# Facts a signature may need beside its text, which the caller passes in a Context.
NEEDS = ("", "unprotected_ref", "local_green")


@cache
def _compiled(pattern: str) -> re.Pattern[str]:
    return re.compile(pattern, re.MULTILINE)


@dataclass(frozen=True)
class Signature:
    """A mark in a failure's text, and the cause it proves.

    needs names a fact the text alone does not carry. unprotected_ref: every ref the tamper
    message names is a branch, and none of the protected branches. local_green: the gates
    passed locally before CI failed, so the two environments differ.
    """

    id: str
    pattern: str
    cause: str
    needs: str = ""

    def __post_init__(self) -> None:
        if self.cause not in CAUSES or self.cause in (*CALLER_CAUSES, "unknown"):
            raise ValueError(f"signature {self.id}: no signature gives the cause {self.cause!r}")
        if self.needs not in NEEDS:
            raise ValueError(f"signature {self.id}: unknown need {self.needs!r}")
        _compiled(self.pattern)


@dataclass(frozen=True)
class Context:
    """What the caller knows beside the text: the protected branches from the config, and
    whether the local gates passed on the commit CI failed."""

    protected_branches: tuple[str, ...] = ()
    local_gates_green: bool = False


# Older alerts read "protected state changed: ['refs/heads/x']"; agent_run now writes "protected
# parts of the repository changed during the run: refs/heads/x, config" in the alert and end.
TAMPER = (
    r"protected (?:parts of the repository|state) changed(?: during the run)?: "
    r"(?P<refs>\[?'?[\w./-]+'?(?:, '?[\w./-]+'?)*\]?)"
)
# A gate reporting a line of a file the build or the tests wrote, such as copy lint on
# desktop/coverage/lcov-report/prettify.js:23. An installed package named coverage is code.
GENERATED = (
    r"(?:^|[\s'\"(])(?!\S*site-packages)/?(?:[\w.-]+/)*(?:coverage|htmlcov|lcov-report)/"
    r"[\w./-]*:\d+"
)
# Most specific first: when several marks agree, the first names the signature.
LOCAL = (
    Signature("sandbox.index_lock", r"index\.lock\S*\s*Operation not permitted", "plan"),
    Signature(
        "sandbox.mkdtemp", r"mkdtemp\b.*(?:Operation not permitted|Permission denied)", "plan"
    ),
    Signature("sandbox.violations", r"sandbox_violations", "plan"),
    Signature("sandbox.not_permitted", r"Operation not permitted", "plan"),
    Signature("budget.used_up", r"\bbudget (?:for this task )?is used up", "factory"),
    Signature("tamper.unprotected_ref", TAMPER, "factory", needs="unprotected_ref"),
    Signature("gate.generated_file", GENERATED, "factory"),
    Signature("ci.red_local_green", r"clean CI did not pass", "factory", needs="local_green"),
)


@cache
def core() -> tuple[Signature, ...]:
    """The core table: the remote errors phase retries, then the local marks.

    phase is imported here, not at the top: phase imports efficiency, which imports this
    module for CAUSES.
    """
    from tools.factory.phase import TRANSIENT

    remote = Signature("remote.transient", "|".join(re.escape(s) for s in TRANSIENT), "infra")
    return (remote, *LOCAL)


def _unprotected(refs: str, protected: tuple[str, ...]) -> bool:
    """Every ref named is a branch and none is protected. With no protected branches known,
    or a list agent_run may have cut short (it keeps 4 in the alert), nothing is proved."""
    names = re.findall(r"[\w./-]+", refs)
    if not protected or not names or len(names) >= 4:
        return False
    heads = [n.removeprefix("refs/heads/") for n in names if n.startswith("refs/heads/")]
    return len(heads) == len(names) and not set(heads) & set(protected)


def _matches(signature: Signature, text: str, context: Context) -> bool:
    found = _compiled(signature.pattern).search(text)
    if found is None:
        return False
    if signature.needs == "local_green":
        return context.local_gates_green
    if signature.needs == "unprotected_ref":
        return _unprotected(found.group("refs"), context.protected_branches)
    return True


def source(cause: str | None) -> str | None:
    """Who named a cause the orchestrator wrote: auto, or None while it is unknown, since only
    a person can name an unknown cause and handled records that answer as human."""
    return None if cause in {None, "", "unknown"} else "auto"


def classify(
    text: str, context: Context | None = None, extra: Sequence[Signature] = ()
) -> tuple[str, str | None]:
    """The cause a failure's text proves, and the id of the signature that proves it.

    ("unknown", None) when no signature matches, or when matching signatures disagree.
    """
    ctx = context or Context()
    found = [s for s in (*core(), *extra) if _matches(s, text, ctx)]
    if len({s.cause for s in found}) != 1:
        return "unknown", None
    return found[0].cause, found[0].id
