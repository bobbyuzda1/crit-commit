import * as chokidar from "chokidar";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

interface FileState {
  offset: number;
  buffer: string;
}

export class FileWatcher {
  private watchers: chokidar.FSWatcher[] = [];
  private fileStates = new Map<string, FileState>();
  private onLine: (line: string, sessionId: string) => void;

  constructor(watchPaths: string[], onLine: (line: string, sessionId: string) => void) {
    this.onLine = onLine;

    for (const watchPath of watchPaths) {
      this.setupWatcher(watchPath);
    }
  }

  private setupWatcher(watchPath: string): void {
    try {
      // Resolve tilde and cross-platform paths
      const resolvedPath = this.resolvePath(watchPath);

      // Check if path exists and is readable
      if (!this.isPathAccessible(resolvedPath)) {
        // eslint-disable-next-line no-console
        console.warn(`FileWatcher: Skipping inaccessible path: ${resolvedPath}`);
        return;
      }

      // Watch the directory, filter for .jsonl files in event handlers

      const watcher = chokidar.watch(resolvedPath, {
        ignoreInitial: false,
        persistent: true,
        followSymlinks: false,
        depth: undefined, // Unlimited recursion
        usePolling: true,
        interval: 20,
      });

      watcher.on("add", (filePath) => {
        // Only handle .jsonl files
        if (path.extname(filePath) === ".jsonl") {
          this.handleFileAdded(filePath);
        }
      });

      watcher.on("change", (filePath) => {
        // Only handle .jsonl files
        if (path.extname(filePath) === ".jsonl") {
          this.handleFileChanged(filePath);
        }
      });

      watcher.on("unlink", (filePath) => {
        // Only handle .jsonl files
        if (path.extname(filePath) === ".jsonl") {
          this.handleFileRemoved(filePath);
        }
      });

      watcher.on("error", (error) => {
        // eslint-disable-next-line no-console
        console.error(`FileWatcher error for ${resolvedPath}:`, error);
      });

      watcher.on("ready", () => {
        // Ready to watch - silent operation
      });

      this.watchers.push(watcher);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`FileWatcher: Failed to set up watcher for ${watchPath}:`, error);
    }
  }

  private resolvePath(watchPath: string): string {
    // Handle tilde expansion
    if (watchPath.startsWith("~")) {
      return path.join(os.homedir(), watchPath.slice(1));
    }

    // On Windows, check for APPDATA fallback if needed
    if (process.platform === "win32" && watchPath.includes("claude/projects")) {
      const appDataPath = process.env.APPDATA;
      if (appDataPath && !path.isAbsolute(watchPath)) {
        const fallbackPath = path.join(appDataPath, watchPath);
        if (this.isPathAccessible(fallbackPath)) {
          return fallbackPath;
        }
      }
    }

    return path.resolve(watchPath);
  }

  private isPathAccessible(filePath: string): boolean {
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  private handleFileAdded(filePath: string): void {
    // Initialize file state for new files
    this.fileStates.set(filePath, {
      offset: 0,
      buffer: "",
    });

    // Read entire file content for newly added files
    this.handleFileChanged(filePath);
  }

  private handleFileRemoved(filePath: string): void {
    // Clean up file state when file is removed
    this.fileStates.delete(filePath);
  }

  private handleFileChanged(filePath: string): void {
    let fd: number | null = null;

    try {
      const fileState = this.fileStates.get(filePath) || {
        offset: 0,
        buffer: "",
      };

      // Read from the last offset
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;

      if (fileSize < fileState.offset) {
        // File was truncated or replaced, reset
        fileState.offset = 0;
        fileState.buffer = "";
      }

      const bufferSize = fileSize - fileState.offset;

      if (bufferSize > 0) {
        // Open file descriptor
        fd = fs.openSync(filePath, "r");

        const buffer = Buffer.alloc(bufferSize);
        fs.readSync(fd, buffer, 0, bufferSize, fileState.offset);

        const newContent = buffer.toString("utf8");
        const allContent = fileState.buffer + newContent;

        // Process complete lines
        const lines = allContent.split("\n");

        // Keep last line as buffer if it doesn't end with newline
        fileState.buffer = lines.pop() || "";

        // Process all complete lines
        for (const line of lines) {
          if (line.trim()) {
            const sessionId = this.extractSessionId(filePath);
            this.onLine(line, sessionId);
          }
        }

        // Update offset
        fileState.offset = fileSize;
        this.fileStates.set(filePath, fileState);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`FileWatcher: Error reading file ${filePath}:`, error);
    } finally {
      // Always close file descriptor if it was opened
      if (fd !== null) {
        try {
          fs.closeSync(fd);
        } catch (closeError) {
          // eslint-disable-next-line no-console
          console.error(`FileWatcher: Error closing file descriptor for ${filePath}:`, closeError);
        }
      }
    }
  }

  private extractSessionId(filePath: string): string {
    const basename = path.basename(filePath);
    // Remove .jsonl extension to get session ID
    return basename.replace(/\.jsonl$/, "");
  }

  public async close(): Promise<void> {
    const closePromises = this.watchers.map(watcher =>
      new Promise<void>((resolve) => {
        watcher.close().then(() => resolve()).catch(() => resolve());
      })
    );

    await Promise.all(closePromises);
    this.watchers = [];
    this.fileStates.clear();
  }
}