import { GameState, Quest, QuestState } from "@crit-commit/shared";
import type { CodingEventSummary } from "@crit-commit/shared";

const MAX_MICRO_QUESTS = 3;

/**
 * Rules-based engine for generating micro-quests from coding activity
 */
export class MicroQuestEngine {
  private seenLanguages = new Set<string>();

  constructor() {
    // Initialize with common languages to avoid triggering Foreign Lands too easily
    this.seenLanguages.add(".js");
    this.seenLanguages.add(".ts");
  }

  /**
   * Add a detected language/file extension
   */
  addDetectedLanguage(extension: string): void {
    this.seenLanguages.add(extension);
  }

  /**
   * Check if any new languages were detected in the current session
   */
  hasNewLanguage(): boolean {
    // This would be called with current session's detected languages
    // For now, we'll assume new languages are detected if the set grows
    return this.seenLanguages.size > 2; // Started with 2 (.js, .ts)
  }

  /**
   * Evaluate coding events and generate appropriate micro-quests
   */
  evaluate(state: GameState, events: CodingEventSummary): Quest[] {
    const newQuests: Quest[] = [];
    const now = new Date().toISOString();

    // Rule 1: Edit 5 files = "Edit 5 files" quest
    if (events.edits >= 5) {
      newQuests.push(this.createQuest(
        "file-editor-5",
        "Edit 5 files",
        "Your fingers dance across the keyboard, reshaping code with purpose.",
        15,
        now
      ));
    }

    // Rule 2: 3 searches = "Investigate the codebase" quest
    if (events.grepSearches >= 3) {
      newQuests.push(this.createQuest(
        "codebase-investigator",
        "Investigate the codebase",
        "Like a detective following clues, you search through the digital archives.",
        12,
        now
      ));
    }

    // Rule 3: Test run detected = "Test your mettle" quest
    if (events.testsRun > 0 || events.testsPassed > 0) {
      newQuests.push(this.createQuest(
        "test-runner",
        "Test your mettle",
        "The crucible of testing reveals the true strength of your code.",
        18,
        now
      ));
    }

    // Rule 4: First git commit of day = "Dawn Patrol" quest
    if (events.gitCommits > 0 && this.isFirstCommitOfDay(state)) {
      newQuests.push(this.createQuest(
        "dawn-patrol",
        "Dawn Patrol",
        "As dawn breaks over the repository, you commit your first changes of the day.",
        25,
        now
      ));
    }

    // Rule 5: New language detected = "Foreign Lands" quest
    if (events.languagesDetected.length > 0 && this.hasNewLanguageInEvents(events)) {
      newQuests.push(this.createQuest(
        "foreign-lands",
        "Foreign Lands",
        "You venture into uncharted territory, mastering new languages of code.",
        20,
        now
      ));
    }

    // Limit to MAX_MICRO_QUESTS
    return newQuests.slice(0, MAX_MICRO_QUESTS);
  }

  private createQuest(
    id: string,
    title: string,
    description: string,
    xpReward: number,
    _timestamp: string
  ): Quest {
    return {
      id,
      title,
      description,
      type: "micro",
      tier: 1,
      state: QuestState.Available,
      progress: 0,
      maxProgress: 1,
      xpReward,
      itemRewards: [], // Micro-quests typically don't give items
      completedAt: undefined,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };
  }

  private isFirstCommitOfDay(state: GameState): boolean {
    // Check if this is the first commit today by looking at recent quest history
    const today = new Date().toDateString();
    const dawnPatrolToday = state.completedQuests.find(
      q => q.id === "dawn-patrol" &&
           q.completedAt &&
           new Date(q.completedAt).toDateString() === today
    );

    return !dawnPatrolToday;
  }

  private hasNewLanguageInEvents(events: CodingEventSummary): boolean {
    // Check if any of the detected languages are new to us
    return events.languagesDetected.some(lang => !this.seenLanguages.has(lang));
  }
}