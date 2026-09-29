"""Spending caps. A run that would pass a cap does not start, and one that reaches it stops."""

from pathlib import Path
from typing import Any

from engine.clocks import Clock
from tools.factory import telemetry


class BudgetError(RuntimeError):
    pass


def spent_today(clock: Clock, cwd: Path | None = None) -> float:
    today = clock.now().date().isoformat()
    return sum(
        float(run.get("cost_usd", 0.0))
        for run in telemetry.read_runs(cwd)
        if str(run.get("ended_at", "")).startswith(today)
    )


def allowance(
    config: dict[str, Any], contract_budget: float, clock: Clock, cwd: Path | None = None
) -> float:
    """How much one run may spend now. Raises when the day's cap is already reached."""
    left_today = float(config["budgets"]["per_day_usd"]) - spent_today(clock, cwd)
    if left_today <= 0:
        raise BudgetError("the cap for today is reached")
    return round(min(contract_budget, float(config["budgets"]["per_task_usd"]), left_today), 2)
