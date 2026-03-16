# Recommendations for Improvement — Full Ralph Mode

> **Living document.** Updated periodically based on observations from real Ralph builds. Last updated: 2026-03-16.

---

## Build Stats (Crit Commit — Session 1 + 2)

| Metric | Value |
|--------|-------|
| Total tasks | 35 |
| Completed (so far) | 20 |
| Total iterations used | ~38 (13 session 1 + 25 session 2) |
| Iterations per task (avg) | ~1.9 |
| Max turns hit | ~14 times |
| Stall escalations (Sonnet→Opus) | 2 (Task 2, Task 18) |
| Wasted iterations (questions/menus) | ~5 |
| Credit exhaustion | 1 (session 1 stopped at iteration 13) |

---

## Issue 1: Wasted Iterations on Clarifying Questions

**What happened:** On multiple iterations, Claude asked clarifying questions instead of building (e.g., "Which watch path priority order?", "Where should I create worktrees?"). In headless mode there's no one to answer, so the entire iteration was wasted.

**Also observed:** Claude sometimes presented menus like "Implementation complete. What would you like to do? 1. Merge back to main 2. Push and create a PR 3. Keep the branch..." — another wasted iteration.

**Root cause:** The prompt didn't explicitly say "never ask questions." The superpowers plugin's skills (worktrees, executing-plans) inject interactive prompts that assume a human is present.

**Recommendation:**
- Add explicit instruction to the prompt: `"You are running in HEADLESS MODE — there is NO human to answer questions. NEVER ask clarifying questions. NEVER present menus or options. Make your best judgment and keep building."`
- Consider disabling interactive plugins/skills during Ralph runs if possible
- The prompt was updated mid-build but only took effect on restart

**Impact:** ~5 wasted iterations = ~$3-10 in API costs and ~15 minutes lost.

---

## Issue 2: Max Turns Too Low Initially

**What happened:** Started with 15 max turns. Task 1 (create 16+ files for monorepo foundation) could not complete in 15 turns. Failed 6 times across two models before we increased to 40.

**Root cause:** Each iteration spends 5-8 turns just reading the plan.md and implementation doc before writing any code. A 15-turn limit leaves only 7-10 turns for actual work — not enough for large tasks.

**Recommendation:**
- **Default to 40 max turns.** The cost increase is negligible (unused turns cost nothing) and it prevents stalls on large tasks.
- For very large tasks (monorepo init, complex integration), consider 50-60 turns.
- The plan document itself should note recommended max turns per task if a task is known to be large.
- Consider adding a `<!-- max-turns: 50 -->` hint in plan.md that the loop script can parse per-task.

**Impact:** 6 wasted iterations on Task 1 alone = ~$5-15 and ~30 minutes lost.

---

## Issue 3: Foundation Tasks Are Disproportionately Expensive

**What happened:** Tasks 1-4 (monorepo setup, package creation, type definitions, data files) consumed 12 iterations for 4 tasks (3 iterations/task average). Tasks 5-20 averaged ~1.5 iterations/task.

**Root cause:** Foundation tasks create many files and require npm install (slow on WSL/Windows mount). They also require reading the full plan + spec on every iteration (high token cost). Later tasks are more focused and build on existing code.

**Recommendation:**
- **Pre-create the monorepo skeleton manually** before launching Ralph. Let Ralph handle the actual implementation code, not boilerplate config files (package.json, tsconfig, eslint, etc.).
- Alternatively, create a **Task 0 that's run once manually** with full interactive Claude Code, not in the Ralph loop. Then Ralph starts at the first real implementation task.
- Keep foundation tasks minimal: one task for the entire scaffolding, not split across multiple tasks.

**Impact:** Would save ~6-8 iterations and ~$10-20 if foundation was pre-built.

---

## Issue 4: Plan + Spec Documents Are Large (Token Overhead)

**What happened:** Every iteration, Claude reads plan.md (~3K tokens) and the detailed implementation doc (~15K tokens). That's ~18K input tokens consumed before any work starts — on every single iteration.

**Root cause:** The prompt says "Read plan.md... Read docs/superpowers/plans/..." which causes Claude to read both files fully every time.

**Recommendation:**
- **Slim down plan.md** to just the checklist. Move detailed instructions into per-task files (e.g., `tasks/task-06.md`) so Claude only reads the one it needs.
- Alternatively, restructure the prompt: "Read plan.md to find the next unchecked task number. Then read ONLY the section for that task number in the detailed plan."
- Consider a two-phase approach per iteration: (1) quick scan of plan.md to find next task, (2) read only that task's section.

**Impact:** Could reduce per-iteration token cost by 30-50%, saving ~$10-20 across a full 35-task build.

---

## Issue 5: WSL/Windows Filesystem Permission Issues

**What happened:** Iteration 2 reported "Operation not permitted" errors for git config and npm chmod operations on the `/mnt/c/` mount. This wasted an entire iteration.

**Root cause:** WSL 2's 9P protocol for `/mnt/c/` has permission limitations. Git and npm sometimes try to chmod files, which fails on Windows mounts.

**Recommendation:**
- **Run Ralph builds on the Linux filesystem** (`/home/user/project/`) not on `/mnt/c/`. File operations are 5-10x faster and have no permission issues.
- If the project must live on `/mnt/c/`, add to CLAUDE.md: "This project is on a Windows filesystem mount. Do not use chmod. Use `git config core.fileMode false` to prevent git permission errors."
- The build eventually worked despite this, but it caused unnecessary retries.

**Impact:** 1-2 wasted iterations and potential intermittent failures.

---

## Issue 6: Stall Detection Works But Is Slow

**What happened:** Task 18 (Stackjack special cards + NPC AI) failed 3 times on Sonnet before escalating to Opus. Opus completed it in one iteration. That's 3 wasted Sonnet iterations.

**Root cause:** The stall threshold is set to 3 failures before escalating. For complex game logic tasks, Sonnet may never succeed regardless of retries — those tokens are wasted.

**Recommendation:**
- **Reduce stall threshold to 2** for tasks that are clearly complex (game engines, integration wiring).
- Better yet, **pre-tag more tasks for Opus** in the script. The current list (12, 13, 20, 27, 32, 33) missed Task 18 (Stackjack special cards) which was equally complex.
- Consider a heuristic: if a task mentions "special cards," "NPC AI," "card effects," "integration," or "wiring" in its title, default to Opus.

**Impact:** Would save 1-2 iterations per stall = ~$1-3 each.

---

## Issue 7: Credit Exhaustion Mid-Build

**What happened:** The first session ran out of API credits at iteration 13, stopping the build overnight. Had to add credits and restart the next morning.

**Recommendation:**
- **Pre-calculate estimated cost** before launching: (iterations × avg tokens per iteration × price per token). For Crit Commit, ~60 iterations × ~50K tokens avg × mixed Sonnet/Opus pricing ≈ $50-100.
- **Load 2x the estimate** to account for retries and stalls.
- Add a **cost tracking feature** to ralph-loop.sh: after each iteration, log the estimated cost (based on model used and approximate tokens).
- Consider adding a **budget limit** to the loop script that stops before exceeding a set dollar amount.

**Impact:** Prevents overnight build interruptions. Critical for fire-and-forget runs.

---

## Issue 8: Opus Is Dramatically More Efficient for Complex Tasks

**What happened:**
- Task 2: Sonnet failed 3x, Opus completed in 1 iteration
- Task 12 (prompt builder): Opus completed in 1 iteration, clean
- Task 13 (response parser): Opus completed in 1 iteration, clean
- Task 18: Sonnet failed 3x, Opus completed in 1 iteration
- Task 20 (orchestrator): Opus completed in 1 iteration, clean

Every Opus task completed on the first try. Sonnet tasks averaged ~1.5 iterations.

**Recommendation:**
- For overnight builds where time matters more than cost, **consider running all tasks on Opus**. The higher per-token cost is offset by fewer wasted iterations.
- For budget-conscious builds, keep the hybrid approach but **expand the Opus task list** to include any task involving: complex logic, integration wiring, game engines, or creative content.
- Track a "Sonnet success rate" metric. If it drops below 60% for a project type, switch to all-Opus.

**Impact:** All-Opus would roughly double the API cost but could cut total iterations by 30-40%.

---

## Summary: Quick Reference Settings

| Setting | First Attempt | Recommended |
|---------|--------------|-------------|
| Max turns per iteration | 15 | **40-50** |
| Max iterations | 50 | **2x task count** (e.g., 70 for 35 tasks) |
| Stall threshold | 3 | **2** |
| Opus tasks | 6 pre-tagged | **Pre-tag all complex tasks + reduce stall threshold** |
| Prompt | Basic | **Add "HEADLESS MODE, never ask questions, never present menus"** |
| Filesystem | /mnt/c/ (Windows mount) | **/home/user/ (Linux native)** |
| API credits | Load exact estimate | **Load 2x estimate** |
| Plan document | Single large file | **Consider per-task files to reduce token overhead** |
| Foundation tasks | In the Ralph loop | **Pre-build manually, let Ralph do implementation only** |
