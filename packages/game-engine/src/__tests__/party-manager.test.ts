import { describe, it, expect } from "vitest";
import { addTerminalCompanion, markIdle, markActive, removeTerminal, getActiveParty } from "../party-manager.js";
import { createStarterState, CharacterClass } from "@crit-commit/shared";

describe("addTerminalCompanion", () => {
  it("creates a PartyMember with a session ID", () => {
    const member = addTerminalCompanion("session-123", "Alice", "scout");

    expect(member.id).toBeDefined();
    expect(member.name).toBe("Alice");
    expect(member.class).toBe(CharacterClass.Scout);
    expect(member.sessionPath).toBe("session-123");
    expect(member.isActive).toBe(true);
    expect(member.lastActivity).toBeDefined();
    expect(member.isSubAgent).toBe(false);
  });

  it("handles different NPC classes", () => {
    const architect = addTerminalCompanion("session-1", "Bob", "architect");
    const battlemage = addTerminalCompanion("session-2", "Carol", "battlemage");
    const artificer = addTerminalCompanion("session-3", "Dave", "artificer");

    expect(architect.class).toBe(CharacterClass.Architect);
    expect(battlemage.class).toBe(CharacterClass.Battlemage);
    expect(artificer.class).toBe(CharacterClass.Artificer);
  });
});

describe("markIdle", () => {
  it("transitions a member to resting when marked idle", () => {
    const state = createStarterState("Hero", CharacterClass.Architect);
    const member = addTerminalCompanion("session-123", "Alice", "scout");
    state.party = [member];

    const updated = markIdle("session-123", state);
    const updatedMember = updated.party.find(p => p.sessionPath === "session-123");

    expect(updatedMember?.isActive).toBe(false);
    expect(updatedMember?.lastActivity).toBeDefined();
  });

  it("does nothing if session ID not found", () => {
    const state = createStarterState("Hero", CharacterClass.Architect);
    const member = addTerminalCompanion("session-123", "Alice", "scout");
    state.party = [member];

    const updated = markIdle("session-999", state);
    const updatedMember = updated.party.find(p => p.sessionPath === "session-123");

    expect(updatedMember?.isActive).toBe(true);
  });
});

describe("markActive", () => {
  it("transitions a member back to active", () => {
    const state = createStarterState("Hero", CharacterClass.Architect);
    const member = addTerminalCompanion("session-123", "Alice", "scout");
    member.isActive = false;
    state.party = [member];

    const updated = markActive("session-123", state);
    const updatedMember = updated.party.find(p => p.sessionPath === "session-123");

    expect(updatedMember?.isActive).toBe(true);
    expect(updatedMember?.lastActivity).toBeDefined();
  });
});

describe("removeTerminal", () => {
  it("removes a party member when session ends", () => {
    const state = createStarterState("Hero", CharacterClass.Architect);
    const member1 = addTerminalCompanion("session-123", "Alice", "scout");
    const member2 = addTerminalCompanion("session-456", "Bob", "architect");
    state.party = [member1, member2];

    const updated = removeTerminal("session-123", state);

    expect(updated.party).toHaveLength(1);
    expect(updated.party[0].sessionPath).toBe("session-456");
    expect(updated.party[0].name).toBe("Bob");
  });

  it("does nothing if session ID not found", () => {
    const state = createStarterState("Hero", CharacterClass.Architect);
    const member = addTerminalCompanion("session-123", "Alice", "scout");
    state.party = [member];

    const updated = removeTerminal("session-999", state);

    expect(updated.party).toHaveLength(1);
    expect(updated.party[0].sessionPath).toBe("session-123");
  });
});

describe("getActiveParty", () => {
  it("returns only active members", () => {
    const state = createStarterState("Hero", CharacterClass.Architect);
    const member1 = addTerminalCompanion("session-123", "Alice", "scout");
    const member2 = addTerminalCompanion("session-456", "Bob", "architect");
    const member3 = addTerminalCompanion("session-789", "Carol", "battlemage");

    member2.isActive = false; // Mark Bob as inactive
    state.party = [member1, member2, member3];

    const activeParty = getActiveParty(state);

    expect(activeParty).toHaveLength(2);
    expect(activeParty.map(p => p.name)).toEqual(["Alice", "Carol"]);
    expect(activeParty.every(p => p.isActive)).toBe(true);
  });

  it("returns empty array when no active members", () => {
    const state = createStarterState("Hero", CharacterClass.Architect);
    const member1 = addTerminalCompanion("session-123", "Alice", "scout");
    const member2 = addTerminalCompanion("session-456", "Bob", "architect");

    member1.isActive = false;
    member2.isActive = false;
    state.party = [member1, member2];

    const activeParty = getActiveParty(state);

    expect(activeParty).toHaveLength(0);
  });
});

describe("companion count tracking", () => {
  it("companion count matches number of active terminals", () => {
    const state = createStarterState("Hero", CharacterClass.Architect);

    // Add three terminal companions
    const member1 = addTerminalCompanion("session-1", "Alice", "scout");
    const member2 = addTerminalCompanion("session-2", "Bob", "architect");
    const member3 = addTerminalCompanion("session-3", "Carol", "battlemage");

    state.party = [member1, member2, member3];

    // All should be active initially
    const activeParty = getActiveParty(state);
    expect(activeParty).toHaveLength(3);

    // Mark one as idle
    const updatedState = markIdle("session-2", state);
    const activePartyAfterIdle = getActiveParty(updatedState);
    expect(activePartyAfterIdle).toHaveLength(2);

    // Remove one terminal
    const finalState = removeTerminal("session-3", updatedState);
    const finalActiveParty = getActiveParty(finalState);
    expect(finalActiveParty).toHaveLength(1);
    expect(finalState.party).toHaveLength(2); // One active, one idle
  });
});