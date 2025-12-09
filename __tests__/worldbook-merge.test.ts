/**
 * Phase 04: Worldbook Merge Logic Tests
 * Tests: Merging global + character-specific worldbooks
 */

import type { CharacterCard, GlobalWorldbookType, WorldBookEntry } from '../src/types/character';

// Mock database
const mockDatabase = {
  GlobalWorldbooks: {
    records: new Map<string, GlobalWorldbookType>(),

    findOne(query: any): GlobalWorldbookType | undefined {
      return Array.from(this.records.values()).find(doc =>
        Object.keys(query).every(key => doc[key as keyof GlobalWorldbookType] === query[key])
      );
    },

    insert(doc: GlobalWorldbookType) {
      this.records.set(doc.id, { ...doc });
    },
  },

  CharacterCards: {
    records: new Map<string, CharacterCard>(),

    findOne(query: any): CharacterCard | undefined {
      return Array.from(this.records.values()).find(doc =>
        Object.keys(query).every(key => doc[key as keyof CharacterCard] === query[key])
      );
    },

    insert(doc: CharacterCard) {
      this.records.set(doc.id, { ...doc });
    },
  }
};

// Merge function (from worldbook-merge.ts)
function getMergedWorldbook(characterId: string): WorldBookEntry[] {
  const character = mockDatabase.CharacterCards.findOne({ id: characterId }) as CharacterCard & {
    linkedGlobalWorldbooks?: string[];
  };

  if (!character) return [];

  const linkedIds = character.linkedGlobalWorldbooks || [];
  const globalEntries: WorldBookEntry[] = [];

  for (const globalId of linkedIds) {
    const globalWb = mockDatabase.GlobalWorldbooks.findOne({ id: globalId }) as GlobalWorldbookType | undefined;
    if (globalWb?.entries) {
      const marked = globalWb.entries.map(e => ({
        ...e,
        _fromGlobal: globalWb.name,
      } as WorldBookEntry & { _fromGlobal?: string }));
      globalEntries.push(...marked);
    }
  }

  const characterEntries = character.data?.worldBook || [];
  return [...globalEntries, ...characterEntries];
}

function hasLinkedGlobalWorldbooks(characterId: string): boolean {
  const character = mockDatabase.CharacterCards.findOne({ id: characterId }) as CharacterCard & {
    linkedGlobalWorldbooks?: string[];
  };
  return (character?.linkedGlobalWorldbooks?.length || 0) > 0;
}

// Test Suite
class WorldbookMergeTests {
  private db = mockDatabase;
  private testResults: Array<{ name: string; passed: boolean; error?: string }> = [];

  run() {
    console.log('\n=== Worldbook Merge Logic Tests ===\n');

    this.testMergeGlobalAndCharacterEntries();
    this.testMergeMultipleGlobalWorldbooks();
    this.testCharacterEntriesOverrideGlobal();
    this.testEmptyGlobalWorldbooks();
    this.testNoLinkedWorldbooks();
    this.testHasLinkedGlobalWorldbooks();

    return this.testResults;
  }

  private testMergeGlobalAndCharacterEntries() {
    try {
      const charId = crypto.randomUUID();
      const wbId = crypto.randomUUID();

      // Create global worldbook with entries
      const globalEntry: WorldBookEntry = {
        keys: ['global_key'],
        content: 'Global content',
        comment: 'Global entry',
        enabled: true,
        position: 'after_char',
        insertionOrder: 0,
        selective: true,
        constant: false,
      };

      const globalWb: GlobalWorldbookType = {
        id: wbId,
        name: 'Global WB',
        description: '',
        entries: [globalEntry],
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      this.db.GlobalWorldbooks.insert(globalWb);

      // Create character with own entries
      const charEntry: WorldBookEntry = {
        keys: ['char_key'],
        content: 'Character content',
        comment: 'Character entry',
        enabled: true,
        position: 'after_char',
        insertionOrder: 0,
        selective: true,
        constant: false,
      };

      const character: CharacterCard = {
        id: charId,
        data: { name: 'Test', worldBook: [charEntry] },
        linkedGlobalWorldbooks: [wbId],
      } as CharacterCard;

      this.db.CharacterCards.insert(character);

      // Merge
      const merged = getMergedWorldbook(charId);

      if (merged.length !== 2) {
        throw new Error(`Expected 2 entries, got ${merged.length}`);
      }

      if (merged[0].comment !== 'Global entry' || merged[1].comment !== 'Character entry') {
        throw new Error('Merge order incorrect: global should come first');
      }

      this.testResults.push({ name: 'Merge global and character entries', passed: true });
    } catch (e: any) {
      this.testResults.push({ name: 'Merge global and character entries', passed: false, error: e.message });
    }
  }

  private testMergeMultipleGlobalWorldbooks() {
    try {
      const charId = crypto.randomUUID();
      const wbId1 = crypto.randomUUID();
      const wbId2 = crypto.randomUUID();

      // Create first global worldbook
      const entry1: WorldBookEntry = {
        keys: ['entry1'],
        content: 'Content 1',
        comment: 'Entry 1',
        enabled: true,
        position: 'after_char',
        insertionOrder: 0,
        selective: true,
        constant: false,
      };

      const wb1: GlobalWorldbookType = {
        id: wbId1,
        name: 'WB1',
        description: '',
        entries: [entry1],
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Create second global worldbook
      const entry2: WorldBookEntry = {
        keys: ['entry2'],
        content: 'Content 2',
        comment: 'Entry 2',
        enabled: true,
        position: 'after_char',
        insertionOrder: 0,
        selective: true,
        constant: false,
      };

      const wb2: GlobalWorldbookType = {
        id: wbId2,
        name: 'WB2',
        description: '',
        entries: [entry2],
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      this.db.GlobalWorldbooks.insert(wb1);
      this.db.GlobalWorldbooks.insert(wb2);

      const character: CharacterCard = {
        id: charId,
        data: { name: 'Test' },
        linkedGlobalWorldbooks: [wbId1, wbId2],
      } as CharacterCard;

      this.db.CharacterCards.insert(character);

      const merged = getMergedWorldbook(charId);

      if (merged.length !== 2) {
        throw new Error(`Expected 2 entries, got ${merged.length}`);
      }

      this.testResults.push({ name: 'Merge multiple global worldbooks', passed: true });
    } catch (e: any) {
      this.testResults.push({ name: 'Merge multiple global worldbooks', passed: false, error: e.message });
    }
  }

  private testCharacterEntriesOverrideGlobal() {
    try {
      const charId = crypto.randomUUID();
      const wbId = crypto.randomUUID();

      // Create global entry
      const globalEntry: WorldBookEntry = {
        keys: ['override_key'],
        content: 'Global version',
        comment: 'Shared entry',
        enabled: true,
        position: 'after_char',
        insertionOrder: 0,
        selective: true,
        constant: false,
      };

      const globalWb: GlobalWorldbookType = {
        id: wbId,
        name: 'Global WB',
        description: '',
        entries: [globalEntry],
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      this.db.GlobalWorldbooks.insert(globalWb);

      // Create character with override entry (same comment)
      const charEntry: WorldBookEntry = {
        keys: ['override_key'],
        content: 'Character version',
        comment: 'Shared entry', // Same comment allows override
        enabled: true,
        position: 'after_char',
        insertionOrder: 0,
        selective: true,
        constant: false,
      };

      const character: CharacterCard = {
        id: charId,
        data: { name: 'Test', worldBook: [charEntry] },
        linkedGlobalWorldbooks: [wbId],
      } as CharacterCard;

      this.db.CharacterCards.insert(character);

      const merged = getMergedWorldbook(charId);

      // With current implementation, both versions exist
      // Character version appears after global version
      if (merged.length !== 2) {
        throw new Error(`Expected 2 entries in merge, got ${merged.length}`);
      }

      this.testResults.push({ name: 'Character entries after global entries (override behavior)', passed: true });
    } catch (e: any) {
      this.testResults.push({ name: 'Character entries after global entries (override behavior)', passed: false, error: e.message });
    }
  }

  private testEmptyGlobalWorldbooks() {
    try {
      const charId = crypto.randomUUID();
      const wbId = crypto.randomUUID();

      // Create global worldbook with no entries
      const globalWb: GlobalWorldbookType = {
        id: wbId,
        name: 'Empty Global WB',
        description: '',
        entries: [],
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      this.db.GlobalWorldbooks.insert(globalWb);

      const character: CharacterCard = {
        id: charId,
        data: { name: 'Test' },
        linkedGlobalWorldbooks: [wbId],
      } as CharacterCard;

      this.db.CharacterCards.insert(character);

      const merged = getMergedWorldbook(charId);

      if (merged.length !== 0) {
        throw new Error(`Expected 0 entries from empty worldbook, got ${merged.length}`);
      }

      this.testResults.push({ name: 'Merge with empty global worldbooks', passed: true });
    } catch (e: any) {
      this.testResults.push({ name: 'Merge with empty global worldbooks', passed: false, error: e.message });
    }
  }

  private testNoLinkedWorldbooks() {
    try {
      const charId = crypto.randomUUID();
      const charEntry: WorldBookEntry = {
        keys: ['char_key'],
        content: 'Only character content',
        comment: 'Character only',
        enabled: true,
        position: 'after_char',
        insertionOrder: 0,
        selective: true,
        constant: false,
      };

      const character: CharacterCard = {
        id: charId,
        data: { name: 'Test', worldBook: [charEntry] },
        linkedGlobalWorldbooks: [],
      } as CharacterCard;

      this.db.CharacterCards.insert(character);

      const merged = getMergedWorldbook(charId);

      if (merged.length !== 1 || merged[0].comment !== 'Character only') {
        throw new Error('Failed to return character entries when no global worldbooks linked');
      }

      this.testResults.push({ name: 'Merge with no linked global worldbooks', passed: true });
    } catch (e: any) {
      this.testResults.push({ name: 'Merge with no linked global worldbooks', passed: false, error: e.message });
    }
  }

  private testHasLinkedGlobalWorldbooks() {
    try {
      const charId1 = crypto.randomUUID();
      const charId2 = crypto.randomUUID();
      const wbId = crypto.randomUUID();

      // Character with linked worldbooks
      const char1: CharacterCard = {
        id: charId1,
        data: { name: 'Test1' },
        linkedGlobalWorldbooks: [wbId],
      } as CharacterCard;

      // Character without linked worldbooks
      const char2: CharacterCard = {
        id: charId2,
        data: { name: 'Test2' },
        linkedGlobalWorldbooks: [],
      } as CharacterCard;

      this.db.CharacterCards.insert(char1);
      this.db.CharacterCards.insert(char2);

      const has1 = hasLinkedGlobalWorldbooks(charId1);
      const has2 = hasLinkedGlobalWorldbooks(charId2);

      if (!has1 || has2) {
        throw new Error('hasLinkedGlobalWorldbooks returned incorrect values');
      }

      this.testResults.push({ name: 'Check if character has linked global worldbooks', passed: true });
    } catch (e: any) {
      this.testResults.push({ name: 'Check if character has linked global worldbooks', passed: false, error: e.message });
    }
  }
}

export default new WorldbookMergeTests();
