"""Where the assistant model runs. One interface, chosen by configuration.

anthropic: local prototype only, with the founder's own test data.
bedrock: v0 on AWS. Questions stay inside the AWS account.
openai_compatible: a model we host ourselves (vLLM, Ollama).
"""

from dataclasses import dataclass
from enum import StrEnum
from typing import Protocol


class ProviderKind(StrEnum):
    NONE = "none"
    ANTHROPIC = "anthropic"
    BEDROCK = "bedrock"
    OPENAI_COMPATIBLE = "openai_compatible"


@dataclass(frozen=True)
class Passage:
    source_id: str
    text: str


class AssistantModel(Protocol):
    def draft(self, question: str, passages: list[Passage]) -> str: ...


class NotWired:
    """Phase 0: no model. Every question gets the step-back card."""

    def draft(self, question: str, passages: list[Passage]) -> str:
        raise NotImplementedError("the assistant model is wired in Phase 5")
