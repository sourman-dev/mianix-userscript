/**
 * Phase 04: Hybrid Worldbook Retrieval Tests
 * Tests: Retrieving relevant entries with merged worldbooks
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

// Merge function
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

// Keyword matching helper
function matchesKeywords(entry: WorldBookEntry, keywords: string[]): boolean {
  if (!entry.keys || !keywords) return false;
  return keywords.some(k => entry.keys!.some(ek => ek.toLowerCase() === k.toLowerCase()));
}

// Test Suite
class WorldbookRetrievalTests {
  private db = mockDatabase;
  private testResults: Array<{ name: string; passed: boolean; error?: string }> = [];

  run() {
    console.log('\n=== Hybrid Worldbook Retrieval Tests ===\n');

    this.testRetrieveByKeywordFromMerged();
    this.testRetrieveOnlyEnabledEntries();
    this.testRetrieveLimitResults();
    this.testRetrieveWithMultipleGlobalWorldbooks();
    this.testRetrievePreferCharacterEntries();

    return this.testResults;
  }

  private testRetrieveByKeywordFromMerged() {
    try {
      const charId = crypto.randomUUID();
      const wbId = crypto.randomUUID();

      // Create global worldbook with entries
      const globalEntry: WorldBookEntry = {
        keys: ['forest', 'nature'],
        content: 'The forest is dense',
        comment: 'Global forest info',
        enabled: true,
        position: 'after_char',
        insertionOrder: 0,
        selective: true,
        constant: false,
      };

      const globalWb: GlobalWorldbookType = {
        id: wbId,
        name: 'World Info',
        description: '',
        entries: [globalEntry],
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      this.db.GlobalWorldbooks.insert(globalWb);

      // Create character with own entry
      const charEntry: WorldBookEntry = {
        keys: ['local_lore'],
        content: 'Local culture info',
        comment: 'Character specific',
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

      // Retrieve merged worldbook
      const merged = getMergedWorldbook(charId);

      // Filter by keyword
      const forestEntries = merged.filter(e => matchesKeywords(e, ['forest']));

      if (forestEntries.length !== 1 || forestEntries[0].comment !== 'Global forest info') {
        throw new Error('Failed to retrieve entry by keyword from merged worldbook');
      }

      this.testResults.push({ name: 'Retrieve entries by keyword from merged worldbook', passed: true });
    } catch (e: any) {
      this.testResults.push({ name: 'Retrieve entries by keyword from merged worldbook', passed: false, error: e.message });
    }
  }

  private testRetrieveOnlyEnabledEntries() {
    try {
      const charId = crypto.randomUUID();
      const wbId = crypto.randomUUID();

      // Create entries: one enabled, one disabled
      const enabledEntry: WorldBookEntry = {
        keys: ['enabled'],
        content: 'This is enabled',
        comment: 'Enabled entry',
        enabled: true,
        position: 'after_char',
        insertionOrder: 0,
        selective: true,
        constant: false,
      };

      const disabledEntry: WorldBookEntry = {
        keys: ['disabled'],
        content: 'This is disabled',
        comment: 'Disabled entry',
        enabled: false,
        position: 'after_char',
        insertionOrder: 1,
        selective: true,
        constant: false,
      };

      const globalWb: GlobalWorldbookType = {
        id: wbId,
        name: 'World Info',
        description: '',
        entries: [enabledEntry, disabledEntry],
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

      // Retrieve and filter enabled
      const merged = getMergedWorldbook(charId);
      const enabled = merged.filter(e => e.enabled !== false);

      if (enabled.length !== 1 || enabled[0].comment !== 'Enabled entry') {
        throw new Error('Failed to filter enabled entries correctly');
      }

      this.testResults.push({ name: 'Retrieve only enabled worldbook entries', passed: true });
    } catch (e: any) {
      this.testResults.push({ name: 'Retrieve only enabled worldbook entries', passed: false, error: e.message });
    }
  }

  private testRetrieveLimitResults() {
    try {
      const charId = crypto.randomUUID();
      const wbId = crypto.randomUUID();

      // Create 10 entries
      const entries: WorldBookEntry[] = Array.from({ length: 10 }, (_, i) => ({
        keys: [`key${i}`],
        content: `Content ${i}`,
        comment: `Entry ${i}`,
        enabled: true,
        position: 'after_char',
        insertionOrder: i,
        selective: true,
        constant: false,
      }));

      const globalWb: GlobalWorldbookType = {
        id: wbId,
        name: 'World Info',
        description: '',
        entries,
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

      // Retrieve with limit
      const merged = getMergedWorldbook(charId);
      const limited = merged.slice(0, 5);

      if (limited.length !== 5) {
        throw new Error(`Expected 5 results with limit, got ${limited.length}`);
      }

      this.testResults.push({ name: 'Retrieve with limit on worldbook entries', passed: true });
    } catch (e: any) {
      this.testResults.push({ name: 'Retrieve with limit on worldbook entries', passed: false, error: e.message });
    }
  }

  private testRetrieveWithMultipleGlobalWorldbooks() {
    try {
      const charId = crypto.randomUUID();
      const wbId1 = crypto.randomUUID();
      const wbId2 = crypto.randomUUID();

      // Create first worldbook
      const entry1: WorldBookEntry = {
        keys: ['location'],
        content: 'Forest area',
        comment: 'From WB1',
        enabled: true,
        position: 'after_char',
        insertionOrder: 0,
        selective: true,
        constant: false,
      };

      const wb1: GlobalWorldbookType = {
        id: wbId1,
        name: 'Locations',
        description: '',
        entries: [entry1],
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Create second worldbook
      const entry2: WorldBookEntry = {
        keys: ['location'],
        content: 'City area',
        comment: 'From WB2',
        enabled: true,
        position: 'after_char',
        insertionOrder: 0,
        selective: true,
        constant: false,
      };

      const wb2: GlobalWorldbookType = {
        id: wbId2,
        name: 'Urban',
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

      // Retrieve and filter by keyword
      const merged = getMergedWorldbook(charId);
      const locationEntries = merged.filter(e => matchesKeywords(e, ['location']));

      if (locationEntries.length !== 2) {
        throw new Error(`Expected 2 entries with 'location' keyword from 2 worldbooks, got ${locationEntries.length}`);
      }

      this.testResults.push({ name: 'Retrieve from multiple global worldbooks', passed: true });
    } catch (e: any) {
      this.testResults.push({ name: 'Retrieve from multiple global worldbooks', passed: false, error: e.message });
    }
  }

  private testRetrievePreferCharacterEntries() {
    try {
      const charId = crypto.randomUUID();
      const wbId = crypto.randomUUID();

      // Global entry
      const globalEntry: WorldBookEntry = {
        keys: ['character'],
        content: 'Global character info',
        comment: 'Global',
        enabled: true,
        position: 'after_char',
        insertionOrder: 0,
        selective: true,
        constant: false,
      };

      const globalWb: GlobalWorldbookType = {
        id: wbId,
        name: 'World Info',
        description: '',
        entries: [globalEntry],
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      this.db.GlobalWorldbooks.insert(globalWb);

      // Character entry
      const charEntry: WorldBookEntry = {
        keys: ['character'],
        content: 'Character-specific info',
        comment: 'Character',
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

      // Merged worldbook has global first, then character
      const merged = getMergedWorldbook(charId);

      if (merged.length !== 2) {
        throw new Error('Expected both global and character entries in merge');
      }

      // Verify order: global first, character second
      if (merged[0].comment !== 'Global' || merged[1].comment !== 'Character') {
        throw new Error('Merge order incorrect: global should come before character');
      }

      this.testResults.push({ name: 'Merged worldbook order (global first, character second)', passed: true });
    } catch (e: any) {
      this.testResults.push({ name: 'Merged worldbook order (global first, character second)', passed: false, error: e.message });
    }
  }
}

export default new WorldbookRetrievalTests();
