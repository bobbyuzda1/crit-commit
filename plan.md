# Crit Commit Implementation Plan

> **INSTRUCTIONS FOR AUTONOMOUS LOOP:** Read this file at the start of every iteration. Find the next task with unchecked `- [ ]` steps. Implement ONLY that task. Run all verification gates after changes. Mark completed steps as `- [x]`. Commit. Exit.

> **VERIFICATION GATES (run ALL after every task):**
> ```
> npm run lint && npm run typecheck && npm run build && npm test
> ```
> If a gate fails, fix it before committing. Do NOT skip gates.

> **IMPORTANT:** Read CLAUDE.md for project context. Read the full spec at docs/superpowers/specs/2026-03-15-crit-commit-design.md when you need design details.

**Goal:** Build Crit Commit: A Claude Code RPG — complete working MVP.

**Architecture:** Node.js scanner (JSONL watcher + HTTP/WS server) + Game engine (progression, Stackjack, Claude integration) + PixiJS web UI. TypeScript monorepo with npm workspaces.

**Tech Stack:** TypeScript 5, Node.js 20, PixiJS 8, Express, ws, chokidar, Vite, Vitest, ESLint 9 flat config.

---

Find the detailed implementation instructions for each task in:
`docs/superpowers/plans/2026-03-15-crit-commit-implementation.md`

Each task below has a number matching the detailed plan. Read the corresponding task section in that file for full instructions including file paths, code examples, and test specifications.

---

## Tasks

- [x] Task 1: Initialize git repo, monorepo, and toolchain
- [x] Task 2: Create all workspace packages with correct dependencies
- [x] Task 3: Define shared TypeScript types
- [x] Task 4: Create starter game state, card data, and NPC decks
- [x] Task 5: Write tests for shared data
- [x] Task 6: JSONL parser with metadata extraction and security filtering
- [x] Task 7: Event accumulator
- [x] Task 8: Micro-quest engine
- [x] Task 9: File watcher for JSONL transcripts
- [x] Task 10: Game state persistence manager
- [x] Task 11: HTTP server and WebSocket
- [x] Task 12: Prompt builder for Claude game engine
- [x] Task 13: Response parser and Claude invoker
- [x] Task 14: Progression engine — XP, leveling, crits, drops
- [x] Task 15: Party manager — terminal companions and sub-agent summons
- [x] Task 16: Zone manager — zone generation triggers and limits
- [x] Task 17: Stackjack core engine — match loop and basic cards
- [x] Task 18: Stackjack special cards and NPC AI
- [x] Task 19: Game engine barrel exports
- [x] Task 20: Scanner orchestrator — wire everything together
- [x] Task 21: CLI scaffold and start/status commands
- [ ] Task 22: First-run flow and character creation
- [ ] Task 23: Reset and repair commands
- [ ] Task 24: Vite + PixiJS project setup
- [ ] Task 25: WebSocket client and game state store
- [ ] Task 26: Dashboard — quest log, event feed, stats
- [ ] Task 27: Game canvas — base camp scene and character sprites
- [ ] Task 28: Crit animation and particle effects
- [ ] Task 29: Stackjack UI
- [ ] Task 30: Modal, settings, footer, and coffee shop
- [ ] Task 31: Zone choice UI and world map
- [ ] Task 32: End-to-end integration wiring
- [ ] Task 33: README and game documentation
- [ ] Task 34: Community submission schema and GitHub Actions
- [ ] Task 35: Final build verification

---

When ALL tasks above are checked off, add the text STATUS: COMPLETE as the very first line of this file (before everything else).
