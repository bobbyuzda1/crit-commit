/**
 * Party Manager - Terminal companions and sub-agent lifecycle management
 *
 * Manages the lifecycle of party members linked to terminal sessions and sub-agents.
 * NPC naming is deferred to Claude (the game engine generates names) — this module
 * manages lifecycle only.
 */

import { GameState, PartyMember, CharacterClass } from "@crit-commit/shared";
import { randomBytes } from "crypto";

/**
 * Creates a new party member linked to a terminal session
 */
export function addTerminalCompanion(sessionId: string, name: string, npcClass: string): PartyMember {
  const id = randomBytes(8).toString("hex");

  // Map string class to CharacterClass enum
  let characterClass: CharacterClass;
  switch (npcClass.toLowerCase()) {
    case "architect":
      characterClass = CharacterClass.Architect;
      break;
    case "scout":
      characterClass = CharacterClass.Scout;
      break;
    case "artificer":
      characterClass = CharacterClass.Artificer;
      break;
    case "battlemage":
      characterClass = CharacterClass.Battlemage;
      break;
    default:
      // Default to Scout if unknown class
      characterClass = CharacterClass.Scout;
  }

  return {
    id,
    name,
    class: characterClass,
    sessionPath: sessionId,
    isActive: true,
    lastActivity: new Date().toISOString(),
    isSubAgent: false
  };
}

/**
 * Transitions a party member to "resting" (inactive) state
 */
export function markIdle(sessionId: string, state: GameState): GameState {
  const updatedParty = state.party.map(member => {
    if (member.sessionPath === sessionId) {
      return {
        ...member,
        isActive: false,
        lastActivity: new Date().toISOString()
      };
    }
    return member;
  });

  return {
    ...state,
    party: updatedParty
  };
}

/**
 * Transitions a party member back to "active" state
 */
export function markActive(sessionId: string, state: GameState): GameState {
  const updatedParty = state.party.map(member => {
    if (member.sessionPath === sessionId) {
      return {
        ...member,
        isActive: true,
        lastActivity: new Date().toISOString()
      };
    }
    return member;
  });

  return {
    ...state,
    party: updatedParty
  };
}

/**
 * Removes a party member when their terminal session ends
 */
export function removeTerminal(sessionId: string, state: GameState): GameState {
  const updatedParty = state.party.filter(member => member.sessionPath !== sessionId);

  return {
    ...state,
    party: updatedParty
  };
}

/**
 * Returns only the active party members
 */
export function getActiveParty(state: GameState): PartyMember[] {
  return state.party.filter(member => member.isActive);
}

/**
 * Creates a sub-agent companion (summoned creature)
 */
export function addSubAgent(parentSessionId: string, name: string, subAgentType: string): PartyMember {
  const id = randomBytes(8).toString("hex");

  // Sub-agents get random classes for variety
  const classes = [CharacterClass.Architect, CharacterClass.Scout, CharacterClass.Artificer, CharacterClass.Battlemage];
  const randomClass = classes[Math.floor(Math.random() * classes.length)];

  return {
    id,
    name,
    class: randomClass,
    sessionPath: parentSessionId,
    isActive: true,
    lastActivity: new Date().toISOString(),
    isSubAgent: true,
    subAgentType
  };
}

/**
 * Removes all sub-agents associated with a terminal session
 */
export function removeSubAgents(sessionId: string, state: GameState): GameState {
  const updatedParty = state.party.filter(member =>
    !(member.sessionPath === sessionId && member.isSubAgent)
  );

  return {
    ...state,
    party: updatedParty
  };
}