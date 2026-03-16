import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { StateManager, Orchestrator } from "@crit-commit/scanner";
import chalk from "chalk";

interface StartOptions {
  repair?: boolean;
}

export async function startCommand(options: StartOptions): Promise<void> {
  const baseDir = join(homedir(), ".crit-commit");
  const gameStatePath = join(baseDir, "save", "game-state.json");
  const hasExistingSave = existsSync(gameStatePath);

  if (!hasExistingSave) {
    console.log(chalk.yellow("No save found. Run first-run setup."));
    // TODO: Call first-run flow (next task)
    console.log(chalk.red("First-run flow not yet implemented. Please wait for Task 22."));
    process.exit(1);
  }

  try {
    const stateManager = new StateManager(baseDir);

    if (options.repair) {
      console.log(chalk.yellow("Rebuilding state from history.jsonl..."));
      // TODO: Implement rebuildFromHistory method in StateManager
      console.log(chalk.yellow("Repair functionality not yet implemented."));
    }

    const gameState = stateManager.loadState();
    if (!gameState) {
      console.log(chalk.red("Failed to load game state."));
      process.exit(1);
    }

    console.log(chalk.green(`Starting Crit Commit for ${gameState.character.name}...`));

    const orchestrator = new Orchestrator({
      basePath: baseDir,
      port: 3000,
      batchIntervalMinutes: 5, // 5 minutes default
      staticDir: join(baseDir, "web-ui") // TODO: Update when web-ui is built
    });

    await orchestrator.start();
  } catch (error) {
    console.error(chalk.red("Failed to start Crit Commit:"), error);
    process.exit(1);
  }
}