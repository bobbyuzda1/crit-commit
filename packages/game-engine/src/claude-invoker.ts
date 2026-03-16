// Claude CLI invoker for game engine calls

import { execFile } from "node:child_process";

const TIMEOUT_MS = 60_000;

/**
 * Invoke Claude CLI in headless mode with the given prompt.
 * Returns stdout on success, null on error or timeout.
 */
export function invokeClaudeEngine(
  prompt: string,
): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(
      "claude",
      ["-p", prompt, "--output-format", "text"],
      { timeout: TIMEOUT_MS },
      (error, stdout, stderr) => {
        if (error) {
          process.stderr.write(
            `[crit-commit] Claude invocation error: ${error.message}\n`,
          );
          if (stderr) {
            process.stderr.write(`[crit-commit] stderr: ${stderr}\n`);
          }
          resolve(null);
          return;
        }
        resolve(stdout);
      },
    );
  });
}
