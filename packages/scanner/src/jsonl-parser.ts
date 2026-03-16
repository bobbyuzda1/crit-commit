import { ScannerEvent } from "@crit-commit/shared";

/**
 * Parse a single JSONL line and extract scanner events
 */
export function parseJsonlLine(line: string): ScannerEvent[] {
  try {
    const entry = JSON.parse(line);
    const events: ScannerEvent[] = [];
    const timestamp = new Date().toISOString();
    const sessionId = "current"; // TODO: Extract from JSONL context

    // Only process assistant messages
    if (entry.type !== "assistant") {
      return [];
    }

    // Handle sub-agent detection
    if (entry.isSidechain && entry.agentId) {
      events.push({
        type: "sub_agent_spawned",
        sessionId,
        agentId: entry.agentId,
        agentType: "sidechain",
        timestamp,
      });
    }

    // Extract tool_use blocks from content array
    const content = entry.content;
    if (!Array.isArray(content)) {
      return events;
    }

    for (const block of content) {
      if (block.type === "tool_use") {
        events.push({
          type: "activity_detected",
          sessionId,
          toolName: block.name,
          timestamp,
        });
      }
    }

    return events;
  } catch {
    // Return empty array for malformed JSON
    return [];
  }
}

/**
 * Extract file extension from a file path
 */
export function extractFileExtension(path?: string): string | null {
  if (!path || path.trim() === "" || path === "/") {
    return null;
  }

  // Handle both Unix and Windows path separators
  const fileName = path.split(/[/\\]/).pop();
  if (!fileName) {
    return null;
  }

  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex === -1 || lastDotIndex === 0) {
    return null;
  }

  return fileName.substring(lastDotIndex + 1);
}

/**
 * Detect test results from command output
 */
export function detectTestResult(output: string): { result: "pass" | "fail"; count: number } | null {
  if (!output || output.trim() === "") {
    return null;
  }

  const lines = output.split("\n");
  let passCount = 0;
  let failCount = 0;
  let hasTestIndicators = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Jest patterns
    if (/^PASS\s+/.test(trimmedLine)) {
      passCount++;
      hasTestIndicators = true;
    } else if (/^FAIL\s+/.test(trimmedLine)) {
      failCount++;
      hasTestIndicators = true;
    }
    // Vitest patterns
    else if (/^✓\s+/.test(trimmedLine)) {
      passCount++;
      hasTestIndicators = true;
    } else if (/^✗\s+/.test(trimmedLine)) {
      failCount++;
      hasTestIndicators = true;
    }
    // Pytest patterns
    else if (/\s+PASSED\s*$/.test(trimmedLine)) {
      passCount++;
      hasTestIndicators = true;
    } else if (/\s+FAILED\s*$/.test(trimmedLine)) {
      failCount++;
      hasTestIndicators = true;
    }
    // Test summary patterns
    else if (/Tests?\s+(\d+)\s+passed/i.test(trimmedLine)) {
      const match = trimmedLine.match(/Tests?\s+(\d+)\s+passed/i);
      if (match) {
        passCount += parseInt(match[1], 10);
        hasTestIndicators = true;
      }
    } else if (/Tests?\s+(\d+)\s+failed/i.test(trimmedLine)) {
      const match = trimmedLine.match(/Tests?\s+(\d+)\s+failed/i);
      if (match) {
        failCount += parseInt(match[1], 10);
        hasTestIndicators = true;
      }
    }
  }

  if (!hasTestIndicators) {
    return null;
  }

  // Determine overall result and count
  const totalCount = passCount + failCount;
  if (totalCount === 0) {
    return null;
  }

  return {
    result: failCount > 0 ? "fail" : "pass",
    count: totalCount,
  };
}

/**
 * Detect git operations from command strings
 */
export function detectGitOperation(command: string): string | null {
  if (!command || command.trim() === "") {
    return null;
  }

  const trimmedCommand = command.trim().toLowerCase();

  // Check if it's a git command
  if (!trimmedCommand.startsWith("git ")) {
    return null;
  }

  // Force push detection (must come before regular push)
  if (/git\s+push\s+.*(-f|--force)/.test(trimmedCommand) ||
      /git\s+push\s+--force-with-lease/.test(trimmedCommand)) {
    return "force_push";
  }

  // Regular git operations
  if (/git\s+push/.test(trimmedCommand)) {
    return "push";
  }
  if (/git\s+commit/.test(trimmedCommand)) {
    return "commit";
  }
  if (/git\s+merge/.test(trimmedCommand)) {
    return "merge";
  }
  if (/git\s+pull/.test(trimmedCommand)) {
    return "pull";
  }
  if (/git\s+fetch/.test(trimmedCommand)) {
    return "fetch";
  }
  if (/git\s+rebase/.test(trimmedCommand)) {
    return "rebase";
  }
  if (/git\s+checkout/.test(trimmedCommand)) {
    return "checkout";
  }

  return null;
}

/**
 * Strip secrets and sensitive information from text
 */
export function stripSecrets(text: string): string {
  if (!text) {
    return "";
  }

  let result = text;

  // Define patterns for common secret formats
  const secretPatterns = [
    // OpenAI/Anthropic API keys
    /sk-[a-zA-Z0-9]{10,}/g,
    // GitHub personal access tokens
    /ghp_[a-zA-Z0-9]{10,}/g,
    // Generic patterns with common secret keywords followed by long alphanumeric strings
    /(?:api_key|secret_key|token|password|secret)[=:\s]+[a-zA-Z0-9]{10,}/gi,
  ];

  for (const pattern of secretPatterns) {
    result = result.replace(pattern, "[REDACTED]");
  }

  return result;
}