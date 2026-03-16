#!/usr/bin/env bash
# ralph-loop.sh — Full Ralph Wiggum overnight build loop for Crit Commit
# Usage: ANTHROPIC_API_KEY=sk-ant-xxx bash ralph-loop.sh [max_iterations]
set -euo pipefail

MAX="${1:-50}"
ALLOWED="Bash,Read,Write,Edit,Glob,Grep,MultiEdit"
MAX_TURNS="${RALPH_MAX_TURNS:-40}"
LOG_DIR=".ralph"
LOG_FILE="$LOG_DIR/ralph-$(date +%Y%m%d-%H%M%S).log"
KILLSWITCH="$LOG_DIR/KILLSWITCH"

SONNET="claude-sonnet-4-20250514"
OPUS="claude-opus-4-20250514"

# Tasks that benefit from Opus (creative/complex integration work)
# Task 12: Prompt builder — requires creative system prompt design
# Task 13: Response parser + Claude invoker — needs to get the CLI interface right
# Task 20: Scanner orchestrator — complex integration wiring
# Task 27: Game canvas — creative pixel art scene building
# Task 32: End-to-end integration — wiring all systems together
# Task 33: README and docs — creative technical writing
OPUS_TASKS="12 13 20 27 32 33"

mkdir -p "$LOG_DIR"

# --- Preflight checks ---
if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "ERROR: ANTHROPIC_API_KEY is not set."
  echo "Usage: ANTHROPIC_API_KEY=sk-ant-xxx bash ralph-loop.sh [max_iterations]"
  exit 1
fi

if ! command -v claude &> /dev/null; then
  echo "ERROR: claude CLI not found in PATH."
  exit 1
fi

if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  echo "WARNING: Not a git repo yet. Task 1 will initialize it."
fi

if [ -f "$KILLSWITCH" ]; then
  echo "KILLSWITCH detected ($KILLSWITCH exists). Remove it to start."
  exit 1
fi

CHECKPOINT=$(git rev-parse HEAD 2>/dev/null || echo "no-git-yet")
echo "=== Crit Commit Ralph Loop ===" | tee -a "$LOG_FILE"
echo "Checkpoint: $CHECKPOINT" | tee -a "$LOG_FILE"
echo "Max iterations: $MAX" | tee -a "$LOG_FILE"
echo "Max turns per iteration: $MAX_TURNS" | tee -a "$LOG_FILE"
echo "Sonnet tasks: all except [$OPUS_TASKS]" | tee -a "$LOG_FILE"
echo "Opus tasks: [$OPUS_TASKS]" | tee -a "$LOG_FILE"
echo "Started: $(date)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# --- Completion check (exact match on line 1 only) ---
check_complete() {
  if [ -f "plan.md" ]; then
    FIRST_LINE=$(head -1 plan.md 2>/dev/null)
    if [ "$FIRST_LINE" = "STATUS: COMPLETE" ]; then
      return 0
    fi
  fi
  return 1
}

# --- Detect next task number from plan.md ---
get_next_task() {
  if [ -f "plan.md" ]; then
    # Find the first unchecked task line, extract task number
    grep -m1 '^\- \[ \] Task' plan.md 2>/dev/null | grep -o 'Task [0-9]*' | grep -o '[0-9]*' || echo "0"
  else
    echo "0"
  fi
}

# --- Pick model based on task number ---
pick_model() {
  local task_num="$1"
  for opus_task in $OPUS_TASKS; do
    if [ "$task_num" = "$opus_task" ]; then
      echo "$OPUS"
      return
    fi
  done
  echo "$SONNET"
}

# --- Main loop ---
PREV_TASK="0"
STALL_COUNT=0

for i in $(seq 1 "$MAX"); do
  # Killswitch check
  if [ -f "$KILLSWITCH" ]; then
    echo "" | tee -a "$LOG_FILE"
    echo "KILLSWITCH at iteration $i. Stopping." | tee -a "$LOG_FILE"
    exit 1
  fi

  # Detect current task and pick model
  CURRENT_TASK=$(get_next_task)
  MODEL=$(pick_model "$CURRENT_TASK")

  # Stall detection: if same task fails 3 times in a row, escalate to Opus
  if [ "$CURRENT_TASK" = "$PREV_TASK" ]; then
    STALL_COUNT=$((STALL_COUNT + 1))
    if [ "$STALL_COUNT" -ge 3 ] && [ "$MODEL" = "$SONNET" ]; then
      MODEL="$OPUS"
      echo "  STALL DETECTED: Task $CURRENT_TASK failed 3x with Sonnet. Escalating to Opus." | tee -a "$LOG_FILE"
    fi
  else
    STALL_COUNT=0
  fi
  PREV_TASK="$CURRENT_TASK"

  # Model name for display
  if [ "$MODEL" = "$OPUS" ]; then
    MODEL_LABEL="OPUS"
  else
    MODEL_LABEL="SONNET"
  fi

  echo "================================================================" | tee -a "$LOG_FILE"
  echo "  Iteration $i / $MAX — Task $CURRENT_TASK — $MODEL_LABEL — $(date '+%H:%M:%S')" | tee -a "$LOG_FILE"
  echo "================================================================" | tee -a "$LOG_FILE"

  # Run Claude headlessly
  ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" claude -p \
    "You are building Crit Commit: A Claude Code RPG. You are running in HEADLESS MODE — there is NO human to answer questions. NEVER ask clarifying questions. Make your best judgment and keep building.

Read plan.md to find the task checklist. Read docs/superpowers/plans/2026-03-15-crit-commit-implementation.md for detailed instructions on each task. Find the NEXT unchecked task (- [ ]). Implement ONLY that one task following the detailed instructions. If anything is ambiguous, make a reasonable decision and proceed — do not stop to ask. After implementation, run verification gates: npm run lint && npm run typecheck && npm run build && npm test. Fix any failures. Mark completed steps as - [x] in plan.md. Commit your changes with a descriptive message. If ALL tasks are now checked off, add the text STATUS: COMPLETE as the very first line of plan.md (before everything else)." \
    --allowedTools "$ALLOWED" \
    --max-turns "$MAX_TURNS" \
    --model "$MODEL" \
    2>&1 | tee -a "$LOG_FILE"

  echo "" | tee -a "$LOG_FILE"

  # Check if plan is marked complete
  if check_complete; then
    echo "" | tee -a "$LOG_FILE"
    echo "ALL TASKS COMPLETE at iteration $i!" | tee -a "$LOG_FILE"
    echo "Finished: $(date)" | tee -a "$LOG_FILE"
    exit 0
  fi

  # Show progress
  if [ -f "plan.md" ]; then
    done_count=$(grep -c '^\- \[x\]' plan.md 2>/dev/null || echo 0)
    total_count=$(grep -c '^\- \[' plan.md 2>/dev/null || echo 0)
    echo "  Progress: $done_count / $total_count tasks done" | tee -a "$LOG_FILE"
  fi

  # Brief pause between iterations
  sleep 3
done

echo "" | tee -a "$LOG_FILE"
echo "Max iterations ($MAX) reached. Review plan.md for progress." | tee -a "$LOG_FILE"
echo "Finished: $(date)" | tee -a "$LOG_FILE"
exit 1
