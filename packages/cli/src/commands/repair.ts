import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { StateManager } from "@crit-commit/scanner";
import { createStarterState, CharacterClass, GameState } from "@crit-commit/shared";
import chalk from "chalk";

interface HistoryEvent {
  type: string;
  timestamp: string;
  [key: string]: unknown;
}

export async function repairCommand(): Promise<void> {
  const baseDir = join(homedir(), ".crit-commit");
  const historyPath = join(baseDir, "save", "history.jsonl");

  if (!existsSync(historyPath)) {
    console.log(chalk.yellow("No history.jsonl found. Nothing to repair."));
    return;
  }

  try {
    console.log(chalk.blue("Rebuilding game state from history.jsonl..."));

    // Read history line by line
    const historyContent = readFileSync(historyPath, "utf-8");
    const lines = historyContent.trim().split("\n").filter(line => line.trim());

    if (lines.length === 0) {
      console.log(chalk.yellow("History file is empty. Nothing to repair."));
      return;
    }

    const events: HistoryEvent[] = [];
    let parsedLines = 0;

    // Parse each line
    for (const line of lines) {
      try {
        const event = JSON.parse(line) as HistoryEvent;
        events.push(event);
        parsedLines++;
      } catch {
        console.warn(chalk.yellow(`Skipping malformed history line: ${line.substring(0, 50)}...`));
      }
    }

    console.log(chalk.blue(`Parsed ${parsedLines} events from ${lines.length} history lines.`));

    // Create a base game state (we'll use default values as we don't know original character details)
    const reconstructedState: GameState = createStarterState("Recovered Player", CharacterClass.Architect);

    // Basic replay logic - aggregate key metrics
    let totalXP = 0;
    let totalCrits = 0;
    let questsCompleted = 0;
    let stackjackWins = 0;
    let stackjackLosses = 0;
    let sessionCount = 0;
    let maxCritStreak = 0;

    // Process each event
    for (const event of events) {
      switch (event.type) {
        case "batch_processed":
          if (event.xpAwarded && typeof event.xpAwarded === "number") {
            totalXP += event.xpAwarded;
          }
          if (event.questsGenerated && typeof event.questsGenerated === "number") {
            questsCompleted += event.questsGenerated; // Assume generated quests get completed
          }
          sessionCount++;
          break;

        case "xp_gained":
          if (event.amount && typeof event.amount === "number") {
            totalXP += event.amount;
          }
          break;

        case "crit_gained":
          totalCrits++;
          if (event.streak && typeof event.streak === "number" && event.streak > maxCritStreak) {
            maxCritStreak = event.streak;
          }
          break;

        case "stackjack_win":
          stackjackWins++;
          break;

        case "stackjack_loss":
          stackjackLosses++;
          break;

        default:
          // Unknown event type - ignore
          break;
      }
    }

    // Calculate level based on total XP (simplified)
    let level = 1;
    let xpRemaining = totalXP;
    const XP_PER_LEVEL = 100; // Simplified progression

    while (xpRemaining >= XP_PER_LEVEL && level < 20) {
      xpRemaining -= XP_PER_LEVEL;
      level++;
    }

    // Update the reconstructed state
    reconstructedState.character.xp = totalXP;
    reconstructedState.character.level = level;
    reconstructedState.character.xpToNext = level < 20 ? XP_PER_LEVEL - xpRemaining : 0;

    reconstructedState.stats.totalXP = totalXP;
    reconstructedState.stats.totalCrits = totalCrits;
    reconstructedState.stats.maxCritStreak = maxCritStreak;
    reconstructedState.stats.questsCompleted = questsCompleted;
    reconstructedState.stats.stackjackWins = stackjackWins;
    reconstructedState.stats.stackjackLosses = stackjackLosses;
    reconstructedState.stats.sessionCount = sessionCount;

    // Save reconstructed state
    const stateManager = new StateManager(baseDir);
    stateManager.init();
    stateManager.saveState(reconstructedState);

    // Print summary
    console.log(chalk.green.bold("\n=== Recovery Complete ==="));
    console.log(chalk.green(`Character Level: ${level}`));
    console.log(chalk.green(`Total XP: ${totalXP}`));
    console.log(chalk.green(`Total Crits: ${totalCrits}`));
    console.log(chalk.green(`Max Crit Streak: ${maxCritStreak}`));
    console.log(chalk.green(`Quests Completed: ${questsCompleted}`));
    console.log(chalk.green(`Stackjack Record: ${stackjackWins}W - ${stackjackLosses}L`));
    console.log(chalk.green(`Sessions Processed: ${sessionCount}`));
    console.log(chalk.green(`\nRecovered state saved to game-state.json`));

  } catch (error) {
    console.error(chalk.red("Failed to repair game state:"), error);
    process.exit(1);
  }
}