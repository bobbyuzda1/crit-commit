#!/usr/bin/env node

import { Command } from "commander";
import { startCommand } from "./commands/start.js";
import { statusCommand } from "./commands/status.js";

const program = new Command();

program
  .name("crit-commit")
  .description("Crit Commit: A Claude Code RPG")
  .version("0.1.0");

program
  .command("start")
  .description("Start the Crit Commit RPG game")
  .option("--repair", "Rebuild state from history.jsonl before starting")
  .action(startCommand);

program
  .command("status")
  .description("Show game state summary")
  .action(statusCommand);

program.parse();