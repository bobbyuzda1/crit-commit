import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { StateManager } from "@crit-commit/scanner";
import type { Quest, PartyMember } from "@crit-commit/shared";
import chalk from "chalk";

export async function statusCommand(): Promise<void> {
  const baseDir = join(homedir(), ".crit-commit");
  const gameStatePath = join(baseDir, "save", "game-state.json");

  if (!existsSync(gameStatePath)) {
    console.log(chalk.yellow("No game found."));
    console.log("Run 'crit-commit start' to begin your RPG journey!");
    return;
  }

  try {
    const stateManager = new StateManager(baseDir);
    const gameState = stateManager.loadState();

    if (!gameState) {
      console.log(chalk.red("Failed to load game state."));
      return;
    }

    const { character, party, stats } = gameState;

    console.log(chalk.cyan.bold("=== Crit Commit Status ===\n"));

    // Character Info
    console.log(chalk.green.bold("Character:"));
    console.log(`  Name: ${character.name}`);
    console.log(`  Class: ${character.class}`);
    console.log(`  Level: ${character.level}`);

    const xpForNext = character.level < 20 ?
      character.xpToNext :
      "Max Level";
    console.log(`  XP: ${character.xp} / ${xpForNext}`);

    // Current Zone (simplified for now since we don't have currentZoneId in Character type)
    console.log(`  Current Zone: Cloud City Base Camp`);

    // Active Quests
    const activeQuests = gameState.activeQuests || [];
    console.log(`  Active Quests: ${activeQuests.length}`);
    if (activeQuests.length > 0) {
      activeQuests.forEach((quest: Quest) => {
        console.log(`    - ${quest.title} (${quest.tier})`);
      });
    }

    // Party
    console.log(`  Party Size: ${party.length + 1} (including you)`);
    if (party.length > 0) {
      console.log("  Companions:");
      party.forEach((companion: PartyMember) => {
        console.log(`    - ${companion.name} (${companion.sessionPath})`);
      });
    }

    // Stackjack Record
    console.log(`  Stackjack Record: ${stats.stackjackWins}W - ${stats.stackjackLosses}L`);

    // Ascension
    if (character.ascensionLevel && character.ascensionLevel > 0) {
      console.log(`  Ascension Level: ${character.ascensionLevel} ⭐`);
    }

    console.log("");
  } catch (error) {
    console.error(chalk.red("Failed to read game status:"), error);
    process.exit(1);
  }
}