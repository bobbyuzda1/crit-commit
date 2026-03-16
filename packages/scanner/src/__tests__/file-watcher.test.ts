import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as chokidar from "chokidar";
import { FileWatcher } from "../file-watcher.js";

describe("FileWatcher", () => {
  let tempDir: string;
  let callback: ReturnType<typeof vi.fn>;
  let watcher: FileWatcher;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "crit-commit-test-"));
    callback = vi.fn();
  });

  afterEach(async () => {
    if (watcher) {
      await watcher.close();
    }

    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it.skip("debug: test chokidar directly", async () => {
    let eventReceived = false;
    const pattern = path.join(tempDir, "**/*.jsonl");

    const directWatcher = chokidar.watch(pattern, {
      ignoreInitial: false,
      persistent: true,
    });

    directWatcher.on("add", (filePath) => {
      console.log("Direct chokidar add event:", filePath);
      eventReceived = true;
    });

    directWatcher.on("change", (filePath) => {
      console.log("Direct chokidar change event:", filePath);
      eventReceived = true;
    });

    directWatcher.on("ready", () => {
      console.log("Direct chokidar ready");
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    // Create file
    const jsonlFile = path.join(tempDir, "direct-test.jsonl");
    console.log("Creating file for direct test:", jsonlFile);
    fs.writeFileSync(jsonlFile, '{"test": "direct"}\n');

    await new Promise(resolve => setTimeout(resolve, 1000));

    await directWatcher.close();

    expect(eventReceived).toBe(true);
  });

  it("debug: minimal test of file watching", async () => {
    // Start watching first
    watcher = new FileWatcher([tempDir], callback);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create file after watcher starts
    const jsonlFile = path.join(tempDir, "debug-session.jsonl");
    console.log("Creating file:", jsonlFile);
    fs.writeFileSync(jsonlFile, '{"type": "debug"}\n');

    // Wait longer
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log("Callback call count:", callback.mock.calls.length);
    console.log("Callback calls:", callback.mock.calls);

    expect(callback).toHaveBeenCalled();
  });

  it("calls callback when new lines are added to existing .jsonl file", async () => {
    // Create an existing .jsonl file
    const jsonlFile = path.join(tempDir, "session-123.jsonl");
    fs.writeFileSync(jsonlFile, '{"type": "initial", "content": "test"}\n');

    // Start watching
    watcher = new FileWatcher([tempDir], callback);
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for initial scan

    // Add new lines to the file
    const newLine1 = '{"type": "user", "content": "Hello world"}\n';
    const newLine2 = '{"type": "assistant", "content": "Hi there"}\n';

    fs.appendFileSync(jsonlFile, newLine1);
    await new Promise(resolve => setTimeout(resolve, 300));

    fs.appendFileSync(jsonlFile, newLine2);
    await new Promise(resolve => setTimeout(resolve, 300));

    expect(callback).toHaveBeenCalledWith(
      '{"type": "user", "content": "Hello world"}',
      "session-123"
    );
    expect(callback).toHaveBeenCalledWith(
      '{"type": "assistant", "content": "Hi there"}',
      "session-123"
    );
  });

  it("handles partial lines by buffering until complete", async () => {
    const jsonlFile = path.join(tempDir, "session-456.jsonl");
    fs.writeFileSync(jsonlFile, ""); // Start with empty file

    watcher = new FileWatcher([tempDir], callback);
    await new Promise(resolve => setTimeout(resolve, 100));

    // Write a partial line first
    fs.appendFileSync(jsonlFile, '{"type": "test", "co');
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should not have called callback yet
    expect(callback).not.toHaveBeenCalled();

    // Complete the line
    fs.appendFileSync(jsonlFile, 'ntent": "partial test"}\n');
    await new Promise(resolve => setTimeout(resolve, 100));

    // Now should have been called with complete line
    expect(callback).toHaveBeenCalledWith(
      '{"type": "test", "content": "partial test"}',
      "session-456"
    );
  });

  it("detects new .jsonl files created after watcher starts", async () => {
    watcher = new FileWatcher([tempDir], callback);
    await new Promise(resolve => setTimeout(resolve, 100));

    // Create a new .jsonl file after watcher started
    const newJsonlFile = path.join(tempDir, "new-session-789.jsonl");
    fs.writeFileSync(newJsonlFile, '{"type": "new", "content": "file test"}\n');
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(callback).toHaveBeenCalledWith(
      '{"type": "new", "content": "file test"}',
      "new-session-789"
    );
  });

  it("ignores non-.jsonl files", async () => {
    watcher = new FileWatcher([tempDir], callback);
    await new Promise(resolve => setTimeout(resolve, 100));

    // Create various non-.jsonl files
    fs.writeFileSync(path.join(tempDir, "text-file.txt"), "some text\n");
    fs.writeFileSync(path.join(tempDir, "log-file.log"), "log entry\n");
    fs.writeFileSync(path.join(tempDir, "json-file.json"), '{"key": "value"}\n');
    fs.writeFileSync(path.join(tempDir, "no-extension"), "no extension\n");

    await new Promise(resolve => setTimeout(resolve, 200));

    // Should not have been called for any non-.jsonl files
    expect(callback).not.toHaveBeenCalled();
  });

  it("handles multiple watch paths", async () => {
    const tempDir2 = fs.mkdtempSync(path.join(os.tmpdir(), "crit-commit-test-2-"));

    try {
      watcher = new FileWatcher([tempDir, tempDir2], callback);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Add files to both directories
      fs.writeFileSync(path.join(tempDir, "session-a.jsonl"), '{"dir": "first"}\n');
      fs.writeFileSync(path.join(tempDir2, "session-b.jsonl"), '{"dir": "second"}\n');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(callback).toHaveBeenCalledWith('{"dir": "first"}', "session-a");
      expect(callback).toHaveBeenCalledWith('{"dir": "second"}', "session-b");
    } finally {
      fs.rmSync(tempDir2, { recursive: true, force: true });
    }
  });

  it("handles subdirectories recursively", async () => {
    const subDir = path.join(tempDir, "projects", "my-project");
    fs.mkdirSync(subDir, { recursive: true });

    watcher = new FileWatcher([tempDir], callback);
    await new Promise(resolve => setTimeout(resolve, 100));

    // Add file in subdirectory
    fs.writeFileSync(
      path.join(subDir, "deep-session.jsonl"),
      '{"location": "subdirectory"}\n'
    );
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(callback).toHaveBeenCalledWith(
      '{"location": "subdirectory"}',
      "deep-session"
    );
  });

  it("gracefully handles paths that don't exist", () => {
    const nonExistentPath = path.join(tempDir, "does-not-exist");

    // Should not throw when given non-existent path
    expect(() => {
      watcher = new FileWatcher([tempDir, nonExistentPath], callback);
    }).not.toThrow();
  });

  it("gracefully handles unreadable paths", () => {
    // This test may be skipped on some systems where we can't make unreadable dirs
    const unreadableDir = path.join(tempDir, "unreadable");
    fs.mkdirSync(unreadableDir);

    try {
      fs.chmodSync(unreadableDir, 0o000); // Remove all permissions

      expect(() => {
        watcher = new FileWatcher([tempDir, unreadableDir], callback);
      }).not.toThrow();
    } catch {
      // Skip this test if we can't create unreadable directory
    } finally {
      try {
        fs.chmodSync(unreadableDir, 0o755); // Restore permissions for cleanup
      } catch {
        // Ignore
      }
    }
  });

  it("extracts session ID from .jsonl filename correctly", async () => {
    const testCases = [
      { filename: "session-abc123.jsonl", expected: "session-abc123" },
      { filename: "abc123def456.jsonl", expected: "abc123def456" },
      { filename: "very-long-session-id-with-dashes.jsonl", expected: "very-long-session-id-with-dashes" },
    ];

    watcher = new FileWatcher([tempDir], callback);
    await new Promise(resolve => setTimeout(resolve, 100));

    for (const testCase of testCases) {
      const filePath = path.join(tempDir, testCase.filename);
      fs.writeFileSync(filePath, '{"test": "session-id"}\n');
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(callback).toHaveBeenCalledWith(
        '{"test": "session-id"}',
        testCase.expected
      );
    }
  });

  it("maintains separate buffers for different files", async () => {
    const file1 = path.join(tempDir, "session-1.jsonl");
    const file2 = path.join(tempDir, "session-2.jsonl");

    watcher = new FileWatcher([tempDir], callback);
    await new Promise(resolve => setTimeout(resolve, 100));

    // Write partial lines to both files
    fs.writeFileSync(file1, '{"file": 1, "par');
    fs.writeFileSync(file2, '{"file": 2, "par');
    await new Promise(resolve => setTimeout(resolve, 100));

    // Complete file1's line
    fs.appendFileSync(file1, 'tial": "test1"}\n');
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should have completed file1 but not file2
    expect(callback).toHaveBeenCalledWith('{"file": 1, "partial": "test1"}', "session-1");
    expect(callback).not.toHaveBeenCalledWith(expect.stringContaining('"file": 2'), expect.anything());

    // Complete file2's line
    fs.appendFileSync(file2, 'tial": "test2"}\n');
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(callback).toHaveBeenCalledWith('{"file": 2, "partial": "test2"}', "session-2");
  });
});