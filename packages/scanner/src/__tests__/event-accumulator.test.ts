import { describe, it, expect, beforeEach } from "vitest";
import { EventAccumulator } from "../event-accumulator.js";

describe("EventAccumulator", () => {
  let acc: EventAccumulator;
  beforeEach(() => { acc = new EventAccumulator(); });

  it("starts with zero counts", () => {
    const summary = acc.flush(5);
    expect(summary.events.edits).toBe(0);
    expect(summary.events.totalToolUses).toBe(0);
  });

  it("counts tool_use events by type", () => {
    acc.addEvent({ type: "tool_use", toolName: "Edit", sessionId: "s1", timestamp: new Date().toISOString() });
    acc.addEvent({ type: "tool_use", toolName: "Edit", sessionId: "s1", timestamp: new Date().toISOString() });
    acc.addEvent({ type: "tool_use", toolName: "Read", sessionId: "s1", timestamp: new Date().toISOString() });
    const summary = acc.flush(5);
    expect(summary.events.edits).toBe(2);
    expect(summary.events.reads).toBe(1);
    expect(summary.events.totalToolUses).toBe(3);
  });

  it("tracks detected languages", () => {
    acc.addEvent({ type: "tool_use", toolName: "Edit", fileExtension: ".ts", sessionId: "s1", timestamp: new Date().toISOString() });
    acc.addEvent({ type: "tool_use", toolName: "Edit", fileExtension: ".py", sessionId: "s1", timestamp: new Date().toISOString() });
    const summary = acc.flush(5);
    expect(summary.languagesDetected).toContain(".ts");
    expect(summary.languagesDetected).toContain(".py");
  });

  it("resets after flush", () => {
    acc.addEvent({ type: "tool_use", toolName: "Edit", sessionId: "s1", timestamp: new Date().toISOString() });
    acc.flush(5);
    const summary = acc.flush(5);
    expect(summary.events.edits).toBe(0);
  });

  it("tracks active terminals", () => {
    acc.addEvent({ type: "tool_use", toolName: "Edit", sessionId: "s1", timestamp: new Date().toISOString() });
    acc.addEvent({ type: "tool_use", toolName: "Read", sessionId: "s2", timestamp: new Date().toISOString() });
    const summary = acc.flush(5);
    expect(summary.terminalsActive).toHaveLength(2);
  });
});