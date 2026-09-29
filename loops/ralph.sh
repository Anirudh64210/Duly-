#!/usr/bin/env bash
# Retired. Agents run only through the factory, inside the sandbox, the contract, the budget
# and the record of actions:
#   uv run python -m tools.factory.phase specs/<plan>.yaml
echo "loops/ralph.sh is retired. Use: uv run python -m tools.factory.phase <plan.yaml>" >&2
exit 1
