import { existsSync, rmSync, readdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import * as readline from "readline/promises";
import chalk from "chalk";

export async function resetCommand(): Promise<void> {
  const baseDir = join(homedir(), ".crit-commit");
  const saveDir = join(baseDir, "save");

  if (!existsSync(saveDir)) {
    console.log(chalk.yellow("No game save found. Nothing to reset."));
    return;
  }

  // Create readline interface for user confirmation
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    const answer = await rl.question(
      chalk.yellow("Are you sure? This will delete all game progress. (y/N): ")
    );

    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log(chalk.green("Reset cancelled."));
      return;
    }

    // Delete all contents of the save directory
    const saveContents = readdirSync(saveDir);
    for (const item of saveContents) {
      const itemPath = join(saveDir, item);
      rmSync(itemPath, { recursive: true, force: true });
    }

    console.log(chalk.green("Game reset."));
  } catch (error) {
    console.error(chalk.red("Failed to reset game:"), error);
    process.exit(1);
  } finally {
    rl.close();
  }
}