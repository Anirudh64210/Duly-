#!/usr/bin/env bash
# Lane runner. One fresh context per iteration, state kept in files.
# Usage: DULY_LANE=L-web MAX_ITERATIONS=20 loops/ralph.sh
set -euo pipefail

: "${DULY_LANE:?set DULY_LANE}"
MAX_ITERATIONS="${MAX_ITERATIONS:-20}"
PROMPT="${PROMPT:-PROMPT.md}"
DONE_CMD="${DONE_CMD:?set DONE_CMD to the command that proves the work is done}"

[ -f "$PROMPT" ] || { echo "no $PROMPT in $(pwd)"; exit 1; }
[ "$MAX_ITERATIONS" -le 50 ] || { echo "cap is 50 iterations"; exit 1; }

for i in $(seq 1 "$MAX_ITERATIONS"); do
  if [ -f ESCALATE.md ]; then echo "escalated at iteration $i"; exit 2; fi
  if bash -c "$DONE_CMD" >/dev/null 2>&1; then echo "done at iteration $i"; exit 0; fi
  echo "iteration $i of $MAX_ITERATIONS"
  claude -p "$(cat "$PROMPT")"
done

if bash -c "$DONE_CMD" >/dev/null 2>&1; then echo "done at the cap"; exit 0; fi
echo "cap reached without passing: $DONE_CMD"
exit 1
