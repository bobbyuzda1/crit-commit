// Claude CLI invoker for game engine calls

import { spawn } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TIMEOUT_MS = 120_000; // 2 minutes for game engine calls

/**
 * Invoke Claude CLI in headless mode with the given prompt.
 * Writes prompt to a temp file and pipes it via stdin to avoid E2BIG errors.
 * Returns stdout on success, null on error or timeout.
 */
export function invokeClaudeEngine(
  prompt: string,
): Promise<string | null> {
  return new Promise((resolve) => {
    // Write prompt to temp file to avoid CLI argument length limits
    const tmpFile = join(tmpdir(), `crit-commit-prompt-${Date.now()}.txt`);
    try {
      writeFileSync(tmpFile, prompt, "utf-8");
    } catch (err) {
      process.stderr.write(
        `[crit-commit] Failed to write temp prompt file: ${err}\n`,
      );
      resolve(null);
      return;
    }

    const child = spawn("claude", ["-p", "--output-format", "text"], {
      timeout: TIMEOUT_MS,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      // Clean up temp file
      try { unlinkSync(tmpFile); } catch { /* ignore */ }

      if (code !== 0) {
        process.stderr.write(
          `[crit-commit] Claude exited with code ${code}\n`,
        );
        if (stderr) {
          process.stderr.write(`[crit-commit] stderr: ${stderr.substring(0, 500)}\n`);
        }
        resolve(null);
        return;
      }
      resolve(stdout);
    });

    child.on("error", (error) => {
      // Clean up temp file
      try { unlinkSync(tmpFile); } catch { /* ignore */ }

      process.stderr.write(
        `[crit-commit] Claude spawn error: ${error.message}\n`,
      );
      resolve(null);
    });

    // Write prompt to stdin and close it
    child.stdin.write(prompt);
    child.stdin.end();
  });
}
