# Contributing to Crit Commit

Thanks for your interest in contributing! This guide covers the process and requirements.

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Build all packages:**
   ```bash
   npm run build
   ```
5. **Run tests:**
   ```bash
   npm test
   ```

---

## Development Workflow

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes
3. Run all verification gates before committing:
   ```bash
   npm run lint && npm run typecheck && npm run build && npm test
   ```
4. Commit with a descriptive message (see format below)
5. Push to your fork and open a Pull Request

---

## Code Requirements

### TypeScript

- All code must be TypeScript with strict mode enabled
- No `any` types unless absolutely necessary (and documented why)
- Use the shared types from `@crit-commit/shared` for cross-package contracts

### Linting

ESLint 9 with flat config. Run before every commit:

```bash
npm run lint
```

### Testing

All new features and bug fixes must include tests. We use Vitest:

```bash
npm test                    # Run all tests
npm test -- --watch         # Watch mode
npx vitest packages/shared  # Run tests for a specific package
```

### Type Checking

```bash
npm run typecheck
```

---

## Commit Message Format

Use conventional commit prefixes:

| Prefix | Use For |
|--------|---------|
| `feat:` | New features |
| `fix:` | Bug fixes |
| `docs:` | Documentation changes |
| `test:` | Adding or updating tests |
| `refactor:` | Code changes that don't add features or fix bugs |
| `chore:` | Build, tooling, dependency updates |

Examples:
```
feat: add Rebase card type to Stackjack engine
fix: prevent crit streak from persisting across sessions
docs: update Stackjack rules with Merge card example
test: add edge case tests for zone archival limit
```

---

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Include a clear description of what changed and why
- All verification gates must pass (lint, typecheck, build, test)
- Update documentation if your change affects player-facing behavior

---

## Community Guidelines

- **Be respectful** — constructive feedback only
- **No profanity** in code, comments, community submissions, or character names
- **No sensitive information** — never commit real names, credentials, API keys, or client-specific details
- **Keep it fun** — this is a game about making coding more enjoyable

---

## Project Structure

```
packages/
  scanner/       # JSONL watcher, event batcher, HTTP/WS server
  game-engine/   # Progression, Stackjack, zone/party management, Claude integration
  web-ui/        # PixiJS renderer, dashboard, Stackjack UI
  shared/        # TypeScript types, constants, card data
  cli/           # CLI commands
```

When adding cross-package types, add them to `packages/shared/src/types.ts` and re-export from the barrel.

---

## Questions?

Open an issue on GitHub. We're happy to help you get started.
