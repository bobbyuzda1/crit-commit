// Response parser for Claude game engine output

export interface NarrativeEventUpdate {
  type: string;
  title: string;
  description: string;
}

export interface XPAward {
  source: string;
  amount: number;
}

export interface ItemDrop {
  name: string;
  rarity: string;
  type: string;
  description: string;
}

export interface QuestUpdate {
  questId: string;
  action: "start" | "progress" | "complete" | "fail";
  title?: string;
  description?: string;
  type?: "session" | "epic";
  progress?: number;
  xpReward?: number;
}

export interface NPCName {
  name: string;
  class: string;
  description: string;
}

export interface EncounterUpdate {
  type: "combat" | "puzzle" | "story" | "boss";
  name: string;
  description: string;
  difficulty: number;
  xpReward: number;
}

export interface ZoneChoiceUpdate {
  options: Array<{
    name: string;
    description: string;
    theme: string;
    modifier: string;
    modifierValue: number;
  }>;
}

export interface GameStateUpdate {
  narrative_events: NarrativeEventUpdate[];
  xp_awards: XPAward[];
  item_drops: ItemDrop[];
  quest_updates: QuestUpdate[];
  npc_names: NPCName[];
  encounter: EncounterUpdate | null;
  zone_choice: ZoneChoiceUpdate | null;
}

function emptyUpdate(): GameStateUpdate {
  return {
    narrative_events: [],
    xp_awards: [],
    item_drops: [],
    quest_updates: [],
    npc_names: [],
    encounter: null,
    zone_choice: null,
  };
}

function safeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Extract JSON from a string that may be wrapped in markdown code fences.
 */
function extractJSON(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  return raw.trim();
}

/**
 * Parse raw Claude game engine response JSON into a typed GameStateUpdate.
 * Gracefully handles malformed JSON and missing fields.
 */
export function parseGameEngineResponse(raw: string): GameStateUpdate {
  try {
    const jsonStr = extractJSON(raw);
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    const result = emptyUpdate();

    result.narrative_events = safeArray(
      parsed.narrative_events,
    ) as NarrativeEventUpdate[];
    result.xp_awards = safeArray(parsed.xp_awards) as XPAward[];
    result.item_drops = safeArray(parsed.item_drops) as ItemDrop[];
    result.quest_updates = safeArray(parsed.quest_updates) as QuestUpdate[];
    result.npc_names = safeArray(parsed.npc_names) as NPCName[];
    result.encounter = (parsed.encounter as EncounterUpdate) ?? null;
    result.zone_choice = (parsed.zone_choice as ZoneChoiceUpdate) ?? null;

    return result;
  } catch {
    return emptyUpdate();
  }
}
