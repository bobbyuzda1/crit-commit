# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Crit Commit: A Claude Code RPG** — A coding RPG that watches Claude Code JSONL session transcripts and translates real coding activity into RPG gameplay (encounters, quests, progression, narrative). Targeted at Claude Code power users. Every player's game is unique — Claude acts as the game master, generating content based on each player's actual coding work.

## Architecture

Three-piece architecture:

1. **Node.js Scanner** — Always-running file watcher on `~/.claude/projects/`. Extracts metadata only (tool names, counts, timing) from JSONL transcripts. Never reads source code or secrets. Batches events on player-configurable interval (default 5 min). Zero token cost.

2. **Game Engine Terminal** — A dedicated Claude Code session where Claude IS the game master. Receives compact event summaries, generates narrative/rewards/encounters/quests, maintains persistent game state on disk. ~90% LLM-powered, ~10% rules engine.

3. **Visual Web UI** — Browser-based (localhost) PixiJS + pixel art renderer. 16x16 tiles, character/party/zone/encounter visuals, Stackjack card game, quest log, event feed, stats dashboard.

## Monorepo Structure

```
packages/
  scanner/       # Node.js JSONL watcher + event batcher
  game-engine/   # Game state management + Claude integration
  web-ui/        # PixiJS visual game + Stackjack + dashboard
  shared/        # TypeScript types, event contracts, constants
  cli/           # CLI commands (start, status, repair via --repair flag)
```

## Implementation Status

**✅ COMPLETE MVP** — All 35 planned tasks implemented and verified (March 2026). The complete Crit Commit game is ready to use:

- **All packages build successfully**: TypeScript compilation, ESLint validation, comprehensive test suite (218 tests passing)
- **CLI ready**: `node packages/cli/dist/index.js start` to launch the game, `status` for game state
- **Web UI built**: PixiJS-powered visual interface with all game components (dashboard, Stackjack, zone selection, character display)
- **End-to-end integration**: Scanner → Game Engine → Web UI data flow tested and working
- **Documentation complete**: README, game design guide, Stackjack rules, contributing guide

### Available Commands

```bash
# Start the game (includes first-run setup)
node packages/cli/dist/index.js start

# Show game status
node packages/cli/dist/index.js status

# Repair/reset game state from history
node packages/cli/dist/index.js start --repair
```

## Key Technical Details

- **JSONL source**: `~/.claude/projects/<encoded-project-path>/<session-id>.jsonl`
- **JSONL schema**: Discriminated union on `type` field. Tool names: Bash, Glob, Grep, LS, Read, Edit, MultiEdit, Write, WebFetch, WebSearch, TodoWrite, TodoRead, Task, Explore, ExitPlanMode
- **Sub-agents**: Created via Task tool, `isSidechain: true`, unique `agentId`
- **Turn completion**: `system` entry with subtype `turn_duration` (~98% reliable)
- **Rendering**: PixiJS, 16x16 pixel tiles, integer zoom, `image-rendering: pixelated`
- **State persistence**: JSON files at `~/.crit-commit/save/` with backup rotation and append-only history.jsonl
- **Cross-platform**: Windows, Linux, Mac. No VS Code dependency.
- **Installation**: `claude install crit-commit` (Claude Code marketplace)

## Game Systems

- **4 classes**: Architect, Scout, Artificer, Battlemage
- **3 materia types**: Skill (green, languages), Tool (yellow, dev tools), Spirit (red, AI activity). Levels 1-5.
- **Crit system**: Core mechanic. Crits trigger on exceptional coding outcomes. Crit Chance grows with level/gear. Crit Streak (3 in a session) = temporary god-mode buff.
- **Party system**: Active terminals = companion NPCs (pop-culture-named). Sub-agents = summoned creatures.
- **Quest tiers**: Micro (scanner-generated, free), Session (Claude-generated), Epic (multi-session)
- **Zones**: Cloud City Base Camp (home) + up to 6 dynamic zones generated from coding patterns
- **Stackjack**: Pazaak-evolved card game. Target 20, side deck of 4 modifier cards, collectible.
- **Progression**: Level 1-20, Ascension prestige system (infinite replayability)
- **Community**: GitHub-native leaderboards, storyline sharing, player profiles
- **3-second rule**: RPG interactions must never interrupt deep coding work

## Security

Scanner extracts metadata only — never source code, file contents, secrets, or error messages. Content filter strips anything resembling credentials before reaching game engine. Game engine prompt forbids referencing real filenames or project names.

## Reference Documents

- `docs/superpowers/specs/2026-03-15-crit-commit-design.md` — Full game design specification
- `RPG-Foundation-Doc.md` — Original design research (Pixel Agents analysis, JSONL schema, competitive landscape)
- `brainstorm.md` — Early brainstorming decisions (superseded by design spec)
- `MINI_RALPH_GUIDE.md` — Mini Ralph loop guide for iterative development
