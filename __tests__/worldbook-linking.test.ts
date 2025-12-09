/**
 * Phase 04: Character Linking to Global Worldbooks Tests
 * Tests: Link/unlink characters to global worldbooks, manage relationships
 */

import type { CharacterCard, GlobalWorldbookType } from '../src/types/character';

// Mock database
const mockDatabase = {
  GlobalWorldbooks: {
    records: new Map<string, GlobalWorldbookType>(),

    insert(doc: GlobalWorldbookType) {
      this.records.set(doc.id, { ...doc });
    },

    findOne(query: any): GlobalWorldbookType | undefined {
      return Array.from(this.records.values()).find(doc =>
        Object.keys(query).every(key => doc[key as keyof GlobalWorldbookType] === query[key])
      );
    },
  },

  CharacterCards: {
    records: new Map<string, CharacterCard>(),

    insert(doc: CharacterCard) {
      this.records.set(doc.id, { ...doc });
    },

    findOne(query: any): CharacterCard | undefined {
      return Array.from(this.records.values()).find(doc =>
        Object.keys(query).every(key => doc[key as keyof CharacterCard] === query[key])
      );
    },

    updateOne(query: any, update: any) {
      const doc = this.findOne(query);
      if (doc && update.$set) {
        Object.assign(doc, update.$set);
      }
    },
  }
};

// Test Suite
class WorldbookLinkingTests {
  private db = mockDatabase;
  private testResults: Array<{ name: string; passed: boolean; error?: string }> = [];

  run() {
    console.log('\n=== Worldbook Linking Tests ===\n');

    this.testLinkCharacterToWorldbook();
    this.testUnlinkCharacterFromWorldbook();
    this.testMultipleLinkedWorldbooks();
    this.testValidateLinkedWorldbookExists();

    return this.testResults;
  }

  private testLinkCharacterToWorldbook() {
    try {
      const charId = crypto.randomUUID();
      const wbId = crypto.randomUUID();

      // Create mock character
      const character: CharacterCard = {
        id: charId,
        data: { name: 'Test Char' },
        linkedGlobalWorldbooks: [],
      } as CharacterCard;

      this.db.CharacterCards.insert(character);

      // Create mock worldbook
      const worldbook: GlobalWorldbookType = {
        id: wbId,
        name: 'Linked WB',
        description: '',
        entries: [],
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      this.db.GlobalWorldbooks.insert(worldbook);

      // Link character to worldbook
      const updated = this.db.CharacterCards.findOne({ id: charId });
      if (!updated) throw new Error('Character not found');

      const linked = [...(updated.linkedGlobalWorldbooks || []), wbId];
      this.db.CharacterCards.updateOne(
        { id: charId },
        { $set: { linkedGlobalWorldbooks: linked } }
      );

      const result = this.db.CharacterCards.findOne({ id: charId });
      if (!result?.linkedGlobalWorldbooks?.includes(wbId)) {
        throw new Error('Failed to link worldbook to character');
      }

      this.testResults.push({ name: 'Link character to global worldbook', passed: true });
    } catch (e: any) {
      this.testResults.push({ name: 'Link character to global worldbook', passed: false, error: e.message });
    }
  }

  private testUnlinkCharacterFromWorldbook() {
    try {
      const charId = crypto.randomUUID();
      const wbId1 = crypto.randomUUID();
      const wbId2 = crypto.randomUUID();

      // Create character with multiple linked worldbooks
      const character: CharacterCard = {
        id: charId,
        data: { name: 'Test Char' },
        linkedGlobalWorldbooks: [wbId1, wbId2],
      } as CharacterCard;

      this.db.CharacterCards.insert(character);

      // Unlink first worldbook
      this.db.CharacterCards.updateOne(
        { id: charId },
        { $set: { linkedGlobalWorldbooks: [wbId2] } }
      );

      const result = this.db.CharacterCards.findOne({ id: charId });
      if (!result?.linkedGlobalWorldbooks?.includes(wbId2) || result?.linkedGlobalWorldbooks?.includes(wbId1)) {
        throw new Error('Failed to unlink worldbook correctly');
      }

      this.testResults.push({ name: 'Unlink character from global worldbook', passed: true });
    } catch (e: any) {
      this.testResults.push({ name: 'Unlink character from global worldbook', passed: false, error: e.message });
    }
  }

  private testMultipleLinkedWorldbooks() {
    try {
      const charId = crypto.randomUUID();
      const wbIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];

      const character: CharacterCard = {
        id: charId,
        data: { name: 'Test Char' },
        linkedGlobalWorldbooks: [],
      } as CharacterCard;

      this.db.CharacterCards.insert(character);

      // Create and link multiple worldbooks
      wbIds.forEach(id => {
        const wb: GlobalWorldbookType = {
          id,
          name: `WB ${id.slice(0, 8)}`,
          description: '',
          entries: [],
          tags: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        this.db.GlobalWorldbooks.insert(wb);
      });

      this.db.CharacterCards.updateOne(
        { id: charId },
        { $set: { linkedGlobalWorldbooks: wbIds } }
      );

      const result = this.db.CharacterCards.findOne({ id: charId });
      if (!result?.linkedGlobalWorldbooks || result.linkedGlobalWorldbooks.length !== 3) {
        throw new Error('Failed to link multiple worldbooks');
      }

      this.testResults.push({ name: 'Link character to multiple global worldbooks', passed: true });
    } catch (e: any) {
      this.testResults.push({ name: 'Link character to multiple global worldbooks', passed: false, error: e.message });
    }
  }

  private testValidateLinkedWorldbookExists() {
    try {
      const charId = crypto.randomUUID();
      const wbId = crypto.randomUUID();

      const character: CharacterCard = {
        id: charId,
        data: { name: 'Test Char' },
        linkedGlobalWorldbooks: [wbId],
      } as CharacterCard;

      this.db.CharacterCards.insert(character);

      // Verify the linked worldbook doesn't exist (yet)
      let wb = this.db.GlobalWorldbooks.findOne({ id: wbId });
      if (wb) throw new Error('Worldbook should not exist yet');

      // Create the worldbook
      const newWb: GlobalWorldbookType = {
        id: wbId,
        name: 'Existing WB',
        description: '',
        entries: [],
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      this.db.GlobalWorldbooks.insert(newWb);

      // Now verify it exists
      wb = this.db.GlobalWorldbooks.findOne({ id: wbId });
      if (!wb) {
        throw new Error('Failed to validate linked worldbook exists');
      }

      this.testResults.push({ name: 'Validate linked global worldbook exists', passed: true });
    } catch (e: any) {
      this.testResults.push({ name: 'Validate linked global worldbook exists', passed: false, error: e.message });
    }
  }
}

export default new WorldbookLinkingTests();
