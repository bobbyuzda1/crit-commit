#!/usr/bin/env bash
# Ralph test loop — run from /tmp/ralph-test/
set -uo pipefail

if [ ! -f "plan.md" ]; then
  echo "ERROR: No plan.md found. Run this from /tmp/ralph-test/"
  exit 1
fi

for i in 1 2 3 4 5; do
  echo "=== Iteration $i ==="

  FIRST_LINE=$(head -1 plan.md 2>/dev/null)
  if [ "$FIRST_LINE" = "STATUS: COMPLETE" ]; then
    echo "COMPLETE! All tasks done."
    break
  fi

  claude -p "Read plan.md. Find the next unchecked task (- [ ]). Do ONLY that task. Mark it as - [x] in plan.md when done. Commit changes. If ALL tasks are now checked off, add the text STATUS: COMPLETE as the very first line of plan.md." \
    --allowedTools "Bash,Read,Write,Edit" \
    --max-turns 10 \
    --model claude-sonnet-4-20250514

  echo ""
  echo "Progress: $(grep -c '^\- \[x\]' plan.md 2>/dev/null || echo 0) / $(grep -c '^\- \[' plan.md 2>/dev/null || echo 0) tasks"
  echo ""
  sleep 2
done
