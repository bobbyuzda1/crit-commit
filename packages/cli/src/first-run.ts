import * as readline from "node:readline";
import { existsSync, readdirSync, accessSync, constants } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { StateManager } from "@crit-commit/scanner";
import { createStarterState, CharacterClass, PlayerSettings, DEFAULT_SETTINGS } from "@crit-commit/shared";
import chalk from "chalk";

interface FirstRunResult {
  success: boolean;
  character?: {
    name: string;
    class: CharacterClass;
  };
}

/**
 * Interactive first-run flow for character creation and Claude Code path detection
 */
export async function firstRunFlow(): Promise<FirstRunResult> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    console.log(chalk.bold.blue("Welcome to Crit Commit: A Claude Code RPG"));
    console.log();

    // Auto-detect Claude Code installations
    const watchPaths = await detectClaudeCodePaths();

    if (watchPaths.length === 0) {
      console.log(chalk.red("❌ No readable Claude Code installations detected."));
      console.log(chalk.yellow("   Make sure Claude Code is installed and you have access to ~/.claude/projects/"));
      return { success: false };
    }

    // Display detected paths
    console.log(chalk.green("Detected Claude Code installations:"));
    watchPaths.forEach((path, index) => {
      const isCurrentUser = path.includes(homedir());
      const status = isCurrentUser ? chalk.green("[current user]") : chalk.yellow("[readable]");
      console.log(`  ${index + 1}. ${path} ${status}`);
    });
    console.log();

    // Skip watch path confirmation if only one path found
    const confirmedPaths = watchPaths;
    if (watchPaths.length > 1) {
      const watchAll = await askYesNo(rl, "Watch all accessible paths? (Y/n): ", true);
      if (!watchAll) {
        // For now, just use all paths - could add individual selection later
        console.log(chalk.yellow("Individual path selection not yet implemented. Using all paths."));
      }
    }

    // Get character name
    const characterName = await askQuestion(rl, "Name your character: ");
    if (!characterName.trim()) {
      console.log(chalk.red("❌ Character name cannot be empty."));
      return { success: false };
    }

    // Get character class
    const characterClass = await selectCharacterClass(rl);
    if (!characterClass) {
      console.log(chalk.red("❌ Invalid class selection."));
      return { success: false };
    }

    // Create game state and settings
    console.log(chalk.blue("Creating character..."));

    const baseDir = join(homedir(), ".crit-commit");
    const stateManager = new StateManager(baseDir);

    // Initialize directory structure
    stateManager.init();

    // Create and save game state
    const gameState = createStarterState(characterName, characterClass);
    stateManager.saveState(gameState);

    // Create and save settings
    const settings: PlayerSettings = {
      ...DEFAULT_SETTINGS,
      watchPaths: confirmedPaths
    };
    stateManager.saveSettings(settings);

    console.log(chalk.green("✅ Character created! Starting game..."));
    console.log();

    return {
      success: true,
      character: {
        name: characterName,
        class: characterClass
      }
    };

  } catch (error) {
    console.error(chalk.red("❌ First-run setup failed:"), error);
    return { success: false };
  } finally {
    rl.close();
  }
}

/**
 * Auto-detect Claude Code installations across multiple users
 */
async function detectClaudeCodePaths(): Promise<string[]> {
  const paths: string[] = [];

  // Check current user's home directory
  const userClaudePath = join(homedir(), ".claude", "projects");
  if (isReadable(userClaudePath)) {
    paths.push(userClaudePath);
  }

  // Check Windows AppData fallback
  if (process.platform === "win32") {
    const appDataPath = process.env.APPDATA;
    if (appDataPath) {
      const windowsClaudePath = join(appDataPath, "claude", "projects");
      if (isReadable(windowsClaudePath) && !paths.includes(windowsClaudePath)) {
        paths.push(windowsClaudePath);
      }
    }
  }

  // On Linux/Mac, check other users' home directories
  if (process.platform !== "win32") {
    try {
      const homeParent = process.platform === "darwin" ? "/Users" : "/home";
      if (existsSync(homeParent)) {
        const users = readdirSync(homeParent);
        for (const user of users) {
          const userHome = join(homeParent, user);
          const claudePath = join(userHome, ".claude", "projects");

          if (isReadable(claudePath) && !paths.includes(claudePath)) {
            paths.push(claudePath);
          }
        }
      }
    } catch {
      // Ignore errors when scanning other user directories
    }
  }

  return paths;
}

/**
 * Check if a directory exists and is readable
 */
function isReadable(path: string): boolean {
  try {
    accessSync(path, constants.R_OK);
    return existsSync(path);
  } catch {
    return false;
  }
}

/**
 * Ask user to select a character class
 */
async function selectCharacterClass(rl: readline.Interface): Promise<CharacterClass | null> {
  const classes = [
    { value: CharacterClass.Architect, name: "Architect", description: "Master of system design and architecture" },
    { value: CharacterClass.Scout, name: "Scout", description: "Expert at exploration and reconnaissance" },
    { value: CharacterClass.Artificer, name: "Artificer", description: "Skilled craftsperson and tool creator" },
    { value: CharacterClass.Battlemage, name: "Battlemage", description: "Combines magical AI powers with combat prowess" }
  ];

  console.log("Choose your class:");
  classes.forEach((cls, index) => {
    console.log(`  ${index + 1}. ${chalk.bold(cls.name)} - ${cls.description}`);
  });
  console.log();

  while (true) {
    const answer = await askQuestion(rl, "Select class (1-4): ");
    const selection = parseInt(answer.trim());

    if (selection >= 1 && selection <= 4) {
      return classes[selection - 1].value;
    }

    console.log(chalk.red("❌ Please enter a number between 1 and 4."));
  }
}

/**
 * Ask a question and return the answer
 */
function askQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

/**
 * Ask a yes/no question with default
 */
async function askYesNo(rl: readline.Interface, question: string, defaultValue: boolean): Promise<boolean> {
  const answer = await askQuestion(rl, question);
  const response = answer.trim().toLowerCase();

  if (response === "") {
    return defaultValue;
  }

  return response === "y" || response === "yes";
}