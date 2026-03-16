# Mini-Ralph Implementation Guide

> **What this file is:** A context file for Claude Code CLI. When referenced, it instructs Claude Code
> on how to apply lightweight iterative loop principles ("mini-Ralph") to everyday development tasks.
> This is NOT the full autonomous Ralph Wiggum overnight loop — it is a distilled, subscription-friendly
> adaptation designed for Max plan users working interactively on typical projects.

---

## TLDR

Mini-Ralph adapts the Ralph Wiggum loop's core architecture — fresh context per task, filesystem as
memory, test gates between iterations — into a practical daily workflow. Instead of 50-iteration
overnight runs, you run 2–5 focused iterations on a single well-defined task. The result: better
output quality, less context rot, and no wasted subscription tokens.

---

## Killswitch and On/Off Toggle

Mini-Ralph has two safety controls: a **killswitch** that instantly halts all loops, and an
**on/off toggle** that lets you activate or deactivate mini-Ralph behavior mid-conversation.

### Killswitch (emergency stop for loops)

**What it is:** A file on disk (`.ralph/KILLSWITCH`) that acts as a dead man's switch. When this
file exists, ALL mini-Ralph activity stops — the bash lite-loop script exits, and Claude Code in
interactive mode stops applying mini-Ralph rules and tells you it halted.

**How to use it:**
```bash
# STOP everything — create the killswitch file
touch .ralph/KILLSWITCH

# RESUME — remove it when you're ready
rm .ralph/KILLSWITCH
```

**Why it works:** Both the `lite-loop.sh` script and Claude Code's interactive behavior check for
this file before every iteration and before every task. If it appears mid-loop, the current
iteration finishes its in-progress action, then exits cleanly on the next check. No data is lost —
any committed work remains in git, and the progress log records where it stopped.

**When to use it:**
- The lite-loop script is burning through subscription tokens on a bad path
- Claude Code is stuck in a fix-fail-fix cycle and you want to intervene manually
- You realize the task was poorly defined and want to stop, rethink, and restart
- Any situation where you need an immediate, reliable, no-questions-asked stop

### On/Off Toggle (activate or deactivate mid-conversation)

**What it is:** A conversational command that tells Claude Code whether to follow mini-Ralph rules
in the current session. This guide file can be loaded in CLAUDE.md at all times without imposing
mini-Ralph behavior — it only activates when the toggle is on.

**How to use it:**

| User says | What happens |
|-----------|-------------|
| **"ralph on"** | Claude Code activates all mini-Ralph behavior: plan-then-execute workflow, test gates, progress logging, subagent research, session rotation, auto-commits. Claude confirms: "Mini-Ralph activated. I'll follow the plan-then-execute workflow with test gates." |
| **"ralph off"** | Claude Code deactivates mini-Ralph behavior and returns to standard interactive mode. No test gates, no plan files, no auto-commits, no progress logging. Claude confirms: "Mini-Ralph deactivated. Back to standard mode." |
| **"ralph status"** | Claude Code reports the current state: active or inactive, killswitch present or not, and current plan.md status if active. |

**Rule for Claude Code:** The toggle state is determined by (in priority order):
1. **Killswitch file exists** → mini-Ralph is OFF regardless of anything else. Tell the user.
2. **User said "ralph off" in this session** → mini-Ralph is OFF.
3. **User said "ralph on" in this session** → mini-Ralph is ON.
4. **Neither said** → check `mini_ralph_active` in the settings block (default: `true`).

This means if `mini_ralph_active: true` in settings, mini-Ralph is on by default when the guide
loads. If `mini_ralph_active: false`, the guide loads silently and waits for "ralph on." The user
can override either default at any time mid-conversation.

---

## Choosing a Mode: Interactive vs. Scripted

Mini-Ralph has two modes. They share the same principles (plan files, test gates, incremental
commits, filesystem as memory) but differ in how much control you have during execution.

### Interactive mode (normal `claude` session with "ralph on")

**What it feels like:** A normal Claude Code conversation. Claude talks to you, asks questions,
proposes plans for your approval, waits for your go-ahead, and lets you steer at every step.
The mini-Ralph rules are behavioral guardrails layered on top — Claude also runs test gates
after each change, commits incrementally, writes to plan.md and progress.log, and tells you
when context is getting heavy. But the back-and-forth is identical to what you are used to.

**Use this when:**
- The task has ambiguity that requires your judgment (architecture decisions, UX choices, etc.)
- You want to review Claude's plan before implementation starts
- You are working on something new and want to steer as you learn more about the problem
- The task involves client-specific or domain-specific knowledge Claude does not have
- You want to annotate and correct the plan through review cycles
- General day-to-day development across any project type

**How to start:** Open Claude Code normally (`claude`), then say "ralph on." Work as usual.
Claude follows the plan-then-execute workflow, asks questions when uncertain, and checks with
you before major decisions.

### Scripted mode (`lite-loop.sh` with `claude -p`)

**What it feels like:** Fire-and-forget. You run a command, the terminal shows progress output,
and Claude works autonomously with no pauses, no questions, and no input from you. Each
iteration is a completely independent headless session — not a conversation. Claude reads the
task from your prompt and plan.md, does the work, and exits. The bash script runs test gates,
then starts the next iteration if needed.

**Use this when:**
- The task is well-defined and mechanical (fix all lint errors, add types to all files, etc.)
- You have already written a detailed plan.md and want Claude to execute it without supervision
- There is strong backpressure (tests, linter, type checker) that will catch mistakes
- You want to run it in the background while you work on something else in another terminal
- The task does not require any human judgment or mid-task decisions

**How to start:** Run `./lite-loop.sh "Your task" 3` from your project directory. Monitor
output in the terminal or check `.ralph/lite-loop-*.log` afterward.

**How to provide input during a scripted run:** You cannot type into the running session.
However, you can steer between iterations by editing files on disk in another terminal tab:
- Edit `plan.md` to add notes, constraints, or redirect priorities
- Edit source files to fix something Claude keeps getting wrong
- Create `.ralph/KILLSWITCH` to stop the loop entirely

The script sleeps briefly between iterations, and each new iteration reads fresh from disk —
so any file changes you make will be picked up by the next pass.

### Decision guide for Claude Code

**Rule for Claude Code:** When mini-Ralph is active in an interactive session, ALWAYS maintain
the conversational flow the user expects. Specifically:
- **Ask questions** when the task is ambiguous or when you need clarification
- **Present the plan** and wait for approval before implementing (do not auto-execute)
- **Pause after each completed task** to briefly report what was done and what is next
- **Respect "ralph off"** immediately if the user wants to switch back to standard mode

Do NOT behave like headless mode in an interactive session. The plan-then-execute workflow,
test gates, and progress logging happen within the normal conversational rhythm — they do not
replace it.

---

## Project Settings

> **How to use:** Copy this entire file into your project (or reference it from CLAUDE.md). Then modify
> ONLY this settings block to match your project. Everything below the settings block is universal logic
> that reads from these values. Toggle features on/off with `true`/`false`. Change commands to match
> your stack. Claude Code: always read this settings block first and obey these values throughout.

```yaml
# ──────────────────────────────────────────────────────────────────────
# MINI-RALPH PROJECT SETTINGS — Edit these per project/folder
# ──────────────────────────────────────────────────────────────────────

# --- Master Toggle ---
# Controls whether mini-Ralph behavior is active in this session.
# The user can say "ralph on" or "ralph off" mid-conversation to toggle this.
# Claude Code: check this value before applying ANY mini-Ralph rules.
mini_ralph_active: true                   # Set to false to load this file without activating behavior

# --- Killswitch ---
# If this file exists on disk, ALL mini-Ralph loops (scripted and interactive) stop immediately.
# Create it:  touch .ralph/KILLSWITCH
# Remove it:  rm .ralph/KILLSWITCH
killswitch_file: ".ralph/KILLSWITCH"      # Path checked before every iteration and every task

# --- Identity ---
project_name: "My Project"               # Display name for progress logs
project_type: "generic"                   # Options: salesforce | wordpress | node | python | generic

# --- Verification Commands ---
# These run as "test gates" between iterations. Set to "" to skip any gate.
# Claude Code: run ALL non-empty gates after every task. Do NOT commit if any gate fails.
test_command: "npm test"                  # Unit/integration tests
lint_command: "npm run lint"              # Linter
typecheck_command: "npm run typecheck"    # Type checker (tsc, pyright, etc.)
build_command: "npm run build"            # Build/compile step
custom_gate_command: ""                   # Any additional verification (e.g., "sfdx force:source:deploy --checkonly")

# --- Session Limits ---
max_iterations: 3                         # How many loop passes for a mini-Ralph task (2-5 recommended)
max_turns_per_iteration: 10               # --max-turns value per claude -p call
context_rotation_pct: 60                  # Start new session when context usage exceeds this %

# --- Feature Toggles ---
use_plan_file: true                       # Write/read plan.md for multi-step work
use_progress_log: true                    # Append progress to .ralph/progress.log after each task
use_subagents_for_research: true          # Delegate codebase research to subagents (saves main context)
auto_commit_on_pass: true                 # Git commit automatically when all gates pass
commit_message_prefix: "[mini-ralph]"     # Prefix for auto-commits (set to "" for none)

# --- File Paths ---
plan_file: "plan.md"                      # Where the task plan lives
progress_log: ".ralph/progress.log"       # Append-only progress log across sessions
research_output: ".ralph/research.md"     # Where subagent research findings go

# --- Allowed Tools (for headless/scripted runs) ---
# Restrict what Claude Code can do in automated iterations.
# Use "*" for unrestricted, or a comma-separated list of tools.
allowed_tools: "Read,Write,Edit,Bash,Glob,Grep"

# --- Stack-Specific Overrides ---
# Uncomment and modify the block that matches your project_type.

# -- Salesforce --
# test_command: "sf apex run test --synchronous --result-format human"
# lint_command: "sf scanner run --target ./force-app --format table"
# typecheck_command: ""
# build_command: ""
# custom_gate_command: "sf project deploy start --dry-run --source-dir force-app"

# -- WordPress --
# test_command: "vendor/bin/phpunit"
# lint_command: "vendor/bin/phpcs --standard=WordPress"
# typecheck_command: ""
# build_command: ""
# custom_gate_command: ""

# -- Node/React --
# test_command: "npm test"
# lint_command: "npm run lint"
# typecheck_command: "npx tsc --noEmit"
# build_command: "npm run build"
# custom_gate_command: ""

# -- Python --
# test_command: "pytest"
# lint_command: "ruff check ."
# typecheck_command: "pyright"
# build_command: ""
# custom_gate_command: ""
```

---

## 1. Core Principles

These are the foundational rules Claude Code must follow when this guide is active. They are derived
from the Ralph Wiggum loop architecture but scaled down for interactive, subscription-based use.

### 1a. Fresh context beats long conversations

**Why:** Claude Code's 200K context window fills with system prompts (~30-40K tokens), tool
definitions, CLAUDE.md content, and conversation history. After ~60% usage, response quality
degrades — Claude re-reads files it already processed, makes assumptions from stale earlier
messages, and loses track of what has been completed versus what remains. The Ralph loop solves
this by giving each iteration a completely clean context window. Progress persists through the
filesystem (modified files, git history, plan files), not the conversation.

**Rule for Claude Code:** Monitor context usage. When approaching `context_rotation_pct` (default
60%), tell the user it is time to start a fresh session. Before ending, write a handover summary
to `progress_log` documenting what was completed, what remains, and any blockers. The next session
reads this file to pick up where the previous one left off.

### 1b. One task per iteration

**Why:** Context is a finite resource. The less Claude holds in working memory, the better the
output. Asking for "fix all the bugs AND add auth AND refactor utils" in one prompt guarantees
mediocre results on all three. One focused task per session or iteration converges faster and
produces verifiable results.

**Rule for Claude Code:** If the user gives a multi-part request, break it into discrete tasks.
Propose a sequence. Execute one at a time. After each task, run the test gates (Section 3) before
moving to the next. Never silently bundle unrelated changes into one commit.

### 1c. Filesystem is memory

**Why:** Between sessions or loop iterations, Claude has zero memory of prior conversation. The
only way to carry forward context is through files on disk and git history. This is not a
limitation — it is the architecture. Files are durable, inspectable, and diffable. Conversation
history is none of those things.

**Rule for Claude Code:** When working on multi-step tasks:
- Read `plan_file` at the start of every session to understand current state
- Update `plan_file` after completing each task (mark done, add notes)
- Append a one-line summary to `progress_log` after each completed task
- Write research findings to `research_output` instead of keeping them in conversation
- Commit after each verified task so git history captures incremental progress

### 1d. Test gates are non-negotiable

**Why:** Without automated verification between steps, errors compound silently. The Ralph loop's
power comes from its "backpressure" — tests, linters, and type checkers that reject bad output
immediately. A 3-iteration loop with test gates after each iteration catches problems early. A
single long session without verification catches them late (or not at all).

**Rule for Claude Code:** After every code change, run ALL non-empty verification commands from the
settings block in this order: `test_command` → `lint_command` → `typecheck_command` →
`build_command` → `custom_gate_command`. If ANY gate fails, fix the failure before proceeding.
Do NOT commit code that fails any gate. Do NOT skip gates to save time.

---

## 2. The Plan-Then-Execute Workflow

This is the standard workflow for any task that touches more than one file or takes more than a
few minutes. It prevents the most common failure mode: Claude making a reasonable-but-wrong
assumption early, building on it for 15 minutes, then forcing the user to unwind a chain of
changes.

### Step 1: Research (if `use_subagents_for_research` is true)

**Purpose:** Understand the existing codebase before proposing changes. Prevents the classic
failure of assuming something does not exist when it does, or reimplementing something that is
already built.

**What Claude Code does:**
1. Spawn a subagent to search the codebase for relevant files, patterns, and existing implementations
2. The subagent writes findings to `research_output` (default: `.ralph/research.md`)
3. Only the summary returns to the main context — the full file reads stay in the subagent's
   isolated context window, saving the main session's tokens

**What the subagent prompt looks like internally:**
> "Search the codebase for all files related to [TOPIC]. Document: file paths, key functions/classes,
> how they connect, any existing tests. Write findings to `.ralph/research.md`. Be thorough."

### Step 2: Plan

**Purpose:** Create a written, inspectable, editable plan BEFORE writing any code. The plan is a
contract between the user and Claude Code. It prevents scope creep and makes the iteration loop
predictable.

**What Claude Code does:**
1. Read `research_output` (if it exists) for codebase context
2. Create or update `plan_file` (default: `plan.md`) with this structure:

```markdown
# Task Plan

## Objective
[One sentence describing what we are building/fixing]

## Tasks
- [ ] Task 1: [specific, atomic action with file path]
- [ ] Task 2: [specific, atomic action with file path]
- [ ] Task 3: [specific, atomic action with file path]

## Verification
- Test: [test_command from settings]
- Lint: [lint_command from settings]
- Type: [typecheck_command from settings]
- Build: [build_command from settings]

## Notes
[Any constraints, gotchas, or decisions captured during planning]
```

3. Present the plan to the user for review
4. **Do NOT implement anything until the user approves the plan** — this is critical

**What the user does:** Reviews the plan. Adds inline notes, corrections, or constraints. Tells
Claude Code to update the plan if needed. When satisfied, gives the go-ahead to implement.

### Step 3: Execute (one task at a time)

**Purpose:** Implement the plan systematically, with verification after each task, so that errors
are caught immediately and progress is committed incrementally.

**What Claude Code does for each task in the plan:**
1. Read the plan file to identify the next incomplete task
2. Search the relevant files (prefer subagents if `use_subagents_for_research` is true)
3. Implement the single task
4. Run all test gates (Section 3)
5. If gates pass AND `auto_commit_on_pass` is true: commit with message
   `[commit_message_prefix] Task N: [description]`
6. Mark the task as done in the plan file: `- [x] Task 1: ...`
7. Append a one-line entry to `progress_log`:
   `[YYYY-MM-DD HH:MM] ✅ Task 1: [description] — all gates passed`
8. Move to the next task

**If a gate fails:**
1. Read the error output carefully
2. Fix the issue
3. Re-run the failing gate
4. If fixed, continue. If stuck after 2-3 attempts, document the blocker in the plan file
   under a `## Blockers` section and notify the user

### Step 4: Handover (when rotating sessions)

**Purpose:** When context usage approaches `context_rotation_pct`, preserve state so the next
session can resume without re-discovering everything.

**What Claude Code does:**
1. Ensure all passing work is committed
2. Update the plan file with current status (which tasks done, which remain)
3. Write a handover entry to `progress_log`:
   ```
   [YYYY-MM-DD HH:MM] 🔄 Session handover
   Completed: Tasks 1-3
   Remaining: Tasks 4-5
   Current state: All gates passing. Task 4 requires changes to src/auth/middleware.ts.
   Blockers: None
   ```
4. Tell the user: "Context is getting heavy. I recommend starting a fresh session. The plan and
   progress log are up to date — the next session will pick up at Task 4."

---

## 3. Test Gate Protocol

This section defines how verification gates run. Claude Code follows this protocol after EVERY
code change, no exceptions.

### Gate execution order

```
1. test_command        → "Does the code work?"
2. lint_command        → "Does the code follow style rules?"
3. typecheck_command   → "Are the types correct?"
4. build_command       → "Does it compile/bundle?"
5. custom_gate_command → "Any project-specific check?"
```

### Gate rules

- Skip any gate whose command is set to `""` in the settings block
- If a gate fails, fix the issue and re-run THAT gate before proceeding to the next
- After fixing, re-run ALL previous gates too (a lint fix might break a test)
- Never modify test assertions, lint configs, or type definitions to force gates to pass —
  that is reward hacking and defeats the purpose
- Never disable or skip a gate without explicit user approval
- If a gate command is not available (e.g., no test runner installed), tell the user and
  suggest what to install, but do NOT silently skip it

### Commit protocol (when `auto_commit_on_pass` is true)

After ALL gates pass for a completed task:
```bash
git add -A
git commit -m "[commit_message_prefix] Task N: [short description of what changed]"
```

The commit creates a checkpoint. If a later task goes wrong, the user can `git reset --hard`
to this commit and lose only the failed work, not everything.

---

## 4. The Lite Loop Script

This bash script automates the mini-Ralph pattern for headless/scripted runs. The user runs it
from their terminal (WSL, macOS, Linux). It is NOT required for interactive use — the principles
above apply whether Claude Code runs interactively or via this script.

### Purpose

The lite loop runs `claude -p` in a bounded loop (default: 3 iterations). Each iteration gets
a fresh context window. Between iterations, the script runs the test gates. If all gates pass,
it stops early. If not, the next iteration inherits the modified codebase and tries again.

### The script: `lite-loop.sh`

```bash
#!/usr/bin/env bash
# lite-loop.sh — Mini-Ralph iteration loop for Claude Code on Max subscription
# Usage: ./lite-loop.sh "Your task description here" [max_iterations]
set -euo pipefail

# --- Read settings (or use defaults) ---
TASK="${1:?Usage: ./lite-loop.sh \"task description\" [max_iterations]}"
MAX="${2:-3}"
TEST_CMD="${MINI_RALPH_TEST:-npm test}"
LINT_CMD="${MINI_RALPH_LINT:-npm run lint}"
TYPE_CMD="${MINI_RALPH_TYPECHECK:-}"
BUILD_CMD="${MINI_RALPH_BUILD:-}"
CUSTOM_CMD="${MINI_RALPH_CUSTOM:-}"
ALLOWED="${MINI_RALPH_TOOLS:-Read,Write,Edit,Bash,Glob,Grep}"
MAX_TURNS="${MINI_RALPH_TURNS:-10}"
COMMIT_PREFIX="${MINI_RALPH_PREFIX:-[mini-ralph]}"
KILLSWITCH="${MINI_RALPH_KILLSWITCH:-.ralph/KILLSWITCH}"
LOG_DIR=".ralph"
LOG_FILE="$LOG_DIR/lite-loop-$(date +%Y%m%d-%H%M%S).log"

mkdir -p "$LOG_DIR"

# --- Preflight ---
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  echo "❌ Must run inside a git repository." | tee -a "$LOG_FILE"
  exit 1
fi

if [ -f "$KILLSWITCH" ]; then
  echo "🛑 Killswitch detected ($KILLSWITCH exists). Aborting." | tee -a "$LOG_FILE"
  echo "   Remove it to resume: rm $KILLSWITCH"
  exit 1
fi

CHECKPOINT=$(git rev-parse HEAD)
echo "📌 Checkpoint: $CHECKPOINT" | tee -a "$LOG_FILE"
echo "📋 Task: $TASK" | tee -a "$LOG_FILE"
echo "🔄 Max iterations: $MAX" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# --- Gate runner ---
run_gates() {
  local failed=0
  for cmd_pair in "test:$TEST_CMD" "lint:$LINT_CMD" "typecheck:$TYPE_CMD" "build:$BUILD_CMD" "custom:$CUSTOM_CMD"; do
    local name="${cmd_pair%%:*}"
    local cmd="${cmd_pair#*:}"
    if [ -n "$cmd" ]; then
      echo "  🔍 Running $name gate: $cmd" | tee -a "$LOG_FILE"
      if eval "$cmd" >> "$LOG_FILE" 2>&1; then
        echo "  ✅ $name passed" | tee -a "$LOG_FILE"
      else
        echo "  ❌ $name FAILED" | tee -a "$LOG_FILE"
        failed=1
      fi
    fi
  done
  return $failed
}

# --- Main loop ---
for i in $(seq 1 "$MAX"); do
  # Killswitch check — exit cleanly if file appeared mid-loop
  if [ -f "$KILLSWITCH" ]; then
    echo "" | tee -a "$LOG_FILE"
    echo "🛑 Killswitch detected at iteration $i. Stopping." | tee -a "$LOG_FILE"
    echo "   Work from prior iterations is preserved in git." | tee -a "$LOG_FILE"
    echo "   Remove killswitch to resume: rm $KILLSWITCH" | tee -a "$LOG_FILE"
    echo "[$(date '+%Y-%m-%d %H:%M')] 🛑 $TASK — killswitch at iteration $i" >> "$LOG_DIR/progress.log"
    exit 1
  fi

  echo "════════════════════════════════════════" | tee -a "$LOG_FILE"
  echo "  Iteration $i / $MAX — $(date '+%H:%M:%S')" | tee -a "$LOG_FILE"
  echo "════════════════════════════════════════" | tee -a "$LOG_FILE"

  # Run Claude Code headlessly with the task
  claude -p "$TASK. Read plan.md if it exists for context. Implement the next incomplete task only. Run verification after changes." \
    --allowedTools "$ALLOWED" \
    --max-turns "$MAX_TURNS" \
    2>&1 | tee -a "$LOG_FILE"

  echo "" | tee -a "$LOG_FILE"
  echo "  Running test gates..." | tee -a "$LOG_FILE"

  if run_gates; then
    echo "" | tee -a "$LOG_FILE"
    echo "✅ All gates passed on iteration $i!" | tee -a "$LOG_FILE"

    # Auto-commit
    if [ -n "$(git status --porcelain)" ]; then
      git add -A
      git commit -m "$COMMIT_PREFIX Completed: $TASK (iteration $i)"
      echo "📦 Committed." | tee -a "$LOG_FILE"
    fi

    # Log progress
    echo "[$(date '+%Y-%m-%d %H:%M')] ✅ $TASK — passed on iteration $i" >> "$LOG_DIR/progress.log"
    exit 0
  fi

  echo "  ⚠️ Gates failed. Next iteration will attempt fixes." | tee -a "$LOG_FILE"
  sleep 2
done

echo "" | tee -a "$LOG_FILE"
echo "❌ Max iterations ($MAX) reached. Review manually." | tee -a "$LOG_FILE"
echo "💡 To revert: git reset --hard $CHECKPOINT" | tee -a "$LOG_FILE"
echo "[$(date '+%Y-%m-%d %H:%M')] ❌ $TASK — failed after $MAX iterations" >> "$LOG_DIR/progress.log"
exit 1
```

### Environment variable overrides

Set these in your shell profile or per-project `.envrc` to configure the script without editing it:

```bash
# Example: Salesforce project overrides
export MINI_RALPH_TEST="sf apex run test --synchronous --result-format human"
export MINI_RALPH_LINT="sf scanner run --target ./force-app --format table"
export MINI_RALPH_TYPECHECK=""
export MINI_RALPH_BUILD=""
export MINI_RALPH_CUSTOM="sf project deploy start --dry-run --source-dir force-app"
export MINI_RALPH_TURNS=15
export MINI_RALPH_PREFIX="[sf-ralph]"

# Example: WordPress project overrides
export MINI_RALPH_TEST="vendor/bin/phpunit"
export MINI_RALPH_LINT="vendor/bin/phpcs --standard=WordPress"
export MINI_RALPH_TYPECHECK=""
export MINI_RALPH_BUILD=""
export MINI_RALPH_CUSTOM=""
export MINI_RALPH_PREFIX="[wp-ralph]"

# Example: Node/React project overrides
export MINI_RALPH_TEST="npm test"
export MINI_RALPH_LINT="npm run lint"
export MINI_RALPH_TYPECHECK="npx tsc --noEmit"
export MINI_RALPH_BUILD="npm run build"
export MINI_RALPH_CUSTOM=""
export MINI_RALPH_PREFIX="[mini-ralph]"
```

### Usage examples

```bash
# Basic — uses defaults from env vars or built-in fallbacks
./lite-loop.sh "Fix all TypeScript errors in src/components/"

# With custom iteration count
./lite-loop.sh "Add input validation to all API endpoints" 5

# Quick one-off override
MINI_RALPH_TEST="pytest" MINI_RALPH_LINT="ruff check ." ./lite-loop.sh "Fix failing tests"
```

---

## 5. Interactive Session Best Practices

When NOT using the lite loop script — i.e., working interactively in a normal Claude Code
session — these rules still apply. Claude Code should follow them automatically when this
guide is loaded.

### Starting a session

1. **Check the toggle state.** Determine whether mini-Ralph is active by following the priority
   rules in the Killswitch and On/Off Toggle section above. If inactive, skip all mini-Ralph
   behavior and operate as standard Claude Code until the user says "ralph on."
2. **Check for killswitch file** at `killswitch_file` path. If it exists, mini-Ralph is OFF.
   Tell the user: "Mini-Ralph killswitch is active (.ralph/KILLSWITCH exists). Remove it to
   enable mini-Ralph." Then operate as standard Claude Code.
3. **Read the plan file** (if `use_plan_file` is true and the file exists) to understand
   current state before doing anything else
4. **Read the progress log** (if `use_progress_log` is true and the file exists) to see
   what was completed in prior sessions
5. **Check context usage** with `/context` — if this is a resumed session near the rotation
   threshold, suggest starting fresh

### During a session

- **Respond to toggle commands immediately.** If the user says "ralph on", "ralph off", or
  "ralph status" at any point, handle it right away per the toggle rules above. Confirm the
  state change before continuing with the next action.
- **Check for killswitch before each task.** Before starting any new task from the plan, check
  if `killswitch_file` exists. If it appeared mid-session, stop mini-Ralph behavior, tell the
  user, and revert to standard mode.
- **One task at a time.** Complete it. Run gates. Commit. Then move on.
- **Do not read large files into context unnecessarily.** If you need to understand a file's
  structure, use grep/glob first, then read only the relevant sections. If research is needed
  across many files, use a subagent (when `use_subagents_for_research` is true).
- **Prefer targeted edits over full file rewrites.** Replacing an entire 500-line file when
  you only changed 3 lines wastes tokens and increases error risk.
- **When running shell commands,** combine related checks:
  `npm test && npm run lint && npm run typecheck` — not three separate tool calls.
- **Never modify test expectations, lint configs, or type definitions** to make gates pass
  unless the user explicitly asks for it. If a gate seems wrong, ask the user.

### Ending a session

1. Ensure all passing work is committed
2. Update the plan file with current task status
3. Write a handover entry to the progress log (see Section 2, Step 4)
4. Tell the user what was accomplished and what remains

### When to recommend a fresh session

Tell the user to start a new session when ANY of these are true:
- Context usage exceeds `context_rotation_pct` (default: 60%)
- Claude finds itself re-reading files it already processed in this session
- The current task is complete and the next task is unrelated
- The user asks Claude to shift to a completely different area of the codebase

---

## 6. Subagent Usage Protocol

Subagents are Claude Code's built-in mechanism for spawning isolated child sessions. Each
subagent gets its own full context window. Only the result (a summary or a file write) returns
to the parent session.

### When to use subagents

- **Codebase research:** "Find all files related to authentication and document how they connect"
- **Impact analysis:** "Search for all usages of this function and list what would break if we
  change its signature"
- **Documentation generation:** "Read these 10 source files and produce API docs"
- **Large file analysis:** "Read this 2000-line file and summarize its structure"

### When NOT to use subagents

- **Implementation:** Subagents should research and report, not write production code. The main
  session implements based on subagent findings. This keeps the implementation coherent.
- **Trivial lookups:** If you just need to check one file, read it directly. The overhead of
  spawning a subagent (~43K tokens for its own system prompt + CLAUDE.md) is not worth it for
  a single file read.

### Subagent rules

- Always write subagent findings to a file (`research_output` by default) rather than returning
  them as conversation text. This keeps the main context lean.
- When describing a subagent task, be specific: name exact directories to search, what to look
  for, and what format the output should take.

---

## 7. File Structure

When mini-Ralph features are active, these files may exist in the project:

```
project-root/
├── CLAUDE.md                  # Standard Claude Code project config (add a reference to this guide here)
├── MINI_RALPH_GUIDE.md        # This file
├── plan.md                    # Current task plan (created/updated per Section 2)
├── .ralph/                    # Mini-Ralph working directory
│   ├── KILLSWITCH             # Create this file to emergency-stop all loops (touch .ralph/KILLSWITCH)
│   ├── progress.log           # Append-only log of completed tasks across sessions
│   ├── research.md            # Latest subagent research findings
│   └── lite-loop-*.log        # Logs from scripted lite-loop runs
├── lite-loop.sh               # The iteration script (optional, for scripted runs)
└── .gitignore                 # Should include: .ralph/lite-loop-*.log
```

### Recommended .gitignore additions

```gitignore
# Mini-Ralph working files
.ralph/KILLSWITCH
.ralph/lite-loop-*.log
.ralph/research.md
```

### Recommended CLAUDE.md reference

Add this line to your project's CLAUDE.md so Claude Code loads this guide automatically:

```markdown
@MINI_RALPH_GUIDE.md
```

Or, if you place the guide in `.claude/`:

```markdown
@.claude/MINI_RALPH_GUIDE.md
```

---

## 8. Scaling Up for Large Builds

Mini-Ralph's default 3-iteration loop is designed for focused daily tasks. But the same
architecture scales to large application builds — you just need to manage the pacing and
your Max subscription limits.

### The constraint: Max subscription rate limits

On a Max plan, you have a **5-hour rolling usage window** plus a **7-day weekly cap** measured
in compute-hours. A single `claude -p` call with 10 turns on a large codebase can consume a
meaningful chunk of your 5-hour window. Running 30 back-to-back iterations risks hitting the
rate limit mid-loop, which causes the `claude -p` call to fail and the script to exit.

There is no way to predict exactly how many iterations you can run before hitting limits —
it depends on codebase size, how many files Claude reads per iteration, and how much output
it generates. But the community consensus for Max 5x ($100/month) is roughly 50-200 prompts
per 5-hour window for Sonnet-class tasks.

### Strategy: batched execution with review checkpoints

Instead of one massive uninterrupted loop, run in batches of 10-15 iterations with a pause
between each batch. This gives you time to review progress, course-correct the plan, and
avoid blowing through your usage window on a bad trajectory.

### The script: `batch-loop.sh`

```bash
#!/usr/bin/env bash
# batch-loop.sh — Scaled mini-Ralph for large builds with review pauses
# Usage: ./batch-loop.sh "Your task" [total_iterations] [batch_size]
set -euo pipefail

TASK="${1:?Usage: ./batch-loop.sh \"task description\" [total_iterations] [batch_size]}"
TOTAL="${2:-30}"
BATCH="${3:-10}"
TEST_CMD="${MINI_RALPH_TEST:-npm test}"
LINT_CMD="${MINI_RALPH_LINT:-npm run lint}"
TYPE_CMD="${MINI_RALPH_TYPECHECK:-}"
BUILD_CMD="${MINI_RALPH_BUILD:-}"
CUSTOM_CMD="${MINI_RALPH_CUSTOM:-}"
ALLOWED="${MINI_RALPH_TOOLS:-Read,Write,Edit,Bash,Glob,Grep}"
MAX_TURNS="${MINI_RALPH_TURNS:-10}"
COMMIT_PREFIX="${MINI_RALPH_PREFIX:-[mini-ralph]}"
KILLSWITCH="${MINI_RALPH_KILLSWITCH:-.ralph/KILLSWITCH}"
LOG_DIR=".ralph"
LOG_FILE="$LOG_DIR/batch-loop-$(date +%Y%m%d-%H%M%S).log"
PAUSE_BETWEEN_BATCHES="${MINI_RALPH_PAUSE:-true}"

mkdir -p "$LOG_DIR"

# --- Preflight ---
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  echo "❌ Must run inside a git repository." | tee -a "$LOG_FILE"
  exit 1
fi

if [ -f "$KILLSWITCH" ]; then
  echo "🛑 Killswitch detected ($KILLSWITCH exists). Aborting." | tee -a "$LOG_FILE"
  exit 1
fi

CHECKPOINT=$(git rev-parse HEAD)
echo "📌 Checkpoint: $CHECKPOINT" | tee -a "$LOG_FILE"
echo "📋 Task: $TASK" | tee -a "$LOG_FILE"
echo "🔄 Total iterations: $TOTAL (in batches of $BATCH)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# --- Gate runner ---
run_gates() {
  local failed=0
  for cmd_pair in "test:$TEST_CMD" "lint:$LINT_CMD" "typecheck:$TYPE_CMD" "build:$BUILD_CMD" "custom:$CUSTOM_CMD"; do
    local name="${cmd_pair%%:*}"
    local cmd="${cmd_pair#*:}"
    if [ -n "$cmd" ]; then
      echo "  🔍 $name: $cmd" | tee -a "$LOG_FILE"
      if eval "$cmd" >> "$LOG_FILE" 2>&1; then
        echo "  ✅ $name passed" | tee -a "$LOG_FILE"
      else
        echo "  ❌ $name FAILED" | tee -a "$LOG_FILE"
        failed=1
      fi
    fi
  done
  return $failed
}

# --- Completion check ---
check_complete() {
  if [ -f "plan.md" ] && grep -Fq "STATUS: COMPLETE" plan.md 2>/dev/null; then
    return 0
  fi
  return 1
}

# --- Main batched loop ---
iteration=0
batch_num=0

while [ "$iteration" -lt "$TOTAL" ]; do
  batch_num=$((batch_num + 1))
  batch_end=$((iteration + BATCH))
  if [ "$batch_end" -gt "$TOTAL" ]; then
    batch_end="$TOTAL"
  fi

  echo "" | tee -a "$LOG_FILE"
  echo "╔══════════════════════════════════════════════╗" | tee -a "$LOG_FILE"
  echo "║  BATCH $batch_num — iterations $((iteration+1)) to $batch_end" | tee -a "$LOG_FILE"
  echo "╚══════════════════════════════════════════════╝" | tee -a "$LOG_FILE"

  while [ "$iteration" -lt "$batch_end" ]; do
    iteration=$((iteration + 1))

    # Killswitch check
    if [ -f "$KILLSWITCH" ]; then
      echo "" | tee -a "$LOG_FILE"
      echo "🛑 Killswitch detected at iteration $iteration. Stopping." | tee -a "$LOG_FILE"
      echo "[$(date '+%Y-%m-%d %H:%M')] 🛑 Killswitch at iteration $iteration" >> "$LOG_DIR/progress.log"
      exit 1
    fi

    echo "────────────────────────────────────────" | tee -a "$LOG_FILE"
    echo "  Iteration $iteration / $TOTAL — $(date '+%H:%M:%S')" | tee -a "$LOG_FILE"
    echo "────────────────────────────────────────" | tee -a "$LOG_FILE"

    # Run Claude Code headlessly
    claude -p "$TASK. Read plan.md for the full task list. Pick the next incomplete task. Implement it, run verification, mark it done in plan.md, and commit. When ALL tasks are done, write 'STATUS: COMPLETE' at the top of plan.md." \
      --allowedTools "$ALLOWED" \
      --max-turns "$MAX_TURNS" \
      2>&1 | tee -a "$LOG_FILE"

    # Run test gates
    echo "  Running test gates..." | tee -a "$LOG_FILE"
    if run_gates; then
      echo "  ✅ Gates passed" | tee -a "$LOG_FILE"
      if [ -n "$(git status --porcelain)" ]; then
        git add -A
        git commit -m "$COMMIT_PREFIX iteration $iteration: task from plan.md"
        echo "  📦 Committed" | tee -a "$LOG_FILE"
      fi
    else
      echo "  ⚠️ Gates failed — next iteration will attempt fixes" | tee -a "$LOG_FILE"
    fi

    # Check if plan is marked complete
    if check_complete; then
      echo "" | tee -a "$LOG_FILE"
      echo "🎉 Plan marked COMPLETE at iteration $iteration!" | tee -a "$LOG_FILE"
      echo "[$(date '+%Y-%m-%d %H:%M')] 🎉 All tasks complete at iteration $iteration" >> "$LOG_DIR/progress.log"
      exit 0
    fi

    sleep 2
  done

  # --- Batch boundary: pause for review ---
  echo "" | tee -a "$LOG_FILE"
  echo "╔══════════════════════════════════════════════╗" | tee -a "$LOG_FILE"
  echo "║  BATCH $batch_num COMPLETE                            ║" | tee -a "$LOG_FILE"
  echo "║  Completed iterations: $iteration / $TOTAL            " | tee -a "$LOG_FILE"
  echo "╚══════════════════════════════════════════════╝" | tee -a "$LOG_FILE"

  # Show plan.md status
  if [ -f "plan.md" ]; then
    echo "" | tee -a "$LOG_FILE"
    echo "📋 Plan status:" | tee -a "$LOG_FILE"
    grep -E "^\- \[[ x]\]" plan.md 2>/dev/null | tee -a "$LOG_FILE" || echo "  (no task checkboxes found)" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
    done_count=$(grep -c "^\- \[x\]" plan.md 2>/dev/null || echo 0)
    total_count=$(grep -c "^\- \[" plan.md 2>/dev/null || echo 0)
    echo "  Progress: $done_count / $total_count tasks done" | tee -a "$LOG_FILE"
  fi

  # Pause if not at the end and pause is enabled
  if [ "$iteration" -lt "$TOTAL" ] && [ "$PAUSE_BETWEEN_BATCHES" = "true" ]; then
    echo "" | tee -a "$LOG_FILE"
    echo "⏸️  Paused for review. Options:" | tee -a "$LOG_FILE"
    echo "   • Press ENTER to continue to the next batch" | tee -a "$LOG_FILE"
    echo "   • Edit plan.md in another tab to adjust priorities" | tee -a "$LOG_FILE"
    echo "   • Type 'quit' to stop here" | tee -a "$LOG_FILE"
    echo "   • touch $KILLSWITCH in another tab to stop" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
    read -r user_input
    if [ "$user_input" = "quit" ] || [ "$user_input" = "q" ]; then
      echo "👋 Stopped by user after batch $batch_num." | tee -a "$LOG_FILE"
      echo "[$(date '+%Y-%m-%d %H:%M')] ⏹️ Stopped by user after batch $batch_num (iteration $iteration)" >> "$LOG_DIR/progress.log"
      exit 0
    fi
  fi
done

echo "" | tee -a "$LOG_FILE"
echo "❌ All $TOTAL iterations used. Plan not yet complete." | tee -a "$LOG_FILE"
echo "💡 Review plan.md and progress.log, then run again to continue." | tee -a "$LOG_FILE"
echo "💡 To revert everything: git reset --hard $CHECKPOINT" | tee -a "$LOG_FILE"
echo "[$(date '+%Y-%m-%d %H:%M')] ❌ Reached $TOTAL iterations without completion" >> "$LOG_DIR/progress.log"
exit 1
```

### Usage examples for large builds

```bash
# 30 iterations in batches of 10 — pauses after each batch for your review
./batch-loop.sh "Implement all tasks in plan.md" 30 10

# 50 iterations in batches of 15 — for a big application build
./batch-loop.sh "Build the full app per plan.md" 50 15

# No pauses — run all 20 iterations straight through (like full Ralph)
MINI_RALPH_PAUSE=false ./batch-loop.sh "Implement plan.md" 20 20

# With Salesforce overrides
MINI_RALPH_TEST="sf apex run test --synchronous" \
MINI_RALPH_CUSTOM="sf project deploy start --dry-run --source-dir force-app" \
  ./batch-loop.sh "Implement all Apex classes in plan.md" 30 10
```

### How to write plan.md for large builds

For a big application, the plan.md is the most important file. Each task must be atomic enough
for a single headless iteration to complete. This is where you invest your upfront time.

**Good plan structure for a large build:**

```markdown
# Application Build Plan

## Architecture Notes
- Framework: React + TypeScript + Tailwind
- Backend: Node.js + Express + PostgreSQL
- Auth: JWT-based with refresh tokens
- All API routes go in src/api/
- All components go in src/components/

## Phase 1: Foundation
- [ ] Task 1: Initialize project with Vite + React + TypeScript + Tailwind
- [ ] Task 2: Set up Express server with health check endpoint in src/api/server.ts
- [ ] Task 3: Set up PostgreSQL connection pool in src/api/db.ts
- [ ] Task 4: Create database migration runner and initial schema (users table)

## Phase 2: Auth
- [ ] Task 5: Create POST /api/auth/register endpoint with password hashing
- [ ] Task 6: Create POST /api/auth/login endpoint returning JWT
- [ ] Task 7: Create auth middleware that validates JWT on protected routes
- [ ] Task 8: Create React login/register forms with API integration

## Phase 3: Core Features
- [ ] Task 9: ...
...

## Verification
- Test: npm test
- Lint: npm run lint
- Type: npx tsc --noEmit
- Build: npm run build

## Notes
- Use bcrypt for password hashing, not crypto
- JWT secret comes from JWT_SECRET env var
- All API responses use { data, error } envelope pattern
```

**Key rules for plan tasks in large builds:**
- Each task should take one iteration (1-10 agentic turns) to complete
- Tasks should have clear "done" criteria — ideally a test that passes
- Order tasks so each builds on the last (foundation → auth → features)
- Group into phases so batch boundaries align with logical checkpoints
- Include architecture notes at the top so every fresh iteration knows the patterns

### Pacing strategy for Max subscription

The practical approach for large builds on Max:

**Morning batch:** Run 10-15 iterations on Phase 1. Review results over coffee. Fix any
issues the plan didn't account for. Update plan.md.

**Midday batch:** Run another 10-15 iterations on Phase 2. Check progress at lunch. Course-
correct if needed.

**Afternoon batch:** Continue with remaining phases. By end of day, you may have 30-45
iterations of work done — equivalent to a full day of focused coding.

**If you hit rate limits:** The `claude -p` call will fail with an error. The script logs the
failure and moves to the next iteration (which will also fail). The killswitch or `quit` at
the next batch pause stops the loop. Wait for the 5-hour window to roll forward, then resume.
Your work is safe in git — nothing is lost.

**If you want continuous overnight runs:** Set `MINI_RALPH_PAUSE=false` and use a high
iteration count. Be aware this WILL hit Max rate limits eventually. The script does not auto-
retry on rate limit errors — it treats them as iteration failures. For true overnight
autonomous builds, API billing ($0.003-0.01 per iteration on Sonnet) is more reliable than
subscription limits. You can switch between subscription and API by setting
`ANTHROPIC_API_KEY` — when set, Claude Code uses API billing instead of your Max plan.

---

## 9. Quick Reference

### Commands the user runs

| What | Command |
|------|---------|
| **Killswitch ON (stop everything)** | `touch .ralph/KILLSWITCH` |
| **Killswitch OFF (resume)** | `rm .ralph/KILLSWITCH` |
| **Toggle mini-Ralph on mid-chat** | Say `ralph on` to Claude Code |
| **Toggle mini-Ralph off mid-chat** | Say `ralph off` to Claude Code |
| **Check mini-Ralph status** | Say `ralph status` to Claude Code |
| Scripted 3-pass fix loop | `./lite-loop.sh "Fix all lint errors"` |
| Scripted 5-pass feature build | `./lite-loop.sh "Implement JWT auth per plan.md" 5` |
| **Large build: 30 iters, batches of 10** | `./batch-loop.sh "Implement plan.md" 30 10` |
| **Large build: no pauses** | `MINI_RALPH_PAUSE=false ./batch-loop.sh "Implement plan.md" 30 30` |
| One-shot headless task | `claude -p "Add error handling to src/api.ts" --max-turns 5` |
| Pipe input to Claude | `git diff HEAD~1 \| claude -p "Review this diff for bugs"` |
| Check context usage | `/context` (inside interactive session) |
| Check subscription usage | `/usage` (inside interactive session) |
| Compact context early | `/compact Focus on current task and plan.md` |
| Start fresh session | `claude` (new terminal, or `/clear` then re-prompt) |
| Resume named session | `claude --resume` |

### Rules Claude Code always follows when this guide is loaded

0. **Check toggle state first.** If mini-Ralph is inactive (toggle off, killswitch present, or
   `mini_ralph_active: false` with no "ralph on"), skip rules 1–12 and operate as standard Claude Code.
   Always respond to "ralph on", "ralph off", and "ralph status" regardless of current state.
1. Check for killswitch file before every new task — halt if present
2. Read plan.md and progress.log at session start (if they exist)
3. One task at a time — break multi-part requests into a sequence
4. Run ALL non-empty test gates after every code change
5. Never commit code that fails a gate
6. Never modify tests/lint configs/types to force gates to pass
7. Commit after each verified task (if `auto_commit_on_pass` is true)
8. Update plan.md and progress.log after each task
9. Recommend fresh sessions when context exceeds `context_rotation_pct`
10. Use subagents for research, not implementation
11. Write handover notes before session rotation
12. If the user says "ralph off" at any point, immediately deactivate and confirm
