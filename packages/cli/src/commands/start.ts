import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { StateManager, Orchestrator } from "@crit-commit/scanner";
import chalk from "chalk";
import { firstRunFlow } from "../first-run.js";

interface StartOptions {
  repair?: boolean;
}

export async function startCommand(options: StartOptions): Promise<void> {
  const baseDir = join(homedir(), ".crit-commit");
  const gameStatePath = join(baseDir, "save", "game-state.json");
  const hasExistingSave = existsSync(gameStatePath);

  if (!hasExistingSave) {
    console.log(chalk.yellow("No save found. Running first-run setup..."));
    const result = await firstRunFlow();

    if (!result.success) {
      console.log(chalk.red("First-run setup failed or was cancelled."));
      process.exit(1);
    }

    console.log(chalk.green(`Welcome, ${result.character?.name}!`));
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