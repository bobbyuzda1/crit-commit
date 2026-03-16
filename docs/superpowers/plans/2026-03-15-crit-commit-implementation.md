# Crit Commit Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Crit Commit: A Claude Code RPG — a complete working MVP with Node.js scanner, Claude-powered game engine, PixiJS web UI, Stackjack card game, and CLI tooling.

**Architecture:** Three-piece system — (1) Node.js scanner watches JSONL transcripts and extracts metadata, serves web UI over HTTP+WebSocket, invokes `claude -p` for game engine calls; (2) Game engine logic manages state, progression, and prompts for Claude; (3) PixiJS browser app renders pixel art world, dashboard, and Stackjack. All TypeScript, monorepo with npm workspaces.

**Tech Stack:** TypeScript 5, Node.js 20, PixiJS 8, Express, ws (WebSocket), chokidar (file watching), Vite (web UI build), Vitest (testing), ESLint 9 (flat config), npm workspaces monorepo.

**Spec document:** `docs/superpowers/specs/2026-03-15-crit-commit-design.md`

**Important notes for the build loop:**
- Run ALL four test gates after EVERY task: `npm run lint && npm run typecheck && npm run build && npm test`
- If a gate fails, fix it before committing. Do not skip gates.
- The Labs page (uzdavines.ai) is NOT in this plan — it is a separate repo and will have its own plan.
- All packages that import from `@crit-commit/shared` must list it as a workspace dependency.
- The web-ui package uses Vite (not tsc) for builds and is excluded from `tsc -b` project references.

---

## Verification Commands

```bash
# Test gates — run ALL of these after EVERY task
npm run lint          # ESLint 9 flat config across all packages
npm run typecheck     # tsc -b (shared, scanner, game-engine, cli only — NOT web-ui)
npm run build         # Build all packages (tsc for node packages, vite for web-ui)
npm test              # Vitest across all packages
```

---

## Chunk 1: Foundation & Shared Types

### Task 1: Initialize git repo, monorepo, and toolchain

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `tsconfig.json`
- Create: `eslint.config.js`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `LICENSE`
- Create: `CLAUDE.md`

- [ ] **Step 1: Initialize git repo**

```bash
git init
git config core.autocrlf input
```

- [ ] **Step 2: Create root package.json**

```json
{
  "name": "crit-commit",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "workspaces": ["packages/*"],
  "scripts": {
    "lint": "eslint .",
    "typecheck": "tsc -b packages/shared packages/scanner packages/game-engine packages/cli",
    "build": "npm run build --workspaces --if-present",
    "test": "vitest run --reporter=verbose",
    "dev": "npm run dev --workspace=packages/scanner"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "eslint": "^9.0.0",
    "typescript": "^5.6.0",
    "typescript-eslint": "^8.0.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 3: Create tsconfig.base.json with composite flag**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

- [ ] **Step 4: Create root tsconfig.json with project references (excludes web-ui)**

```json
{
  "files": [],
  "references": [
    { "path": "packages/shared" },
    { "path": "packages/scanner" },
    { "path": "packages/game-engine" },
    { "path": "packages/cli" }
  ]
}
```

- [ ] **Step 5: Create ESLint 9 flat config**

`eslint.config.js`:
```javascript
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "packages/web-ui/**"] },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-console": "warn",
    },
  }
);
```

- [ ] **Step 6: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/src/**/*.test.ts"],
    globals: true,
  },
});
```

- [ ] **Step 7: Create .gitignore and LICENSE**

`.gitignore`:
```
node_modules/
dist/
*.js.map
.env
.DS_Store
*.tsbuildinfo
```

`LICENSE`: MIT license, Copyright 2026 Bobby Uzdavines.

- [ ] **Step 8: Create CLAUDE.md**

Project context file for the Ralph loop and future Claude Code sessions. Include: project name, monorepo structure (5 packages: shared, scanner, game-engine, web-ui, cli), tech stack, verification commands, key architectural decisions (scanner watches JSONL, invokes claude -p, serves web UI via HTTP+WebSocket), inter-package dependency notes, and pointer to the spec document.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: initialize git repo, monorepo toolchain, and CLAUDE.md"
```

---

### Task 2: Create all workspace packages with correct dependencies

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts` (empty placeholder)
- Create: `packages/scanner/package.json`
- Create: `packages/scanner/tsconfig.json`
- Create: `packages/scanner/src/index.ts` (empty placeholder)
- Create: `packages/game-engine/package.json`
- Create: `packages/game-engine/tsconfig.json`
- Create: `packages/game-engine/src/index.ts` (empty placeholder)
- Create: `packages/web-ui/package.json`
- Create: `packages/web-ui/tsconfig.json`
- Create: `packages/web-ui/src/main.ts` (empty placeholder)
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`
- Create: `packages/cli/src/index.ts` (empty placeholder)

- [ ] **Step 1: Create shared package**

`packages/shared/package.json`:
```json
{
  "name": "@crit-commit/shared",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": { "build": "tsc -b" },
  "devDependencies": { "typescript": "^5.6.0" }
}
```

`packages/shared/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

Create `packages/shared/src/index.ts` with `export {};`

- [ ] **Step 2: Create scanner package (depends on shared and game-engine)**

`packages/scanner/package.json`:
```json
{
  "name": "@crit-commit/scanner",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": { "build": "tsc -b" },
  "dependencies": {
    "@crit-commit/shared": "*",
    "@crit-commit/game-engine": "*",
    "chokidar": "^4.0.0",
    "express": "^5.0.0",
    "ws": "^8.0.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/ws": "^8.0.0",
    "typescript": "^5.6.0"
  }
}
```

`packages/scanner/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"],
  "references": [
    { "path": "../shared" },
    { "path": "../game-engine" }
  ]
}
```

Create `packages/scanner/src/index.ts` with `export {};`

- [ ] **Step 3: Create game-engine package (depends on shared)**

`packages/game-engine/package.json`:
```json
{
  "name": "@crit-commit/game-engine",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": { "build": "tsc -b" },
  "dependencies": { "@crit-commit/shared": "*" },
  "devDependencies": { "typescript": "^5.6.0" }
}
```

`packages/game-engine/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"],
  "references": [{ "path": "../shared" }]
}
```

Create `packages/game-engine/src/index.ts` with `export {};`

- [ ] **Step 4: Create web-ui package (Vite, no tsc build)**

`packages/web-ui/package.json`:
```json
{
  "name": "@crit-commit/web-ui",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build": "vite build",
    "dev": "vite"
  },
  "dependencies": { "pixi.js": "^8.0.0" },
  "devDependencies": { "vite": "^6.0.0", "typescript": "^5.6.0" }
}
```

`packages/web-ui/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "noEmit": true,
    "composite": false,
    "module": "ESNext",
    "moduleResolution": "bundler"
  },
  "include": ["src"]
}
```

Create `packages/web-ui/src/main.ts` with `console.log("Crit Commit Web UI");`

- [ ] **Step 5: Create cli package (depends on shared, scanner)**

`packages/cli/package.json`:
```json
{
  "name": "@crit-commit/cli",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "bin": { "crit-commit": "dist/index.js" },
  "scripts": { "build": "tsc -b" },
  "dependencies": {
    "@crit-commit/shared": "*",
    "@crit-commit/scanner": "*",
    "commander": "^13.0.0",
    "chalk": "^5.0.0"
  },
  "devDependencies": { "typescript": "^5.6.0" }
}
```

`packages/cli/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"],
  "references": [
    { "path": "../shared" },
    { "path": "../scanner" }
  ]
}
```

Create `packages/cli/src/index.ts` with `#!/usr/bin/env node\nexport {};`

- [ ] **Step 6: Run npm install and verify all gates**

```bash
npm install
npm run typecheck   # should pass (empty source files)
npm run lint        # should pass
npm run build       # tsc builds + vite build (vite will produce minimal output)
npm test            # no tests yet, should pass with 0 tests
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: create all workspace packages with dependencies and configs"
```

---

### Task 3: Define shared TypeScript types

**Files:**
- Create: `packages/shared/src/types/game-state.ts`
- Create: `packages/shared/src/types/events.ts`
- Create: `packages/shared/src/types/messages.ts`
- Create: `packages/shared/src/types/cards.ts`
- Create: `packages/shared/src/constants.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Create game-state.ts**

Define all interfaces: `GameState`, `Character`, `CharacterClass`, `PartyMember`, `InventoryItem`, `ItemRarity`, `Materia`, `MateriaType`, `QuestState`, `Quest`, `Zone`, `StackjackNPC`, `StackjackState`, `StackjackCard`, `CardType`, `EquippedGear`, `GameStats`, `NarrativeState`, `Encounter`, `NarrativeEvent`, `ZoneChoice`. Use the exact type definitions from the spec's batch payload example and the shared types created during design. All exported.

- [ ] **Step 2: Create events.ts**

Define: `BatchedEvents`, `CodingEventSummary`, `TerminalSummary`, `ScannerEvent`, `MicroQuestTrigger`. These are the types the scanner produces and the game engine consumes.

- [ ] **Step 3: Create messages.ts**

Define discriminated unions: `ServerMessage` (state_update, event_feed, crit_trigger, encounter_update, status, stackjack_update) and `ClientMessage` (equip_materia, equip_gear, zone_choice, update_settings, stackjack_action, request_state). Plus `PlayerSettings` (which includes `watchPaths: string[]` for multi-user JSONL directory monitoring and `batchIntervalMinutes: number`), `StackjackMatchState`, `StackjackAction`.

- [ ] **Step 4: Create cards.ts**

Define `createCard` helper function and `BASE_CARD_CATALOG` array with all card types: plus 1-5, minus 1-5, flip 1-3, fork, null, rebase, merge, recursive, crit card, overflow. Each with id, name, type, rarity, description, and value where applicable.

- [ ] **Step 5: Create constants.ts**

All game constants: `SCHEMA_VERSION`, `DEFAULT_BATCH_INTERVAL_MINUTES` (5), `DEFAULT_HTTP_PORT` (3333), `MAX_MICRO_QUESTS` (3), `MAX_SESSION_QUESTS` (2), `MAX_ACTIVE_ZONES` (6), `STACKJACK_TARGET` (20), `STACKJACK_SIDE_DECK_SIZE` (4), `STACKJACK_ROUNDS_TO_WIN` (3), `LEVEL_CAP` (20), `XP_TABLE` (levels 1-20), `CLASS_BONUSES`, `BASE_CRIT_CHANCE` (0.05), `CRIT_CHANCE_PER_LEVEL` (0.01), `BASE_CRIT_MULTIPLIER` (2.0), `CRIT_STREAK_THRESHOLD` (3), `DROP_CHANCE_ENCOUNTER` (0.50), `DROP_CHANCE_QUEST` (0.80), `DROP_CHANCE_BOSS` (1.00), `RARITY_WEIGHTS`, `IDLE_TIMEOUT_MS`, `HISTORY_SCAN_MAX_DAYS` (30), `HISTORY_SCAN_MAX_SESSIONS` (50).

- [ ] **Step 6: Update index.ts barrel export**

```typescript
export * from "./types/game-state.js";
export * from "./types/events.js";
export * from "./types/messages.js";
export * from "./types/cards.js";
export * from "./constants.js";
```

- [ ] **Step 7: Run gates, commit**

```bash
npm run typecheck && npm run lint && npm run build && npm test
git add -A
git commit -m "feat: define shared types for game state, events, messages, cards, and constants"
```

---

### Task 4: Create starter game state, card data, and NPC decks

**Files:**
- Create: `packages/shared/src/data/starter-state.ts`
- Create: `packages/shared/src/data/starter-cards.ts`
- Create: `packages/shared/src/data/npc-decks.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Create starter-cards.ts**

`getStarterDeck()` function that returns 6 basic cards from BASE_CARD_CATALOG: plus-1, plus-2, minus-1, minus-2, flip-1, flip-2.

- [ ] **Step 2: Create npc-decks.ts**

`BASE_CAMP_NPCS` array with 2 easy Stackjack NPCs: "Pixel Pete" and "Byte the Barista", each with a 4-card side deck of Common cards.

- [ ] **Step 3: Create starter-state.ts**

`createStarterState(name: string, characterClass: CharacterClass): GameState` factory function. Returns a complete GameState with level 1, Cloud City Base Camp as the only zone (with NPCs), starter Stackjack deck, empty quests/inventory/party, and base crit stats.

- [ ] **Step 4: Update index.ts, run gates, commit**

```bash
npm run typecheck && npm run lint && npm run build && npm test
git add -A
git commit -m "feat: add starter game state factory, card data, and NPC decks"
```

---

### Task 5: Write tests for shared data

**Files:**
- Create: `packages/shared/src/__tests__/starter-state.test.ts`
- Create: `packages/shared/src/__tests__/cards.test.ts`

- [ ] **Step 1: Write starter state tests**

Test that: `createStarterState` returns valid GameState with correct schemaVersion, character name/class/level 1, one zone (Cloud City Base Camp), starter Stackjack deck with 4+ cards, empty quests, NPCs in base camp.

- [ ] **Step 2: Write card catalog tests**

Test that: BASE_CARD_CATALOG has unique IDs, contains all 10 card types, plus/minus cards have values, createCard produces valid cards.

- [ ] **Step 3: Run gates, commit**

```bash
npm run typecheck && npm run lint && npm run build && npm test
git add -A
git commit -m "test: add tests for starter state and card catalog"
```

---

## Chunk 2: Scanner & Game Engine

### Task 6: JSONL parser with metadata extraction and security filtering

**Files:**
- Create: `packages/scanner/src/jsonl-parser.ts`
- Create: `packages/scanner/src/__tests__/jsonl-parser.test.ts`

- [ ] **Step 1: Write parser tests**

Test `parseJsonlLine`: extracts tool_use events from assistant messages with correct toolName and fileExtension, returns empty for non-assistant messages, detects sub-agents via isSidechain.

Test `extractFileExtension`: extracts .ts, .py, .sql from paths, returns null for no extension or undefined.

Test `detectTestResult`: detects Jest pass/fail output, pytest pass, returns null for non-test output.

Test `detectGitOperation`: detects git push, commit, merge, force push, returns null for non-git.

Test `stripSecrets`: removes strings matching API key patterns.

- [ ] **Step 2: Implement parser functions**

`parseJsonlLine(line: string): ScannerEvent[]` — parses JSON, checks type=assistant, extracts tool_use blocks. For each tool_use: extracts tool name, file extension from input.file_path (extension only, discard path), test results from tool_result content via regex, git operations from Bash command input.

`extractFileExtension(path?: string): string | null`
`detectTestResult(output: string): { result: "pass" | "fail"; count: number } | null`
`detectGitOperation(command: string): string | null`
`stripSecrets(text: string): string` — regex removes patterns matching `sk-`, `ghp_`, `api_key`, `token`, `password`, `secret` followed by 10+ alphanumeric chars.

- [ ] **Step 3: Run gates, commit**

```bash
npm run typecheck && npm run lint && npm run build && npm test
git add -A
git commit -m "feat: add JSONL parser with metadata extraction and security filtering"
```

---

### Task 7: Event accumulator

**Files:**
- Create: `packages/scanner/src/event-accumulator.ts`
- Create: `packages/scanner/src/__tests__/event-accumulator.test.ts`

- [ ] **Step 1: Write tests**

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { EventAccumulator } from "../event-accumulator.js";
import type { ScannerEvent } from "@crit-commit/shared";

describe("EventAccumulator", () => {
  let acc: EventAccumulator;
  beforeEach(() => { acc = new EventAccumulator(); });

  it("starts with zero counts", () => {
    const summary = acc.flush(5);
    expect(summary.events.edits).toBe(0);
    expect(summary.events.totalToolUses).toBe(0);
  });

  it("counts tool_use events by type", () => {
    acc.addEvent({ type: "tool_use", toolName: "Edit", sessionId: "s1", timestamp: new Date().toISOString() });
    acc.addEvent({ type: "tool_use", toolName: "Edit", sessionId: "s1", timestamp: new Date().toISOString() });
    acc.addEvent({ type: "tool_use", toolName: "Read", sessionId: "s1", timestamp: new Date().toISOString() });
    const summary = acc.flush(5);
    expect(summary.events.edits).toBe(2);
    expect(summary.events.reads).toBe(1);
    expect(summary.events.totalToolUses).toBe(3);
  });

  it("tracks detected languages", () => {
    acc.addEvent({ type: "tool_use", toolName: "Edit", fileExtension: ".ts", sessionId: "s1", timestamp: new Date().toISOString() });
    acc.addEvent({ type: "tool_use", toolName: "Edit", fileExtension: ".py", sessionId: "s1", timestamp: new Date().toISOString() });
    const summary = acc.flush(5);
    expect(summary.languagesDetected).toContain(".ts");
    expect(summary.languagesDetected).toContain(".py");
  });

  it("resets after flush", () => {
    acc.addEvent({ type: "tool_use", toolName: "Edit", sessionId: "s1", timestamp: new Date().toISOString() });
    acc.flush(5);
    const summary = acc.flush(5);
    expect(summary.events.edits).toBe(0);
  });

  it("tracks active terminals", () => {
    acc.addEvent({ type: "tool_use", toolName: "Edit", sessionId: "s1", timestamp: new Date().toISOString() });
    acc.addEvent({ type: "tool_use", toolName: "Read", sessionId: "s2", timestamp: new Date().toISOString() });
    const summary = acc.flush(5);
    expect(summary.terminalsActive).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Implement EventAccumulator**

Class with `addEvent(event: ScannerEvent)` and `flush(intervalMinutes: number): BatchedEvents`. Internally tracks: counters per tool type (mapped to CodingEventSummary fields), Set of detected languages, Map of terminal sessions with their activity.

- [ ] **Step 3: Run gates, commit**

```bash
git add -A
git commit -m "feat: add event accumulator for batching scanner events"
```

---

### Task 8: Micro-quest engine

**Files:**
- Create: `packages/scanner/src/micro-quest-engine.ts`
- Create: `packages/scanner/src/__tests__/micro-quest-engine.test.ts`

- [ ] **Step 1: Write tests**

```typescript
import { describe, it, expect } from "vitest";
import { MicroQuestEngine } from "../micro-quest-engine.js";
import { createStarterState } from "@crit-commit/shared";

describe("MicroQuestEngine", () => {
  it("generates 'Edit 5 files' quest after 5 edits", () => {
    const engine = new MicroQuestEngine();
    const state = createStarterState("Test", "architect");
    const events = { edits: 5, writes: 0, reads: 0, grepSearches: 0, bashCommands: 0, testsPassed: 0, testsFailed: 0, gitPushes: 0, gitCommits: 0, gitMerges: 0, forcePushes: 0, subAgentsSpawned: 0, subAgentsCompleted: 0, newFilesCreated: 0, totalToolUses: 5 };
    const quests = engine.evaluate(state, events);
    expect(quests.some(q => q.title.includes("Edit"))).toBe(true);
  });

  it("limits to MAX_MICRO_QUESTS active quests", () => {
    const engine = new MicroQuestEngine();
    const state = createStarterState("Test", "scout");
    const events = { edits: 10, writes: 5, reads: 5, grepSearches: 5, bashCommands: 5, testsPassed: 5, testsFailed: 0, gitPushes: 1, gitCommits: 1, gitMerges: 0, forcePushes: 0, subAgentsSpawned: 1, subAgentsCompleted: 1, newFilesCreated: 3, totalToolUses: 30 };
    const quests = engine.evaluate(state, events);
    expect(quests.length).toBeLessThanOrEqual(3);
  });

  it("tracks new language for Foreign Lands quest", () => {
    const engine = new MicroQuestEngine();
    engine.addDetectedLanguage(".ts");
    engine.addDetectedLanguage(".py"); // new language
    expect(engine.hasNewLanguage()).toBe(true);
  });
});
```

- [ ] **Step 2: Implement MicroQuestEngine**

Class with `evaluate(state: GameState, events: CodingEventSummary): Quest[]` and `addDetectedLanguage(ext: string)`. Generates quests from rules: 5 edits = "Edit 5 files", 3 searches = "Investigate the codebase", test run detected = "Test your mettle", first git commit of day = "Dawn Patrol", new language = "Foreign Lands". Returns max 3 quests. Awards XP range 10-25.

- [ ] **Step 3: Run gates, commit**

```bash
git add -A
git commit -m "feat: add micro-quest engine with rules-based quest generation"
```

---

### Task 9: File watcher for JSONL transcripts

**Files:**
- Create: `packages/scanner/src/file-watcher.ts`
- Create: `packages/scanner/src/__tests__/file-watcher.test.ts`

- [ ] **Step 1: Write tests**

Test that: watcher calls callback when new lines are added to a .jsonl file in a temp directory, watcher handles partial lines (buffering), watcher detects new .jsonl files created after watcher starts, watcher ignores non-.jsonl files.

Use a temp directory for tests (`fs.mkdtempSync`), write test .jsonl lines, verify callbacks fire.

- [ ] **Step 2: Implement FileWatcher**

Uses `chokidar` to watch one or more directories recursively for `**/*.jsonl` files. Accepts an array of watch paths (from `PlayerSettings.watchPaths`) to support multi-user Linux setups where different Linux users run Claude Code on different projects. Maintains a `Map<string, { offset: number; buffer: string }>` for incremental line reading. On file change: read from last offset, split by newline, buffer incomplete lines, emit complete lines to callback.

Cross-platform path resolution: resolve `~` to `os.homedir()` on all platforms. On Windows, also check `%APPDATA%/claude/projects/` as fallback.

Constructor: `new FileWatcher(watchPaths: string[], onLine: (line: string, sessionId: string) => void)`

The watcher gracefully handles paths that don't exist or aren't readable (log a warning, skip that path, continue watching the others).

- [ ] **Step 3: Run gates, commit**

```bash
git add -A
git commit -m "feat: add JSONL file watcher with incremental reading and cross-platform paths"
```

---

### Task 10: Game state persistence manager

**Files:**
- Create: `packages/scanner/src/state-manager.ts`
- Create: `packages/scanner/src/__tests__/state-manager.test.ts`

- [ ] **Step 1: Write tests**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { StateManager } from "../state-manager.js";
import { createStarterState } from "@crit-commit/shared";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("StateManager", () => {
  let tmpDir: string;
  let manager: StateManager;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "crit-commit-test-"));
    manager = new StateManager(tmpDir);
  });

  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it("creates directory structure on init", () => {
    manager.init();
    expect(fs.existsSync(path.join(tmpDir, "save"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, "config"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, "cache"))).toBe(true);
  });

  it("saves and loads game state", () => {
    manager.init();
    const state = createStarterState("TestHero", "architect");
    manager.saveState(state);
    const loaded = manager.loadState();
    expect(loaded?.character.name).toBe("TestHero");
  });

  it("creates backup before saving", () => {
    manager.init();
    const state1 = createStarterState("Hero1", "scout");
    manager.saveState(state1);
    const state2 = createStarterState("Hero2", "scout");
    manager.saveState(state2);
    const backupPath = path.join(tmpDir, "save", "game-state.backup.json");
    expect(fs.existsSync(backupPath)).toBe(true);
    const backup = JSON.parse(fs.readFileSync(backupPath, "utf-8"));
    expect(backup.character.name).toBe("Hero1");
  });

  it("falls back to backup on corruption", () => {
    manager.init();
    const state = createStarterState("ValidHero", "architect");
    manager.saveState(state);
    // Corrupt main save
    fs.writeFileSync(path.join(tmpDir, "save", "game-state.json"), "CORRUPT{{{");
    const loaded = manager.loadState();
    expect(loaded?.character.name).toBe("ValidHero"); // from backup created before corruption write
  });

  it("appends to history.jsonl", () => {
    manager.init();
    manager.appendHistory({ type: "xp_gained", amount: 50, timestamp: new Date().toISOString() });
    manager.appendHistory({ type: "item_dropped", item: "Sword", timestamp: new Date().toISOString() });
    const historyPath = path.join(tmpDir, "save", "history.jsonl");
    const lines = fs.readFileSync(historyPath, "utf-8").trim().split("\n");
    expect(lines).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Implement StateManager**

Class managing `~/.crit-commit/` (or custom base path for tests). Methods: `init()` creates dirs, `loadState(): GameState | null`, `saveState(state: GameState)` (backup rotation + atomic write via tmp file + rename), `appendHistory(event: object)`, `loadSettings(): PlayerSettings`, `saveSettings(settings)`, `savePendingEvents(events)`, `loadPendingEvents()`, `clearPendingEvents()`.

- [ ] **Step 3: Run gates, commit**

```bash
git add -A
git commit -m "feat: add game state persistence with atomic writes, backup, and history log"
```

---

### Task 11: HTTP server and WebSocket

**Files:**
- Create: `packages/scanner/src/server.ts`
- Create: `packages/scanner/src/__tests__/server.test.ts`

- [ ] **Step 1: Write tests**

Test that: server starts and responds to HTTP GET / with 200, WebSocket connection is accepted, server sends state_update on WebSocket connect, server receives and acknowledges client messages.

- [ ] **Step 2: Implement GameServer**

Express app serving static files from a configurable directory (web-ui dist). WebSocket server (ws library) on the same HTTP server. On WS connect: send full GameState. On WS message: parse ClientMessage, route to handler callback. `pushUpdate(msg: ServerMessage)` broadcasts to all connected clients. Configurable port from PlayerSettings.

- [ ] **Step 3: Run gates, commit**

```bash
git add -A
git commit -m "feat: add HTTP and WebSocket server for web UI communication"
```

---

### Task 12: Prompt builder for Claude game engine

**Files:**
- Create: `packages/game-engine/src/prompt-builder.ts`
- Create: `packages/game-engine/src/__tests__/prompt-builder.test.ts`

- [ ] **Step 1: Write tests**

Test that: prompt includes "game master" system instructions, prompt includes game state as JSON, prompt includes batched events, prompt includes NPC franchise list (Star Wars, LOTR, Zelda, FF, Matrix, Mario, TMNT), prompt instructs structured JSON response format, prompt does NOT contain file paths or source code.

- [ ] **Step 2: Implement buildPrompt**

`buildPrompt(state: GameState, events: BatchedEvents, pendingActions: string[]): string`

The prompt tells Claude: you are the game master for Crit Commit RPG. Given the player's state and recent coding events, generate: narrative_events (array of story text), encounter (if triggered), xp_awards, item_drops (with rarity roll), quest_updates (session/epic), npc_names (for new terminals — blend names from Star Wars, LOTR, Zelda, Final Fantasy, The Matrix, Super Mario, TMNT with coding context), zone_choice (if threshold met). Return JSON matching a specific schema. Never reference real file paths, project names, or code.

- [ ] **Step 3: Run gates, commit**

```bash
git add -A
git commit -m "feat: add prompt builder for Claude game engine calls"
```

---

### Task 13: Response parser and Claude invoker

**Files:**
- Create: `packages/game-engine/src/response-parser.ts`
- Create: `packages/game-engine/src/claude-invoker.ts`
- Create: `packages/game-engine/src/__tests__/response-parser.test.ts`

- [ ] **Step 1: Write response parser tests**

Test that: valid JSON response is parsed into typed GameStateUpdate, missing fields default to empty arrays/null, malformed JSON returns empty update (no crash), narrative events are extracted with correct types.

- [ ] **Step 2: Implement ResponseParser**

`parseGameEngineResponse(raw: string): GameStateUpdate` — parses JSON, validates expected fields, returns typed object with narrative_events, xp_awards, item_drops, quest_updates, npc_names, encounter, zone_choice. Define `GameStateUpdate` interface. Graceful fallback on any parse error.

- [ ] **Step 3: Implement ClaudeInvoker**

`invokeClaudeEngine(prompt: string): Promise<string | null>` — spawns `claude -p "<prompt>" --output-format text` via `child_process.execFile`. Timeout after 60 seconds. Returns stdout on success, null on error. Logs errors to stderr.

Note: the exact CLI flags for `claude` headless mode should be tested. If `--output-format` is not available, fall back to raw output parsing.

- [ ] **Step 4: Run gates, commit**

```bash
git add -A
git commit -m "feat: add Claude response parser and CLI invoker"
```

---

### Task 14: Progression engine — XP, leveling, crits, drops

**Files:**
- Create: `packages/game-engine/src/progression.ts`
- Create: `packages/game-engine/src/__tests__/progression.test.ts`

- [ ] **Step 1: Write tests**

```typescript
import { describe, it, expect } from "vitest";
import { awardXP, calculateCritChance, rollCrit, rollDrop, checkCritStreak, applyAscension } from "../progression.js";
import { createStarterState } from "@crit-commit/shared";

describe("awardXP", () => {
  it("adds XP to character", () => {
    const state = createStarterState("Hero", "architect");
    const updated = awardXP(state, 50);
    expect(updated.character.xp).toBe(50);
  });

  it("triggers level up when XP exceeds threshold", () => {
    const state = createStarterState("Hero", "architect");
    const updated = awardXP(state, state.character.xpToNextLevel + 1);
    expect(updated.character.level).toBe(2);
  });

  it("caps at level 20", () => {
    const state = createStarterState("Hero", "scout");
    state.character.level = 20;
    const updated = awardXP(state, 9999);
    expect(updated.character.level).toBe(20);
  });
});

describe("calculateCritChance", () => {
  it("returns base chance at level 1", () => {
    const state = createStarterState("Hero", "battlemage");
    expect(calculateCritChance(state)).toBeCloseTo(0.05);
  });

  it("scout gets bonus crit chance", () => {
    const state = createStarterState("Hero", "scout");
    expect(calculateCritChance(state)).toBeGreaterThan(0.05);
  });
});

describe("rollDrop", () => {
  it("returns an item rarity or null", () => {
    const result = rollDrop(1.0); // 100% drop chance
    expect(["common", "uncommon", "rare", "legendary", null]).toContain(result);
  });

  it("returns null when drop chance is 0", () => {
    expect(rollDrop(0)).toBeNull();
  });
});

describe("applyAscension", () => {
  it("resets level to 1 and grants a star", () => {
    const state = createStarterState("Hero", "architect");
    state.character.level = 20;
    const updated = applyAscension(state);
    expect(updated.character.level).toBe(1);
    expect(updated.character.ascensionStars).toBe(1);
  });

  it("keeps zones unlocked", () => {
    const state = createStarterState("Hero", "architect");
    state.character.level = 20;
    state.zones.push({ id: "z1", name: "Test Zone", description: "", theme: "test", active: true, archived: false, modifier: "", modifierValue: 0, npcs: [], unlockedAt: "" });
    const updated = applyAscension(state);
    expect(updated.zones).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Implement progression functions**

All pure functions: `awardXP(state, amount): GameState`, `calculateCritChance(state): number`, `rollCrit(critChance): boolean`, `rollDrop(dropChance): ItemRarity | null`, `checkCritStreak(state, isCrit): GameState`, `applyAscension(state): GameState`. Uses constants from shared package.

- [ ] **Step 3: Run gates, commit**

```bash
git add -A
git commit -m "feat: add progression engine with XP, leveling, crits, and loot drops"
```

---

### Task 15: Party manager — terminal companions and sub-agent summons

**Files:**
- Create: `packages/game-engine/src/party-manager.ts`
- Create: `packages/game-engine/src/__tests__/party-manager.test.ts`

- [ ] **Step 1: Write tests**

Test that: `addTerminalCompanion` creates a PartyMember with a session ID, `markIdle` transitions a member to "resting" after timeout, `removeTerminal` removes a party member when session ends, `getActiveParty` returns only active members, companion count matches number of active terminals.

- [ ] **Step 2: Implement PartyManager**

`addTerminalCompanion(sessionId: string, name: string, npcClass: string): PartyMember` — creates a new party member linked to a terminal session.
`markIdle(sessionId: string, state: GameState): GameState` — transitions member to "resting".
`markActive(sessionId: string, state: GameState): GameState` — transitions member back to "active".
`removeTerminal(sessionId: string, state: GameState): GameState` — removes member.
`getActiveParty(state: GameState): PartyMember[]` — filters for active members.

NPC naming is deferred to Claude (the game engine generates names) — this module manages lifecycle only.

- [ ] **Step 3: Run gates, commit**

```bash
git add -A
git commit -m "feat: add party manager for terminal companions and sub-agent lifecycle"
```

---

### Task 16: Zone manager — zone generation triggers and limits

**Files:**
- Create: `packages/game-engine/src/zone-manager.ts`
- Create: `packages/game-engine/src/__tests__/zone-manager.test.ts`

- [ ] **Step 1: Write tests**

Test that: `checkZoneUnlock` returns true when language/tool activity exceeds threshold, `enforceZoneLimit` archives oldest zone when limit exceeded, `archiveZone` sets zone to archived, `getActiveZones` returns max 6 + base camp, `applyZoneChoice` adds the chosen zone to the game state.

- [ ] **Step 2: Implement ZoneManager**

`checkZoneUnlock(state: GameState, languageActivity: Record<string, number>): boolean` — returns true when any language/tool has accumulated enough activity (e.g., 50 tool uses) to trigger a zone choice.
`enforceZoneLimit(state: GameState): GameState` — if more than MAX_ACTIVE_ZONES + 1 (base camp), prompt to archive one.
`archiveZone(state: GameState, zoneId: string): GameState` — sets zone.archived = true, zone.active = false.
`applyZoneChoice(state: GameState, choice: { name, description, theme, modifier, modifierValue }): GameState` — adds new zone.

Zone choices themselves are generated by Claude — this module handles the trigger logic and state management.

- [ ] **Step 3: Run gates, commit**

```bash
git add -A
git commit -m "feat: add zone manager with unlock triggers, limits, and archiving"
```

---

### Task 17: Stackjack core engine — match loop and basic cards

**Files:**
- Create: `packages/game-engine/src/stackjack/match.ts`
- Create: `packages/game-engine/src/__tests__/stackjack-match.test.ts`

- [ ] **Step 1: Write tests for core match loop**

Test: main deck draws random 1-10, playing plus card adds to total, playing minus card subtracts, standing locks total, busting over 20 loses round, winning 3 rounds wins match, Crit Hand (exactly 20) beats non-Crit 20 (tiebreaker), flip card can be played as + or -.

- [ ] **Step 2: Implement StackjackMatch**

Class managing a match. Internal state: playerTotal, opponentTotal, playerSideDeck, opponentSideDeck, roundsWon, mainDeckLastDraw, standing flags, phase. Methods: `startMatch(playerDeck, opponentDeck)`, `drawMainDeck()` (random 1-10), `playCard(cardId, flipChoice?)`, `stand()`, `endTurn()`, `getState(): StackjackMatchState`. Handles round transitions and match completion.

- [ ] **Step 3: Run gates, commit**

```bash
git add -A
git commit -m "feat: add Stackjack core match loop with basic card types"
```

---

### Task 18: Stackjack special cards and NPC AI

**Files:**
- Create: `packages/game-engine/src/stackjack/card-effects.ts`
- Create: `packages/game-engine/src/stackjack/npc-ai.ts`
- Create: `packages/game-engine/src/__tests__/stackjack-cards.test.ts`
- Create: `packages/game-engine/src/__tests__/stackjack-npc.test.ts`

- [ ] **Step 1: Write tests for special card effects**

Test each special card: Fork copies opponent's last draw, Null cancels current draw (total unchanged), Rebase resets to 10, Merge averages last two draws, Recursive plays card then draws non-Recursive non-Legendary bonus, Crit Card doubles next card value, Overflow busts opponent when player is at 20.

- [ ] **Step 2: Implement card effect handlers**

`applyCardEffect(match: StackjackMatchState, card: StackjackCard, flipChoice?: "plus" | "minus"): StackjackMatchState` — applies the card's effect to the match state. Each card type has a handler function.

- [ ] **Step 3: Write tests for NPC AI**

Test: easy NPC stands at 17+, medium at 18+, hard at 19+. Easy plays cards randomly. Medium plays strategically (minus when over 20, plus to reach range). Hard saves special cards for optimal moments.

- [ ] **Step 4: Implement NPC AI**

`npcTurn(match: StackjackMatchState, difficulty: "easy" | "medium" | "hard", sideDeck: StackjackCard[]): { action: "stand" | "end_turn" | "play_card"; cardId?: string }` — deterministic AI that decides the NPC's action based on difficulty tier and current match state.

- [ ] **Step 5: Run gates, commit**

```bash
git add -A
git commit -m "feat: add Stackjack special card effects and NPC AI with difficulty tiers"
```

---

### Task 19: Game engine barrel exports

**Files:**
- Modify: `packages/game-engine/src/index.ts`

- [ ] **Step 1: Export all game engine modules**

```typescript
export * from "./prompt-builder.js";
export * from "./response-parser.js";
export * from "./claude-invoker.js";
export * from "./progression.js";
export * from "./party-manager.js";
export * from "./zone-manager.js";
export { StackjackMatch } from "./stackjack/match.js";
export { applyCardEffect } from "./stackjack/card-effects.js";
export { npcTurn } from "./stackjack/npc-ai.js";
```

- [ ] **Step 2: Run gates, commit**

```bash
npm run typecheck && npm run lint && npm run build && npm test
git add -A
git commit -m "feat: add game engine barrel exports"
```

---

### Task 20: Scanner orchestrator — wire everything together

**Files:**
- Create: `packages/scanner/src/orchestrator.ts`
- Modify: `packages/scanner/src/index.ts`

- [ ] **Step 1: Implement Orchestrator**

Main class that:
1. Accepts config (base dir, port, batch interval)
2. Creates StateManager, loads game state and settings (or returns null for first-run)
3. Creates FileWatcher with `settings.watchPaths` array (supports multiple Linux users' JSONL directories)
4. Creates EventAccumulator
5. Creates MicroQuestEngine
6. Creates GameServer (HTTP + WebSocket)
7. Sets batch interval timer: on tick, flush accumulator, run micro-quest engine, invoke Claude via game-engine (buildPrompt -> invokeClaudeEngine -> parseResponse), apply progression updates, save state, push update via WebSocket
8. Registers FileWatcher callback: parse line -> add to accumulator
9. Registers WebSocket client message handler: route to appropriate game logic
10. `start()` method: init state manager, start file watcher, start server, open browser
11. `stop()` method: save state, close watcher, close server

- [ ] **Step 2: Update scanner index.ts**

```typescript
export { Orchestrator } from "./orchestrator.js";
export { StateManager } from "./state-manager.js";
export { FileWatcher } from "./file-watcher.js";
export { EventAccumulator } from "./event-accumulator.js";
export { MicroQuestEngine } from "./micro-quest-engine.js";
export { GameServer } from "./server.js";
```

- [ ] **Step 3: Run gates, commit**

```bash
npm run typecheck && npm run lint && npm run build && npm test
git add -A
git commit -m "feat: add scanner orchestrator wiring all components together"
```

---

## Chunk 3: CLI

### Task 21: CLI scaffold and start/status commands

**Files:**
- Modify: `packages/cli/src/index.ts`
- Create: `packages/cli/src/commands/start.ts`
- Create: `packages/cli/src/commands/status.ts`

- [ ] **Step 1: Implement CLI entry point**

`packages/cli/src/index.ts`: Shebang line `#!/usr/bin/env node`. Uses commander to define:
- `crit-commit start [--repair]` — starts the game
- `crit-commit status` — shows game state summary
- `crit-commit reset` — resets game (separate task)

- [ ] **Step 2: Implement start command**

Checks if `~/.crit-commit/save/game-state.json` exists. If yes, starts Orchestrator. If no, prints "No save found. Run first-run setup." and calls first-run flow (next task). If `--repair`, rebuilds state from history.jsonl first.

- [ ] **Step 3: Implement status command**

Reads game-state.json, prints: character name, class, level, XP progress, current zone, active quests, party size, Stackjack record, Ascension stars. If no save exists, prints "No game found."

- [ ] **Step 4: Run gates, commit**

```bash
git add -A
git commit -m "feat: add CLI scaffold with start and status commands"
```

---

### Task 22: First-run flow and character creation

**Files:**
- Create: `packages/cli/src/first-run.ts`
- Modify: `packages/cli/src/commands/start.ts`

- [ ] **Step 1: Implement first-run interactive flow**

Uses Node.js `readline` for interactive prompts (no external dependency needed):
1. Print welcome banner: "Welcome to Crit Commit: A Claude Code RPG"
2. **Auto-detect Claude Code installations:** Scan `/home/*/.claude/projects/` (Linux/Mac) or `%APPDATA%/claude/projects/` (Windows) for JSONL directories. Test read access on each. Display results:
   ```
   Detected Claude Code installations:
     1. /home/bobby/.claude/projects (current user) [readable]
     2. /home/devuser/.claude/projects [readable]
     3. /home/salesforce-dev/.claude/projects [no read access — run: sudo usermod -aG claude-watchers bobby]

   Watch all accessible? (Y/n):
   ```
   Save confirmed paths to `settings.json` as `watchPaths` array. If only one path is found (common on Mac/Windows), skip the prompt and auto-configure.
3. Prompt: "Name your character:" — free text
4. Prompt: "Choose your class:" — numbered list (1. Architect, 2. Scout, 3. Artificer, 4. Battlemage) with one-line descriptions
5. Create game state via `createStarterState(name, class)`
6. Create `~/.crit-commit/` directory structure via StateManager.init()
7. Save initial game state and settings (including watchPaths)
8. Print: "Character created! Starting game..."

- [ ] **Step 2: Integrate into start command**

If no save exists, call first-run flow, then start orchestrator.

- [ ] **Step 3: Run gates, commit**

```bash
git add -A
git commit -m "feat: add first-run character creation flow"
```

---

### Task 23: Reset and repair commands

**Files:**
- Create: `packages/cli/src/commands/reset.ts`
- Create: `packages/cli/src/commands/repair.ts`

- [ ] **Step 1: Implement reset command**

Prompts "Are you sure? This will delete all game progress. (y/N)". On confirm, deletes `~/.crit-commit/save/` directory contents. Prints "Game reset."

- [ ] **Step 2: Implement repair command**

Reads `~/.crit-commit/save/history.jsonl` line by line. Replays events to reconstruct game state (basic replay: sum XP, count levels, rebuild stats). Saves reconstructed state to game-state.json. Prints summary of recovered state.

- [ ] **Step 3: Run gates, commit**

```bash
git add -A
git commit -m "feat: add reset and repair CLI commands"
```

---

## Chunk 4: Web UI

### Task 24: Vite + PixiJS project setup

**Files:**
- Create: `packages/web-ui/index.html`
- Modify: `packages/web-ui/vite.config.ts`
- Modify: `packages/web-ui/src/main.ts`
- Create: `packages/web-ui/src/style.css`

- [ ] **Step 1: Create Vite config**

```typescript
import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  build: { outDir: "dist", assetsDir: "assets" },
  server: { port: 3334 },
});
```

- [ ] **Step 2: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Crit Commit: A Claude Code RPG</title>
  <link rel="stylesheet" href="/src/style.css" />
</head>
<body>
  <div id="game-canvas"></div>
  <div id="dashboard"></div>
  <div id="footer"></div>
  <div id="modal-root"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 3: Create base CSS**

Dark theme, `#0a1628` background, `image-rendering: pixelated` on canvas, grid layout for game-canvas + dashboard + footer, Plus Jakarta Sans font (or system fallback).

- [ ] **Step 4: Create main.ts with PixiJS initialization**

Initialize PixiJS Application, append canvas to `#game-canvas`. Render a dark blue background with "Crit Commit" pixel-style text to verify pipeline works. Import style.css.

- [ ] **Step 5: Run build, commit**

```bash
npm run build --workspace=packages/web-ui
git add -A
git commit -m "feat: initialize Vite + PixiJS web UI with dark theme"
```

---

### Task 25: WebSocket client and game state store

**Files:**
- Create: `packages/web-ui/src/ws-client.ts`
- Create: `packages/web-ui/src/store.ts`

- [ ] **Step 1: Implement WebSocket client**

Class: connects to `ws://localhost:PORT`, exponential backoff reconnection, receives ServerMessage, dispatches to registered handlers, sends ClientMessage. Emits connection status.

- [ ] **Step 2: Implement GameStore**

Observable store: holds current GameState. On `state_update` from WebSocket, updates store and notifies subscribers. `subscribe(selector, callback)` pattern for UI components to watch specific state slices.

- [ ] **Step 3: Wire into main.ts**

Import both, connect on startup, subscribe to state changes, log updates to console.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add WebSocket client and reactive game state store"
```

---

### Task 26: Dashboard — quest log, event feed, stats

**Files:**
- Create: `packages/web-ui/src/ui/dashboard.ts`
- Create: `packages/web-ui/src/ui/quest-log.ts`
- Create: `packages/web-ui/src/ui/event-feed.ts`
- Create: `packages/web-ui/src/ui/stats-panel.ts`

- [ ] **Step 1: Implement dashboard layout**

Creates three-column DOM layout inside `#dashboard`: left (quest log), center (event feed), right (stats). All DOM-based, not PixiJS.

- [ ] **Step 2: Implement quest log**

Shows micro-quests with progress bars, session quests with descriptions, epic quest with stage indicator. Subscribes to GameStore.

- [ ] **Step 3: Implement event feed**

Scrolling list of NarrativeEvent entries. Crit events in gold text. Max 50 displayed. New events fade in.

- [ ] **Step 4: Implement stats panel**

Character name, level, XP bar, class badge, crit chance %, Ascension stars, materia list, gear summary. Connection status indicator dot.

- [ ] **Step 5: Wire all panels into main.ts, commit**

```bash
git add -A
git commit -m "feat: add dashboard with quest log, event feed, and stats panel"
```

---

### Task 27: Game canvas — base camp scene and character sprites

**Files:**
- Create: `packages/web-ui/src/scenes/scene-manager.ts`
- Create: `packages/web-ui/src/scenes/base-camp.ts`
- Create: `packages/web-ui/src/sprites/character.ts`

- [ ] **Step 1: Implement scene manager**

Manages active scene (PixiJS Container). `setScene(scene)` removes old, adds new to stage. Scenes: base-camp (default), zone scenes (stretch goal).

- [ ] **Step 2: Implement base camp scene**

Programmatic pixel art using PixiJS Graphics: blue sky gradient, cloud platforms, ground area. Interactive elements: quest board (rectangle with "!" icon), card table (small table sprite), coffee shop (small building with steam animation). Coffee shop click opens modal.

- [ ] **Step 3: Implement character sprite**

PixiJS Graphics-based character. Different color per class (architect=blue, scout=green, artificer=orange, battlemage=purple). Simple idle animation (subtle Y bounce on a ticker). Party members rendered as smaller versions alongside player.

- [ ] **Step 4: Wire into main.ts, commit**

```bash
git add -A
git commit -m "feat: add base camp scene with character sprites and interactive elements"
```

---

### Task 28: Crit animation and particle effects

**Files:**
- Create: `packages/web-ui/src/effects/particles.ts`
- Create: `packages/web-ui/src/effects/crit-effect.ts`

- [ ] **Step 1: Implement particle emitter**

Simple PixiJS Graphics particles. Config: count, color, velocity range, lifetime, gravity. Update loop on ticker. Used for bursts and ambient effects.

- [ ] **Step 2: Implement crit effect**

On `crit_trigger` WebSocket message: brief screen shake (translate stage 3-5px randomly for 300ms), golden particle burst (30 particles from center), "CRIT!" text that scales up and fades out over 1.5s.

- [ ] **Step 3: Subscribe to WebSocket crit messages, commit**

```bash
git add -A
git commit -m "feat: add crit animation with screen shake and particle burst"
```

---

### Task 29: Stackjack UI

**Files:**
- Create: `packages/web-ui/src/ui/stackjack/stackjack-ui.ts`
- Create: `packages/web-ui/src/ui/stackjack/card-renderer.ts`
- Create: `packages/web-ui/src/ui/stackjack/deck-selector.ts`

- [ ] **Step 1: Implement card renderer**

DOM-based card components. Each card: name, type color indicator, value, rarity border (common=gray, uncommon=green, rare=blue, legendary=gold). Clickable during player turn. Hover tooltip with description.

- [ ] **Step 2: Implement deck selector**

Modal overlay showing player's full card collection in a scrollable grid. Player clicks to select 4 cards (highlighted border). Confirm button sends `select_side_deck` via WebSocket.

- [ ] **Step 3: Implement match UI**

Full match interface: player total (large number), opponent total, player's 4 side cards, main deck draw area, round dots (3 circles, filled = won), action buttons (End Turn, Stand). Phase indicator. Updates from `stackjack_update` WebSocket messages. Send `stackjack_action` on button clicks.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Stackjack card game UI with deck selector and match interface"
```

---

### Task 30: Modal, settings, footer, and coffee shop

**Files:**
- Create: `packages/web-ui/src/ui/modal.ts`
- Create: `packages/web-ui/src/ui/settings-panel.ts`
- Create: `packages/web-ui/src/ui/footer.ts`

- [ ] **Step 1: Implement reusable modal**

DOM overlay with backdrop (semi-transparent dark), centered content box, close on backdrop click or ESC. `openModal(content: HTMLElement)` and `closeModal()`.

- [ ] **Step 2: Implement settings panel**

Batch interval slider (1-30 min, default 5). Sends `update_settings` via WebSocket. Accessible from a gear icon in the footer.

- [ ] **Step 3: Implement footer**

Bottom bar: donation button (heart icon, opens modal: "Enjoying Crit Commit? Support the developer." with placeholder link), coffee mug icon (opens CloudCityRoasters.com), "Crit Commit v0.1.0" text, gear icon (opens settings), connection status dot.

- [ ] **Step 4: Implement coffee shop modal**

Used by the in-game coffee shop sprite click AND the footer coffee icon. Content: "Fuel your quest with real coffee!", code display "AgentQ10" with a copy-to-clipboard button, "Visit Cloud City Roasters" button linking to CloudCityRoasters.com.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add modal, settings, footer with donation and coffee links"
```

---

### Task 31: Zone choice UI and world map

**Files:**
- Create: `packages/web-ui/src/ui/zone-choice.ts`
- Create: `packages/web-ui/src/ui/world-map.ts`

- [ ] **Step 1: Implement zone choice modal**

When GameState has `narrative.pendingChoices`, auto-opens a modal showing two zone options. Each option: name, description, modifier text. Click to choose. Sends `zone_choice` via WebSocket.

- [ ] **Step 2: Implement world map panel**

Accessible from a "Map" button. Shows Cloud City Base Camp (always, center), unlocked zones as labeled nodes around it, archived zones grayed. Current zone highlighted. Click a zone to "travel" (updates currentZoneId — scene change is stretch goal, for MVP just updates narrative context).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add zone choice modal and world map panel"
```

---

## Chunk 5: Integration & Documentation

### Task 32: End-to-end integration wiring

**Files:**
- Modify: `packages/scanner/src/orchestrator.ts`
- Modify: `packages/scanner/src/server.ts`

- [ ] **Step 1: Wire Stackjack actions through WebSocket**

When scanner receives `stackjack_action` client message, route to StackjackMatch engine. On match state change, push `stackjack_update` to WebSocket. On match end, apply XP/rewards via progression engine, save state.

- [ ] **Step 2: Wire settings changes**

When scanner receives `update_settings`, persist to settings.json via StateManager, update the batch interval timer dynamically.

- [ ] **Step 3: Wire zone choice**

When scanner receives `zone_choice`, apply via ZoneManager.applyZoneChoice, clear pendingChoices, save state, push update.

- [ ] **Step 4: Ensure web-ui dist is served correctly**

Orchestrator checks for `packages/web-ui/dist/index.html`. If missing, logs warning with instructions to build. GameServer serves from that directory.

- [ ] **Step 5: Run all gates, commit**

```bash
npm run typecheck && npm run lint && npm run build && npm test
git add -A
git commit -m "feat: wire end-to-end integration between scanner, game engine, and web UI"
```

---

### Task 33: README and game documentation

**Files:**
- Create: `README.md`
- Create: `docs/GAME_DESIGN.md`
- Create: `docs/STACKJACK.md`
- Create: `docs/CONTRIBUTING.md`

- [ ] **Step 1: Write README.md**

Title: "Crit Commit: A Claude Code RPG". Sections: What is it (3 sentences), Features list (8-10 bullet points), Quick Start (`npx crit-commit init`, `crit-commit start`), How It Works (architecture diagram in ASCII), Multi-User Setup (shared group permissions for Linux users who use multiple accounts — `claude-watchers` group approach), Tech Stack, Contributing link, License (MIT). No screenshot yet — add placeholder text.

- [ ] **Step 2: Write GAME_DESIGN.md**

Player-facing mechanics guide: Classes (table), Materia (table), Crit System (what triggers crits, streak), Quests (3 tiers), Zones (how they unlock, choices), Progression (leveling curve, Ascension), Party System (how terminals become NPCs).

- [ ] **Step 3: Write STACKJACK.md**

Complete rules: goal, main deck, side deck, turn options, busting, Crit Hand, all card types with effects, NPC difficulty tiers, how to collect cards.

- [ ] **Step 4: Write CONTRIBUTING.md**

Fork + PR process, TypeScript + ESLint requirements, test requirements (vitest), commit message format, community guidelines (be respectful, no profanity in submissions).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: add README, game design guide, Stackjack rules, and contributing guide"
```

---

### Task 34: Community submission schema and GitHub Actions

**Files:**
- Create: `community/leaderboard-schema.json`
- Create: `community/profile-template.md`
- Create: `.github/workflows/validate-submission.yml`

- [ ] **Step 1: Create leaderboard schema**

JSON Schema defining submission format: `{ characterName, level, class, ascensionStars, zonesUnlocked, stackjackWins, totalXP, narrativeExcerpt, submittedAt }`. All fields required except narrativeExcerpt.

- [ ] **Step 2: Create profile template**

Markdown template: character card with name, class, level, Ascension stars, favorite zone, Stackjack record.

- [ ] **Step 3: Create validation workflow**

GitHub Actions that runs on PRs to validate: JSON matches schema, profanity check on characterName and narrativeExcerpt (use a simple word list check), file is in correct directory.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add community submission schema and validation workflow"
```

---

### Task 35: Final build verification

**Files:**
- Modify: `CLAUDE.md` (update with final structure)

- [ ] **Step 1: Run all gates from clean state**

```bash
npm run lint
npm run typecheck
npm run build
npm test
```

Fix any remaining errors.

- [ ] **Step 2: Verify CLI entry point**

```bash
node packages/cli/dist/index.js --help
```

Expected: Shows help output with start, status, reset commands.

- [ ] **Step 3: Update CLAUDE.md with final state**

Update CLAUDE.md to reflect the completed project structure, all available commands, and any discoveries made during implementation.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete Crit Commit MVP — all packages building and integrated"
```

- [ ] **Step 5: Mark plan complete**

Write `STATUS: COMPLETE` at the very top of this plan file (plan.md).

---

## Summary

| Chunk | Tasks | What it builds |
|-------|-------|----------------|
| 1: Foundation | 1-5 | Git repo, monorepo, shared types, card data, starter state, tests |
| 2: Scanner & Engine | 6-20 | JSONL parser, event accumulator, micro-quests, file watcher, state persistence, HTTP/WS server, Claude integration, progression, party manager, zone manager, Stackjack engine, orchestrator |
| 3: CLI | 21-23 | CLI commands (start, status, reset, repair), first-run character creation |
| 4: Web UI | 24-31 | PixiJS setup, WebSocket client, state store, dashboard, game canvas, crit animations, Stackjack UI, settings, footer, modals, zone choice, world map |
| 5: Integration & Docs | 32-35 | E2E wiring, README, game docs, community setup, final verification |

**Total: 35 tasks, each atomic and completable in a single Ralph loop iteration.**

**Not in this plan (separate plans needed):**
- Labs page on uzdavines.ai (different repository)
- Pixel art asset integration (post-MVP, replace programmatic sprites with sprite sheets)
- History scan for existing players (post-MVP enhancement to first-run)
- Save file migration framework (needed only when schema changes in a future version)
