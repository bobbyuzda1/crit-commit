import { describe, it, expect } from "vitest";
import {
  parseJsonlLine,
  extractFileExtension,
  detectTestResult,
  detectGitOperation,
  stripSecrets,
} from "../jsonl-parser.js";

describe("parseJsonlLine", () => {
  it("extracts tool_use events from assistant messages", () => {
    const jsonLine = JSON.stringify({
      type: "assistant",
      content: [
        {
          type: "tool_use",
          name: "Edit",
          input: {
            file_path: "/path/to/file.ts",
            old_string: "old content",
            new_string: "new content"
          }
        }
      ]
    });

    const events = parseJsonlLine(jsonLine);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("activity_detected");
    if (events[0].type === "activity_detected") {
      expect(events[0].toolName).toBe("Edit");
      expect(events[0].sessionId).toBeDefined();
      expect(events[0].timestamp).toBeDefined();
    }
  });

  it("extracts correct tool name and file extension", () => {
    const jsonLine = JSON.stringify({
      type: "assistant",
      content: [
        {
          type: "tool_use",
          name: "Write",
          input: {
            file_path: "/home/user/project/src/main.py",
            content: "print('hello')"
          }
        }
      ]
    });

    const events = parseJsonlLine(jsonLine);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("activity_detected");
    if (events[0].type === "activity_detected") {
      expect(events[0].toolName).toBe("Write");
    }
    // File extension extraction is tested separately
  });

  it("returns empty array for non-assistant messages", () => {
    const userLine = JSON.stringify({
      type: "user",
      content: "Please help me with this code"
    });

    const systemLine = JSON.stringify({
      type: "system",
      content: "System message"
    });

    expect(parseJsonlLine(userLine)).toEqual([]);
    expect(parseJsonlLine(systemLine)).toEqual([]);
  });

  it("detects sub-agents via isSidechain", () => {
    const jsonLine = JSON.stringify({
      type: "assistant",
      isSidechain: true,
      agentId: "agent-123",
      content: [
        {
          type: "tool_use",
          name: "Grep",
          input: {
            pattern: "function",
            path: "/project/src"
          }
        }
      ]
    });

    const events = parseJsonlLine(jsonLine);

    expect(events).toHaveLength(2); // activity_detected + sub_agent_spawned

    const subAgentEvent = events.find(e => e.type === "sub_agent_spawned");
    expect(subAgentEvent).toEqual({
      type: "sub_agent_spawned",
      sessionId: expect.any(String),
      agentId: "agent-123",
      agentType: "sidechain",
      timestamp: expect.any(String)
    });
  });

  it("handles multiple tool_use blocks in one message", () => {
    const jsonLine = JSON.stringify({
      type: "assistant",
      content: [
        {
          type: "tool_use",
          name: "Read",
          input: { file_path: "/file1.js" }
        },
        {
          type: "text",
          text: "Now let me edit this file"
        },
        {
          type: "tool_use",
          name: "Edit",
          input: { file_path: "/file1.js", old_string: "old", new_string: "new" }
        }
      ]
    });

    const events = parseJsonlLine(jsonLine);

    expect(events).toHaveLength(2);
    const activityEvents = events.filter(e => e.type === "activity_detected");
    expect(activityEvents).toHaveLength(2);
    if (activityEvents[0].type === "activity_detected" && activityEvents[1].type === "activity_detected") {
      expect(activityEvents[0].toolName).toBe("Read");
      expect(activityEvents[1].toolName).toBe("Edit");
    }
  });

  it("handles malformed JSON gracefully", () => {
    const malformedJson = "{ invalid json }";
    expect(parseJsonlLine(malformedJson)).toEqual([]);
  });

  it("handles missing content array", () => {
    const jsonLine = JSON.stringify({
      type: "assistant"
      // missing content
    });

    expect(parseJsonlLine(jsonLine)).toEqual([]);
  });
});

describe("extractFileExtension", () => {
  it("extracts common extensions", () => {
    expect(extractFileExtension("/path/to/file.ts")).toBe("ts");
    expect(extractFileExtension("/project/script.py")).toBe("py");
    expect(extractFileExtension("/db/schema.sql")).toBe("sql");
    expect(extractFileExtension("component.tsx")).toBe("tsx");
    expect(extractFileExtension("styles.css")).toBe("css");
  });

  it("handles paths with multiple dots", () => {
    expect(extractFileExtension("/path/to/file.test.ts")).toBe("ts");
    expect(extractFileExtension("package.json")).toBe("json");
    expect(extractFileExtension("file.d.ts")).toBe("ts");
  });

  it("returns null for files without extension", () => {
    expect(extractFileExtension("/path/to/README")).toBeNull();
    expect(extractFileExtension("Dockerfile")).toBeNull();
    expect(extractFileExtension("/bin/executable")).toBeNull();
  });

  it("returns null for undefined or empty paths", () => {
    expect(extractFileExtension(undefined)).toBeNull();
    expect(extractFileExtension("")).toBeNull();
    expect(extractFileExtension("/")).toBeNull();
  });

  it("handles Windows paths", () => {
    expect(extractFileExtension("C:\\\\Users\\\\file.py")).toBe("py");
    expect(extractFileExtension("..\\\\src\\\\main.ts")).toBe("ts");
  });
});

describe("detectTestResult", () => {
  it("detects Jest pass/fail output", () => {
    const jestPass = "PASS src/utils.test.ts (5.2s)\\n ✓ should work correctly";
    const jestFail = "FAIL src/utils.test.ts (1.8s)\\n ✗ should not fail";

    expect(detectTestResult(jestPass)).toEqual({ result: "pass", count: 1 });
    expect(detectTestResult(jestFail)).toEqual({ result: "fail", count: 1 });
  });

  it("detects Vitest pass/fail output", () => {
    const vitestPass = "✓ packages/shared/src/__tests__/cards.test.ts > BASE_CARD_CATALOG > has unique card IDs";
    const vitestFail = "✗ packages/shared/src/__tests__/cards.test.ts > BASE_CARD_CATALOG > missing cards";

    expect(detectTestResult(vitestPass)).toEqual({ result: "pass", count: 1 });
    expect(detectTestResult(vitestFail)).toEqual({ result: "fail", count: 1 });
  });

  it("detects pytest pass output", () => {
    const pytestPass = "test_example.py::test_function PASSED";
    const pytestFail = "test_example.py::test_function FAILED";

    expect(detectTestResult(pytestPass)).toEqual({ result: "pass", count: 1 });
    expect(detectTestResult(pytestFail)).toEqual({ result: "fail", count: 1 });
  });

  it("counts multiple test results", () => {
    const multipleTests = `
      ✓ test1 PASSED
      ✓ test2 PASSED
      ✗ test3 FAILED
      PASS overall
    `;

    const result = detectTestResult(multipleTests);
    expect(result).toBeDefined();
    expect(result!.count).toBeGreaterThan(1);
  });

  it("returns null for non-test output", () => {
    expect(detectTestResult("Building project...")).toBeNull();
    expect(detectTestResult("Server started on port 3000")).toBeNull();
    expect(detectTestResult("File saved successfully")).toBeNull();
    expect(detectTestResult("")).toBeNull();
  });

  it("handles test summary output", () => {
    const testSummary = `
      Test Files  2 passed (2)
      Tests  42 passed (42)
      Duration  2.33s
    `;

    const result = detectTestResult(testSummary);
    expect(result).toEqual({ result: "pass", count: 42 });
  });
});

describe("detectGitOperation", () => {
  it("detects git push", () => {
    expect(detectGitOperation("git push origin main")).toBe("push");
    expect(detectGitOperation("git push")).toBe("push");
    expect(detectGitOperation("git push -u origin feature-branch")).toBe("push");
  });

  it("detects git commit", () => {
    expect(detectGitOperation("git commit -m 'Add feature'")).toBe("commit");
    expect(detectGitOperation("git commit --amend")).toBe("commit");
    expect(detectGitOperation("git commit -a -m 'Fix bug'")).toBe("commit");
  });

  it("detects git merge", () => {
    expect(detectGitOperation("git merge feature-branch")).toBe("merge");
    expect(detectGitOperation("git merge --no-ff develop")).toBe("merge");
  });

  it("detects force push", () => {
    expect(detectGitOperation("git push --force")).toBe("force_push");
    expect(detectGitOperation("git push -f origin main")).toBe("force_push");
    expect(detectGitOperation("git push --force-with-lease")).toBe("force_push");
  });

  it("detects other git operations", () => {
    expect(detectGitOperation("git pull origin main")).toBe("pull");
    expect(detectGitOperation("git fetch upstream")).toBe("fetch");
    expect(detectGitOperation("git rebase main")).toBe("rebase");
    expect(detectGitOperation("git checkout -b feature")).toBe("checkout");
  });

  it("returns null for non-git commands", () => {
    expect(detectGitOperation("npm install")).toBeNull();
    expect(detectGitOperation("ls -la")).toBeNull();
    expect(detectGitOperation("echo 'hello world'")).toBeNull();
    expect(detectGitOperation("")).toBeNull();
  });

  it("handles git commands with complex arguments", () => {
    expect(detectGitOperation("git commit -m 'feat: add new feature with git in message'")).toBe("commit");
    expect(detectGitOperation("git push origin HEAD:refs/for/main")).toBe("push");
  });
});

describe("stripSecrets", () => {
  it("removes API key patterns", () => {
    const text = "API key is sk-1234567890abcdef1234567890 and token";
    const result = stripSecrets(text);
    expect(result).not.toContain("sk-1234567890abcdef1234567890");
    expect(result).toContain("[REDACTED]");
  });

  it("removes GitHub personal access tokens", () => {
    const text = "Use token ghp_1234567890abcdef12345678901234567890 for auth";
    const result = stripSecrets(text);
    expect(result).not.toContain("ghp_1234567890abcdef12345678901234567890");
    expect(result).toContain("[REDACTED]");
  });

  it("removes various secret patterns", () => {
    const secrets = [
      "api_key=abc1234567890def",
      "token:xyz9876543210abc",
      "password=secret1234567890",
      "secret_key=mysecret123456789"
    ];

    secrets.forEach(secret => {
      const text = `Configuration contains ${secret} for access`;
      const result = stripSecrets(text);
      expect(result).not.toContain(secret.split(/[=:]/)[1]);
      expect(result).toContain("[REDACTED]");
    });
  });

  it("preserves non-secret content", () => {
    const text = "This is a normal log message with no secrets";
    expect(stripSecrets(text)).toBe(text);
  });

  it("handles multiple secrets in same text", () => {
    const text = "Key: sk-abc123def456 and password=secret1234567890 here";
    const result = stripSecrets(text);
    expect(result).not.toContain("sk-abc123def456");
    expect(result).not.toContain("secret1234567890");
    expect(result).toContain("[REDACTED]");
  });

  it("ignores short or invalid secret patterns", () => {
    const text = "Short key: sk-123 and api_key=short";
    const result = stripSecrets(text);
    // Should keep short patterns that don't meet minimum length requirement
    expect(result).toBe(text);
  });

  it("handles empty or undefined input", () => {
    expect(stripSecrets("")).toBe("");
    expect(stripSecrets(undefined as unknown as string)).toBe("");
  });
});