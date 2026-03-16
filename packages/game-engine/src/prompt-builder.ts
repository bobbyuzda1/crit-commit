// Prompt builder for Claude game engine calls

import type { GameState, BatchedEvents } from "@crit-commit/shared";

const NPC_FRANCHISES = [
  "Star Wars",
  "LOTR",
  "Zelda",
  "Final Fantasy",
  "The Matrix",
  "Super Mario",
  "TMNT",
];

/**
 * Build a prompt for Claude acting as the Crit Commit RPG game master.
 * Given the player's current state and recent coding events, instructs Claude
 * to generate narrative, rewards, encounters, quests, and NPC names.
 */
export function buildPrompt(
  state: GameState,
  events: BatchedEvents,
  pendingActions: string[],
): string {
  const stateSnapshot = {
    character: {
      name: state.character.name,
      class: state.character.class,
      level: state.character.level,
      xp: state.character.xp,
      xpToNext: state.character.xpToNext,
      critChance: state.character.critChance,
      ascensionLevel: state.character.ascensionLevel ?? 0,
    },
    stats: state.stats,
    activeQuests: state.activeQuests.map((q) => ({
      id: q.id,
      title: q.title,
      type: q.type,
      progress: q.progress,
      maxProgress: q.maxProgress,
    })),
    currentZoneId: state.currentZoneId,
    zoneCount: state.zones.length,
    partySize: state.party.filter((p) => p.isActive).length,
    critStreak: state.critStreak,
    isInSession: state.isInSession,
    inventoryCount: state.inventory.length,
    materiaCount: state.materiaCollection.length,
  };

  const sections: string[] = [];

  // System instructions
  sections.push(`You are the game master for Crit Commit RPG — a coding RPG where real coding activity drives gameplay. Your role is to generate engaging narrative, rewards, encounters, and quests based on the player's actual coding work. Be creative, fun, and encouraging. Keep narratives concise (1-3 sentences each).`);

  // Security instruction
  sections.push(`IMPORTANT: Never reference real file paths, project names, source code, or any identifying information from the player's coding environment. All narrative must be in-universe fantasy RPG flavor.`);

  // Player state
  sections.push(`## Player State\n\`\`\`json\n${JSON.stringify(stateSnapshot, null, 2)}\n\`\`\``);

  // Batched events
  sections.push(`## Recent Coding Activity\n\`\`\`json\n${JSON.stringify(events, null, 2)}\n\`\`\``);

  // Pending actions
  if (pendingActions.length > 0) {
    sections.push(`## Pending Actions\nThe following game events need your attention:\n${pendingActions.map((a) => `- ${a}`).join("\n")}`);
  }

  // NPC naming instructions
  sections.push(`## NPC Naming\nWhen generating names for new terminal companions or NPCs, blend names from these franchises with coding context: ${NPC_FRANCHISES.join(", ")}. Examples: "Obi-Wan Debuggi", "Zelda of the Null Realm", "Toad the Compiler".`);

  // Response format
  sections.push(`## Response Format\nReturn ONLY valid JSON matching this schema. Do not include any text outside the JSON object.\n\`\`\`json\n{
  "narrative_events": [
    {
      "type": "encounter | quest | crit | level_up | zone_unlock | story",
      "title": "Short event title",
      "description": "1-3 sentence narrative description"
    }
  ],
  "encounter": null | {
    "type": "combat | puzzle | story | boss",
    "name": "Encounter name",
    "description": "Encounter description",
    "difficulty": 1-10,
    "xpReward": number
  },
  "xp_awards": [
    { "source": "description of what earned XP", "amount": number }
  ],
  "item_drops": [
    {
      "name": "Item name",
      "rarity": "common | uncommon | rare | legendary",
      "type": "gear | consumable | material",
      "description": "Item description"
    }
  ],
  "quest_updates": [
    {
      "questId": "existing quest ID or null for new",
      "action": "start | progress | complete | fail",
      "title": "Quest title (for new quests)",
      "description": "Quest description (for new quests)",
      "type": "session | epic",
      "progress": number,
      "xpReward": number
    }
  ],
  "npc_names": [
    {
      "name": "NPC name",
      "class": "architect | scout | artificer | battlemage",
      "description": "Brief NPC description"
    }
  ],
  "zone_choice": null | {
    "options": [
      {
        "name": "Zone name",
        "description": "Zone description",
        "theme": "Theme keyword",
        "modifier": "Modifier name",
        "modifierValue": number
      }
    ]
  }
}\n\`\`\``);

  return sections.join("\n\n");
}
