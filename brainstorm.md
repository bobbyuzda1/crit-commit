# Brainstorm & Design Decisions

## 1. Game Name Candidates

| Name | Notes |
|------|-------|
| CodeQuest | Simple, clear, possibly generic/taken |
| Arcane Code | Mystical + coding, good FF/D&D vibes |
| Mana::Code | `::` namespace separator is a nice programming touch |
| CodeForge RPG | Evokes crafting/building |
| Terminal Legends | Works across all terminal contexts, platform-agnostic |
| Hack & Slash | Literal coding pun + RPG genre name |
| `>_ Quest` | Terminal prompt as branding, visually distinctive |
| Pixel Coder | Continuation of the Pixel Agents lineage |
| Code Materia | Leans into the FF7 materia system as the core hook |
| Shell & Sorcery | "Shell" = terminal, sword & sorcery genre |

**Top picks for cross-platform/community goals:** Terminal Legends, Hack & Slash

**Decision needed:** Final game name

---

## 2. Platform Strategy

The foundation doc targets VS Code + WSL. How generic should this be?

### Platform difficulty breakdown

| Platform | Difficulty | Why |
|----------|-----------|-----|
| VS Code Extension (current plan) | Medium | Well-documented API, webview built-in, Pixel Agents as starting point |
| Generic Terminal (no VS Code) | Medium-Hard | Need standalone JSONL watcher + separate UI rendering |
| Windows Terminal / PowerShell | Medium | Claude Code runs on Windows; JSONL paths differ, need path abstraction |
| Web Browser UI | Medium | Standalone web app that reads JSONL, most accessible |
| Electron standalone app | Hard | Full desktop app, overkill for MVP |

### Proposed multi-platform architecture

```
┌─────────────────────────────────────────────┐
│              game-logic (pure TS)            │  ← Platform-independent
│  XP, classes, materia, combat, quests        │
├─────────────────────────────────────────────┤
│              shared (types/contracts)         │
├──────────┬──────────┬───────────┬───────────┤
│ VS Code  │ Terminal │ Web App   │ Future    │  ← Platform adapters
│ Extension│ Watcher  │ (browser) │ adapters  │
│ + Webview│ + TUI/Web│ + file API│           │
└──────────┴──────────┴───────────┴───────────┘
```

The `game-logic` and `shared` packages stay the same. Each platform gets its own thin adapter that:
1. Watches JSONL files for coding events
2. Renders the RPG UI (webview, browser, or TUI)
3. Persists game state

**Decision needed:** Start VS Code only and expand later, or go multi-platform from day one?

---

## 3. User Interface Approach

### Option A: Terminal UI (TUI) — "the hacker way"
- Uses blessed or ink for a retro terminal UI
- Runs alongside Claude Code in a split terminal
- Pros: Works everywhere, no dependencies, feels authentic
- Cons: Limited visual fidelity, no pixel art, harder to make look good

### Option B: Local Web UI — "the accessible way"
- Small local web server (e.g., port 3333) serves HTML/Canvas game
- User opens `localhost:3333` in any browser
- JSONL watcher runs as a Node.js background process
- Pros: Works on any OS, rich visuals, pixel art, full interactivity
- Cons: Requires running a background process

### Option C: VS Code Webview — "the integrated way"
- As described in the foundation doc
- Pros: Seamless integration, always visible while coding
- Cons: Locked to VS Code

### Option D: Hybrid — "the right answer" (recommended)
- Build the game engine and renderer as a standalone web app (Option B)
- The VS Code extension embeds that same web app in a webview
- The terminal watcher is a standalone CLI tool that can run anywhere
- One codebase, multiple entry points
- Anyone using Claude Code in any terminal runs `npx <game-name> start` and opens in browser

**Decision needed:** Which UI approach?

---

## 4. Core Game Mechanics

### Core Loop
1. You code with Claude Code (naturally, doing your real work)
2. The game watches your JSONL transcripts in real-time
3. Coding actions translate to RPG events (attacks, exploration, crafting)
4. You gain XP, level up, earn materia, complete quests
5. Quests are generated from your actual codebase (TODOs, lint warnings, test failures)
6. You check the game during natural breaks (never interrupts flow)

### What makes it a "game" vs. a "tracker"
- **Narrative**: AI-generated story that evolves with your coding — "A merge conflict wraith has appeared in the Git Forest!"
- **Choices**: Choose your class, equip materia, pick which quests to pursue
- **Risk/Reward**: Limit Breaks, rare loot drops on production deploys, critical hits on zero-bug commits
- **Social**: Leaderboards, party system (team coding sessions), PvP arenas (code review battles)
- **Progression**: Unlockable areas, evolving pixel art world, new mechanics at higher levels

### Auto-battle design
Since the user is coding (not actively playing), combat is auto-resolved with visual flair. You do a `git push` and the game shows your character unleashing a Limit Break on a boss. You glance over, smile, and keep coding. The "playing" happens in the strategic layer — choosing classes, equipping materia, picking quests.

### The 3-second rule
Any RPG interaction should take no more than 3 seconds before the developer returns to coding. Queue rewards for natural break points. Never interrupt deep work.

**Decision needed:** Any mechanics to add, change, or cut?

---

## 5. User Extensibility & Plugin System

### What users can create
- **Custom Materia**: Define new equippable skills with custom XP triggers
- **Quest Packs**: JSON/YAML-defined quest chains tied to coding activities
- **Themes/Skins**: Alternative pixel art packs, dark/light variants
- **Class Mods**: New character classes with custom stat curves
- **Enemy Packs**: New bug types with custom sprites and behaviors
- **World Expansions**: New areas/dungeons with their own tilesets
- **Event Handlers**: Custom game events triggered by specific JSONL patterns

### Proposed plugin structure
```
<game-name>/
├── core/                    # Base game (maintained by Bobby)
├── plugins/
│   ├── plugin-manifest.json # Schema for plugin definition
│   ├── example-plugin/      # Template
│   └── ...
├── themes/                  # Visual themes (pixel art packs)
├── quests/                  # Community quest definitions
└── materia/                 # Custom materia definitions
```

### Technical approach
- Plugin API with hooks into the game lifecycle
- Plugins are NPM packages or local directories following a manifest schema
- Hot-reloadable during development
- Plugin registry (like a mini npm) or GitHub repos with a tag
- `npx <game-name> init-plugin` scaffolds a new plugin repo

**Decision needed:** How much extensibility in MVP vs. later? Separate repos for community plugins, or monorepo contributions?

---

## 6. Open Source & Community Growth Strategy

### Repository structure
```
github.com/bobbyuzda1/<game-name>
├── packages/
│   ├── core/          # Game engine — Bobby maintains
│   ├── cli/           # CLI tool for standalone usage
│   ├── vscode/        # VS Code extension wrapper
│   ├── shared/        # Types and contracts
│   └── web/           # Web renderer
├── plugins/           # Official plugin directory
├── community/         # Community contribution guidelines
├── CONTRIBUTING.md
└── LICENSE (MIT)
```

### Community contribution model
- **Core game** (main repo) — Bobby controls the game engine, base mechanics, and plugin API
- **Community plugins** (separate repos) — users create their own repos for plugins/themes/quests
- **Plugin registry** — a `plugins.json` in main repo that lists community plugins, or a dedicated registry site
- **Contributions to core** — standard fork + PR model for bug fixes, features, translations

### Viral growth tactics
- GitHub Actions template for plugin CI/CD
- "Plugin of the Week" showcase
- Shareable achievement cards (SVG badges for GitHub profiles)
- Global leaderboard (opt-in, anonymous or GitHub-linked)
- "Share your character" — export character card as image for social media

**Decision needed:** Public repo from the start? MIT license? Community model preference?

---

## 7. Art Style

### Current plan (from foundation doc)
- 16x16 pixel tiles for environments
- 32x32 (or 16x16 scaled 2x) for character sprites
- Integer-only zoom levels, `image-rendering: pixelated`
- Dark IDE-friendly palettes (Dracula-style)

### Open-source asset sources
- Kenney.nl (CC0): 60,000+ assets including RPG sets
- Liberated Pixel Cup (CC-BY-SA 3.0): Modular RPG character sprites
- OpenGameArt.org (various CC): DawnLike 16x16 tileset, 496 item icons

**Decision needed:** Stick with 16x16 pixel art, or consider alternatives?

---

## 8. GitHub Repo Setup

- `gh` CLI is authenticated as `bobbyuzda1`
- Ready to create repo and push on command

**Decision needed:** Final repo name, public/private, description, when to create

---

## 9. Ralph Wiggum Cycle Mode

Details to be provided later by Bobby. Placeholder for future design work.

---

## Summary of All Open Decisions

1. Final game name
2. Platform scope for MVP (VS Code only vs. multi-platform)
3. UI approach (TUI / Web / VS Code / Hybrid)
4. Core mechanics additions or cuts
5. Plugin extensibility scope for MVP
6. Community contribution model (separate repos vs. monorepo)
7. Public repo timing and license
8. Art style confirmation
9. Repo name and creation timing
