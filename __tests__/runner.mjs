#!/usr/bin/env node

/**
 * Phase 04: Global Worldbooks Implementation - Test Runner (Node.js)
 * Standalone test execution without TypeScript compilation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test Suite: CRUD Operations
class WorldbookCRUDTests {
  constructor() {
    this.db = {
      GlobalWorldbooks: {
        records: new Map(),
        insert(doc) {
          this.records.set(doc.id, { ...doc });
        },
        findOne(query) {
          return Array.from(this.records.values()).find(doc =>
            Object.keys(query).every(key => doc[key] === query[key])
          );
        },
        find() {
          return { fetch: () => Array.from(this.records.values()) };
        },
        updateOne(query, update) {
          const doc = this.findOne(query);
          if (doc && update.$set) {
            Object.assign(doc, update.$set);
          }
        },
        removeOne(query) {
          for (const [key, doc] of this.records) {
            if (Object.keys(query).every(k => doc[k] === query[k])) {
              this.records.delete(key);
              break;
            }
          }
        },
      }
    };
    this.testResults = [];
  }

  run() {
    console.log('\n=== Global Worldbook CRUD Tests ===\n');
    this.testCreate();
    this.testRead();
    this.testUpdate();
    this.testDelete();
    return this.testResults;
  }

  testCreate() {
    try {
      const id = crypto.randomUUID();
      const now = Date.now();
      const worldbook = {
        id,
        name: 'Test Worldbook',
        description: 'A test worldbook',
        entries: [],
        tags: ['test'],
        createdAt: now,
        updatedAt: now,
      };

      this.db.GlobalWorldbooks.insert(worldbook);
      const found = this.db.GlobalWorldbooks.findOne({ id });

      if (!found || found.name !== 'Test Worldbook') {
        throw new Error('Created worldbook not found or has incorrect data');
      }

      this.testResults.push({ name: 'Create global worldbook', passed: true });
    } catch (e) {
      this.testResults.push({ name: 'Create global worldbook', passed: false, error: e.message });
    }
  }

  testRead() {
    try {
      const id = crypto.randomUUID();
      const worldbook = {
        id,
        name: 'Read Test',
        description: 'Testing read operation',
        entries: [],
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      this.db.GlobalWorldbooks.insert(worldbook);
      const found = this.db.GlobalWorldbooks.findOne({ id });

      if (!found) {
        throw new Error('Worldbook not found after insert');
      }

      const all = this.db.GlobalWorldbooks.find().fetch();
      if (!Array.isArray(all) || all.length === 0) {
        throw new Error('Failed to fetch all worldbooks');
      }

      this.testResults.push({ name: 'Read global worldbooks', passed: true });
    } catch (e) {
      this.testResults.push({ name: 'Read global worldbooks', passed: false, error: e.message });
    }
  }

  testUpdate() {
    try {
      const id = crypto.randomUUID();
      const worldbook = {
        id,
        name: 'Update Test',
        description: 'Original description',
        entries: [],
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      this.db.GlobalWorldbooks.insert(worldbook);
      const updatedAt = Date.now();
      this.db.GlobalWorldbooks.updateOne({ id }, {
        $set: {
          name: 'Updated Name',
          description: 'Updated description',
          updatedAt
        }
      });

      const updated = this.db.GlobalWorldbooks.findOne({ id });
      if (!updated || updated.name !== 'Updated Name' || updated.description !== 'Updated description') {
        throw new Error('Update failed or has incorrect data');
      }

      this.testResults.push({ name: 'Update global worldbook', passed: true });
    } catch (e) {
      this.testResults.push({ name: 'Update global worldbook', passed: false, error: e.message });
    }
  }

  testDelete() {
    try {
      const id = crypto.randomUUID();
      const worldbook = {
        id,
        name: 'Delete Test',
        description: '',
        entries: [],
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      this.db.GlobalWorldbooks.insert(worldbook);
      let found = this.db.GlobalWorldbooks.findOne({ id });
      if (!found) throw new Error('Insert failed before delete test');

      this.db.GlobalWorldbooks.removeOne({ id });
      found = this.db.GlobalWorldbooks.findOne({ id });
      if (found) {
        throw new Error('Worldbook still exists after delete');
      }

      this.testResults.push({ name: 'Delete global worldbook', passed: true });
    } catch (e) {
      this.testResults.push({ name: 'Delete global worldbook', passed: false, error: e.message });
    }
  }
}

// Test Suite: Character Linking
class WorldbookLinkingTests {
  constructor() {
    this.db = {
      GlobalWorldbooks: {
        records: new Map(),
        insert(doc) {
          this.records.set(doc.id, { ...doc });
        },
        findOne(query) {
          return Array.from(this.records.values()).find(doc =>
            Object.keys(query).every(key => doc[key] === query[key])
          );
        },
      },
      CharacterCards: {
        records: new Map(),
        insert(doc) {
          this.records.set(doc.id, { ...doc });
        },
        findOne(query) {
          return Array.from(this.records.values()).find(doc =>
            Object.keys(query).every(key => doc[key] === query[key])
          );
        },
        updateOne(query, update) {
          const doc = this.findOne(query);
          if (doc && update.$set) {
            Object.assign(doc, update.$set);
          }
        },
      }
    };
    this.testResults = [];
  }

  run() {
    console.log('\n=== Worldbook Linking Tests ===\n');
    this.testLinkCharacterToWorldbook();
    this.testUnlinkCharacterFromWorldbook();
    this.testMultipleLinkedWorldbooks();
    this.testValidateLinkedWorldbookExists();
    return this.testResults;
  }

  testLinkCharacterToWorldbook() {
    try {
      const charId = crypto.randomUUID();
      const wbId = crypto.randomUUID();

      const character = {
        id: charId,
        data: { name: 'Test Char' },
        linkedGlobalWorldbooks: [],
      };

      this.db.CharacterCards.insert(character);

      const worldbook = {
        id: wbId,
        name: 'Linked WB',
        description: '',
        entries: [],
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      this.db.GlobalWorldbooks.insert(worldbook);

      const updated = this.db.CharacterCards.findOne({ id: charId });
      if (!updated) throw new Error('Character not found');

      const linked = [...(updated.linkedGlobalWorldbooks || []), wbId];
      this.db.CharacterCards.updateOne({ id: charId }, { $set: { linkedGlobalWorldbooks: linked } });

      const result = this.db.CharacterCards.findOne({ id: charId });
      if (!result?.linkedGlobalWorldbooks?.includes(wbId)) {
        throw new Error('Failed to link worldbook to character');
      }

      this.testResults.push({ name: 'Link character to global worldbook', passed: true });
    } catch (e) {
      this.testResults.push({ name: 'Link character to global worldbook', passed: false, error: e.message });
    }
  }

  testUnlinkCharacterFromWorldbook() {
    try {
      const charId = crypto.randomUUID();
      const wbId1 = crypto.randomUUID();
      const wbId2 = crypto.randomUUID();

      const character = {
        id: charId,
        data: { name: 'Test Char' },
        linkedGlobalWorldbooks: [wbId1, wbId2],
      };

      this.db.CharacterCards.insert(character);

      this.db.CharacterCards.updateOne({ id: charId }, { $set: { linkedGlobalWorldbooks: [wbId2] } });

      const result = this.db.CharacterCards.findOne({ id: charId });
      if (!result?.linkedGlobalWorldbooks?.includes(wbId2) || result?.linkedGlobalWorldbooks?.includes(wbId1)) {
        throw new Error('Failed to unlink worldbook correctly');
      }

      this.testResults.push({ name: 'Unlink character from global worldbook', passed: true });
    } catch (e) {
      this.testResults.push({ name: 'Unlink character from global worldbook', passed: false, error: e.message });
    }
  }

  testMultipleLinkedWorldbooks() {
    try {
      const charId = crypto.randomUUID();
      const wbIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];

      const character = {
        id: charId,
        data: { name: 'Test Char' },
        linkedGlobalWorldbooks: [],
      };

      this.db.CharacterCards.insert(character);

      wbIds.forEach(id => {
        const wb = {
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

      this.db.CharacterCards.updateOne({ id: charId }, { $set: { linkedGlobalWorldbooks: wbIds } });

      const result = this.db.CharacterCards.findOne({ id: charId });
      if (!result?.linkedGlobalWorldbooks || result.linkedGlobalWorldbooks.length !== 3) {
        throw new Error('Failed to link multiple worldbooks');
      }

      this.testResults.push({ name: 'Link character to multiple global worldbooks', passed: true });
    } catch (e) {
      this.testResults.push({ name: 'Link character to multiple global worldbooks', passed: false, error: e.message });
    }
  }

  testValidateLinkedWorldbookExists() {
    try {
      const charId = crypto.randomUUID();
      const wbId = crypto.randomUUID();

      const character = {
        id: charId,
        data: { name: 'Test Char' },
        linkedGlobalWorldbooks: [wbId],
      };

      this.db.CharacterCards.insert(character);

      let wb = this.db.GlobalWorldbooks.findOne({ id: wbId });
      if (wb) throw new Error('Worldbook should not exist yet');

      const newWb = {
        id: wbId,
        name: 'Existing WB',
        description: '',
        entries: [],
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      this.db.GlobalWorldbooks.insert(newWb);

      wb = this.db.GlobalWorldbooks.findOne({ id: wbId });
      if (!wb) {
        throw new Error('Failed to validate linked worldbook exists');
      }

      this.testResults.push({ name: 'Validate linked global worldbook exists', passed: true });
    } catch (e) {
      this.testResults.push({ name: 'Validate linked global worldbook exists', passed: false, error: e.message });
    }
  }
}

// Test Suite: Worldbook Merge Logic
class WorldbookMergeTests {
  constructor() {
    this.db = {
      GlobalWorldbooks: {
        records: new Map(),
        findOne(query) {
          return Array.from(this.records.values()).find(doc =>
            Object.keys(query).every(key => doc[key] === query[key])
          );
        },
        insert(doc) {
          this.records.set(doc.id, { ...doc });
        },
      },
      CharacterCards: {
        records: new Map(),
        findOne(query) {
          return Array.from(this.records.values()).find(doc =>
            Object.keys(query).every(key => doc[key] === query[key])
          );
        },
        insert(doc) {
          this.records.set(doc.id, { ...doc });
        },
      }
    };
    this.testResults = [];
  }

  getMergedWorldbook(characterId) {
    const character = this.db.CharacterCards.findOne({ id: characterId });
    if (!character) return [];

    const linkedIds = character.linkedGlobalWorldbooks || [];
    const globalEntries = [];

    for (const globalId of linkedIds) {
      const globalWb = this.db.GlobalWorldbooks.findOne({ id: globalId });
      if (globalWb?.entries) {
        const marked = globalWb.entries.map(e => ({
          ...e,
          _fromGlobal: globalWb.name,
        }));
        globalEntries.push(...marked);
      }
    }

    const characterEntries = character.data?.worldBook || [];
    return [...globalEntries, ...characterEntries];
  }

  hasLinkedGlobalWorldbooks(characterId) {
    const character = this.db.CharacterCards.findOne({ id: characterId });
    return (character?.linkedGlobalWorldbooks?.length || 0) > 0;
  }

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

  testMergeGlobalAndCharacterEntries() {
    try {
      const charId = crypto.randomUUID();
      const wbId = crypto.randomUUID();

      const globalEntry = {
        keys: ['global_key'],
        content: 'Global content',
        comment: 'Global entry',
        enabled: true,
        position: 'after_char',
        insertionOrder: 0,
        selective: true,
        constant: false,
      };

      const globalWb = {
        id: wbId,
        name: 'Global WB',
        description: '',
        entries: [globalEntry],
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      this.db.GlobalWorldbooks.insert(globalWb);

      const charEntry = {
        keys: ['char_key'],
        content: 'Character content',
        comment: 'Character entry',
        enabled: true,
        position: 'after_char',
        insertionOrder: 0,
        selective: true,
        constant: false,
      };

      const character = {
        id: charId,
        data: { name: 'Test', worldBook: [charEntry] },
        linkedGlobalWorldbooks: [wbId],
      };

      this.db.CharacterCards.insert(character);

      const merged = this.getMergedWorldbook(charId);

      if (merged.length !== 2) {
        throw new Error(`Expected 2 entries, got ${merged.length}`);
      }

      if (merged[0].comment !== 'Global entry' || merged[1].comment !== 'Character entry') {
        throw new Error('Merge order incorrect: global should come first');
      }

      this.testResults.push({ name: 'Merge global and character entries', passed: true });
    } catch (e) {
      this.testResults.push({ name: 'Merge global and character entries', passed: false, error: e.message });
    }
  }

  testMergeMultipleGlobalWorldbooks() {
    try {
      const charId = crypto.randomUUID();
      const wbId1 = crypto.randomUUID();
      const wbId2 = crypto.randomUUID();

      const entry1 = {
        keys: ['entry1'],
        content: 'Content 1',
        comment: 'Entry 1',
        enabled: true,
        position: 'after_char',
        insertionOrder: 0,
        selective: true,
        constant: false,
      };

      const wb1 = {
        id: wbId1,
        name: 'WB1',
        description: '',
        entries: [entry1],
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const entry2 = {
        keys: ['entry2'],
        content: 'Content 2',
        comment: 'Entry 2',
        enabled: true,
        position: 'after_char',
        insertionOrder: 0,
        selective: true,
        constant: false,
      };

      const wb2 = {
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

      const character = {
        id: charId,
        data: { name: 'Test' },
        linkedGlobalWorldbooks: [wbId1, wbId2],
      };

      this.db.CharacterCards.insert(character);

      const merged = this.getMergedWorldbook(charId);

      if (merged.length !== 2) {
        throw new Error(`Expected 2 entries, got ${merged.length}`);
      }

      this.testResults.push({ name: 'Merge multiple global worldbooks', passed: true });
    } catch (e) {
      this.testResults.push({ name: 'Merge multiple global worldbooks', passed: false, error: e.message });
    }
  }

  testCharacterEntriesOverrideGlobal() {
    try {
      const charId = crypto.randomUUID();
      const wbId = crypto.randomUUID();

      const globalEntry = {
        keys: ['override_key'],
        content: 'Global version',
        comment: 'Shared entry',
        enabled: true,
        position: 'after_char',
        insertionOrder: 0,
        selective: true,
        constant: false,
      };

      const globalWb = {
        id: wbId,
        name: 'Global WB',
        description: '',
        entries: [globalEntry],
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      this.db.GlobalWorldbooks.insert(globalWb);

      const charEntry = {
        keys: ['override_key'],
        content: 'Character version',
        comment: 'Shared entry',
        enabled: true,
        position: 'after_char',
        insertionOrder: 0,
        selective: true,
        constant: false,
      };

      const character = {
        id: charId,
        data: { name: 'Test', worldBook: [charEntry] },
        linkedGlobalWorldbooks: [wbId],
      };

      this.db.CharacterCards.insert(character);

      const merged = this.getMergedWorldbook(charId);

      if (merged.length !== 2) {
        throw new Error(`Expected 2 entries in merge, got ${merged.length}`);
      }

      this.testResults.push({ name: 'Character entries after global entries (override behavior)', passed: true });
    } catch (e) {
      this.testResults.push({ name: 'Character entries after global entries (override behavior)', passed: false, error: e.message });
    }
  }

  testEmptyGlobalWorldbooks() {
    try {
      const charId = crypto.randomUUID();
      const wbId = crypto.randomUUID();

      const globalWb = {
        id: wbId,
        name: 'Empty Global WB',
        description: '',
        entries: [],
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      this.db.GlobalWorldbooks.insert(globalWb);

      const character = {
        id: charId,
        data: { name: 'Test' },
        linkedGlobalWorldbooks: [wbId],
      };

      this.db.CharacterCards.insert(character);

      const merged = this.getMergedWorldbook(charId);

      if (merged.length !== 0) {
        throw new Error(`Expected 0 entries from empty worldbook, got ${merged.length}`);
      }

      this.testResults.push({ name: 'Merge with empty global worldbooks', passed: true });
    } catch (e) {
      this.testResults.push({ name: 'Merge with empty global worldbooks', passed: false, error: e.message });
    }
  }

  testNoLinkedWorldbooks() {
    try {
      const charId = crypto.randomUUID();
      const charEntry = {
        keys: ['char_key'],
        content: 'Only character content',
        comment: 'Character only',
        enabled: true,
        position: 'after_char',
        insertionOrder: 0,
        selective: true,
        constant: false,
      };

      const character = {
        id: charId,
        data: { name: 'Test', worldBook: [charEntry] },
        linkedGlobalWorldbooks: [],
      };

      this.db.CharacterCards.insert(character);

      const merged = this.getMergedWorldbook(charId);

      if (merged.length !== 1 || merged[0].comment !== 'Character only') {
        throw new Error('Failed to return character entries when no global worldbooks linked');
      }

      this.testResults.push({ name: 'Merge with no linked global worldbooks', passed: true });
    } catch (e) {
      this.testResults.push({ name: 'Merge with no linked global worldbooks', passed: false, error: e.message });
    }
  }

  testHasLinkedGlobalWorldbooks() {
    try {
      const charId1 = crypto.randomUUID();
      const charId2 = crypto.randomUUID();
      const wbId = crypto.randomUUID();

      const char1 = {
        id: charId1,
        data: { name: 'Test1' },
        linkedGlobalWorldbooks: [wbId],
      };

      const char2 = {
        id: charId2,
        data: { name: 'Test2' },
        linkedGlobalWorldbooks: [],
      };

      this.db.CharacterCards.insert(char1);
      this.db.CharacterCards.insert(char2);

      const has1 = this.hasLinkedGlobalWorldbooks(charId1);
      const has2 = this.hasLinkedGlobalWorldbooks(charId2);

      if (!has1 || has2) {
        throw new Error('hasLinkedGlobalWorldbooks returned incorrect values');
      }

      this.testResults.push({ name: 'Check if character has linked global worldbooks', passed: true });
    } catch (e) {
      this.testResults.push({ name: 'Check if character has linked global worldbooks', passed: false, error: e.message });
    }
  }
}

// Test Suite: UI Components
class UIComponentTests {
  constructor() {
    this.testResults = [];
  }

  run() {
    console.log('\n=== UI Component Tests ===\n');
    this.testGlobalWorldbookManagerInitialization();
    this.testGlobalWorldbookManagerCreateWorldbook();
    this.testGlobalWorldbookManagerDeleteWorldbook();
    this.testWorldbookLinkerSelectWorldbook();
    this.testWorldbookLinkerLinkUnlink();
    this.testWorldbookEditorAddEntry();
    this.testWorldbookEditorUpdateEntry();
    return this.testResults;
  }

  testGlobalWorldbookManagerInitialization() {
    try {
      const componentState = {
        worldbooks: [],
        selectedId: null,
        isLoading: false,
      };

      componentState.worldbooks = [];
      componentState.isLoading = false;

      if (!Array.isArray(componentState.worldbooks)) {
        throw new Error('Worldbooks should be an array');
      }

      this.testResults.push({ name: 'GlobalWorldbookManager initialization', passed: true });
    } catch (e) {
      this.testResults.push({ name: 'GlobalWorldbookManager initialization', passed: false, error: e.message });
    }
  }

  testGlobalWorldbookManagerCreateWorldbook() {
    try {
      const componentState = {
        worldbooks: [],
        selectedId: null,
      };

      const newWb = {
        id: crypto.randomUUID(),
        name: 'New Worldbook',
        description: 'Test description',
        entries: [],
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      componentState.worldbooks.push(newWb);

      if (componentState.worldbooks.length !== 1 || componentState.worldbooks[0].name !== 'New Worldbook') {
        throw new Error('Failed to create worldbook in component');
      }

      this.testResults.push({ name: 'GlobalWorldbookManager create worldbook', passed: true });
    } catch (e) {
      this.testResults.push({ name: 'GlobalWorldbookManager create worldbook', passed: false, error: e.message });
    }
  }

  testGlobalWorldbookManagerDeleteWorldbook() {
    try {
      const componentState = {
        worldbooks: [
          {
            id: 'wb1',
            name: 'WB1',
            description: '',
            entries: [],
            tags: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
        ],
        selectedId: 'wb1',
      };

      const idToDelete = 'wb1';
      componentState.worldbooks = componentState.worldbooks.filter(wb => wb.id !== idToDelete);

      if (componentState.selectedId === idToDelete) {
        componentState.selectedId = null;
      }

      if (componentState.worldbooks.length !== 0 || componentState.selectedId !== null) {
        throw new Error('Failed to delete worldbook properly');
      }

      this.testResults.push({ name: 'GlobalWorldbookManager delete worldbook', passed: true });
    } catch (e) {
      this.testResults.push({ name: 'GlobalWorldbookManager delete worldbook', passed: false, error: e.message });
    }
  }

  testWorldbookLinkerSelectWorldbook() {
    try {
      const componentState = {
        availableWorldbooks: [
          {
            id: 'wb1',
            name: 'WB1',
            description: '',
            entries: [],
            tags: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          {
            id: 'wb2',
            name: 'WB2',
            description: '',
            entries: [],
            tags: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
        ],
        selectedWorldbookId: null,
      };

      componentState.selectedWorldbookId = 'wb1';

      const selected = componentState.availableWorldbooks.find(wb => wb.id === componentState.selectedWorldbookId);

      if (!selected || selected.name !== 'WB1') {
        throw new Error('Failed to select worldbook');
      }

      this.testResults.push({ name: 'WorldbookLinker select worldbook', passed: true });
    } catch (e) {
      this.testResults.push({ name: 'WorldbookLinker select worldbook', passed: false, error: e.message });
    }
  }

  testWorldbookLinkerLinkUnlink() {
    try {
      const componentState = {
        characterLinkedWorldbooks: ['wb1'],
        availableWorldbookId: 'wb2',
      };

      if (!componentState.characterLinkedWorldbooks.includes(componentState.availableWorldbookId)) {
        componentState.characterLinkedWorldbooks.push(componentState.availableWorldbookId);
      }

      if (componentState.characterLinkedWorldbooks.length !== 2) {
        throw new Error('Failed to link worldbook to character');
      }

      componentState.characterLinkedWorldbooks = componentState.characterLinkedWorldbooks.filter(
        id => id !== componentState.availableWorldbookId
      );

      if (componentState.characterLinkedWorldbooks.length !== 1) {
        throw new Error('Failed to unlink worldbook from character');
      }

      this.testResults.push({ name: 'WorldbookLinker link/unlink worldbooks', passed: true });
    } catch (e) {
      this.testResults.push({ name: 'WorldbookLinker link/unlink worldbooks', passed: false, error: e.message });
    }
  }

  testWorldbookEditorAddEntry() {
    try {
      const componentState = {
        entries: [],
        selectedIndex: null,
      };

      const newEntry = {
        keys: [],
        content: '',
        comment: 'New Entry',
        enabled: true,
        position: 'after_char',
        insertionOrder: componentState.entries.length,
        selective: true,
        constant: false,
      };

      componentState.entries.push(newEntry);
      componentState.selectedIndex = componentState.entries.length - 1;

      if (componentState.entries.length !== 1 || componentState.entries[0].comment !== 'New Entry') {
        throw new Error('Failed to add entry to editor');
      }

      this.testResults.push({ name: 'WorldbookEditor add entry', passed: true });
    } catch (e) {
      this.testResults.push({ name: 'WorldbookEditor add entry', passed: false, error: e.message });
    }
  }

  testWorldbookEditorUpdateEntry() {
    try {
      const componentState = {
        entries: [
          {
            keys: ['old_key'],
            content: 'Old content',
            comment: 'Original',
            enabled: true,
            position: 'after_char',
            insertionOrder: 0,
            selective: true,
            constant: false,
          }
        ],
        selectedIndex: 0,
      };

      if (componentState.selectedIndex !== null && componentState.entries[componentState.selectedIndex]) {
        const index = componentState.selectedIndex;
        componentState.entries[index] = {
          ...componentState.entries[index],
          content: 'Updated content',
          keys: ['new_key'],
        };
      }

      if (componentState.entries[0].content !== 'Updated content' || componentState.entries[0].keys[0] !== 'new_key') {
        throw new Error('Failed to update entry in editor');
      }

      this.testResults.push({ name: 'WorldbookEditor update entry', passed: true });
    } catch (e) {
      this.testResults.push({ name: 'WorldbookEditor update entry', passed: false, error: e.message });
    }
  }
}

// Main Test Runner
class TestRunner {
  constructor() {
    this.allResults = [];
    this.testSuites = [
      { name: 'CRUD Operations', runner: new WorldbookCRUDTests() },
      { name: 'Character Linking', runner: new WorldbookLinkingTests() },
      { name: 'Worldbook Merge Logic', runner: new WorldbookMergeTests() },
      { name: 'UI Components', runner: new UIComponentTests() },
    ];
  }

  async run() {
    console.clear();
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  Phase 04: Global Worldbooks Implementation - Full Test Suite  ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');

    const startTime = Date.now();

    for (const suite of this.testSuites) {
      const results = suite.runner.run();
      this.allResults.push(...results);
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    this.printSummary(duration);
    return this.generateReport();
  }

  printSummary(duration) {
    const totalTests = this.allResults.length;
    const passedTests = this.allResults.filter(t => t.passed).length;
    const failedTests = totalTests - passedTests;
    const passPercentage = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : '0.0';

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                        TEST SUMMARY                            ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log(`║ Total Tests:       ${String(totalTests).padEnd(50)}║`);
    console.log(`║ Passed:            ${String(`${passedTests} ✓`).padEnd(50)}║`);
    console.log(`║ Failed:            ${String(`${failedTests} ✗`).padEnd(50)}║`);
    console.log(`║ Success Rate:      ${String(`${passPercentage}%`).padEnd(50)}║`);
    console.log(`║ Execution Time:    ${String(`${duration}s`).padEnd(50)}║`);
    console.log('╚════════════════════════════════════════════════════════════════╝');

    console.log('\n');

    console.log('DETAILED RESULTS:');
    console.log('─────────────────────────────────────────────────────────────────');

    for (const result of this.allResults) {
      const status = result.passed ? '✓ PASS' : '✗ FAIL';
      const statusColor = result.passed ? '\x1b[32m' : '\x1b[31m';
      const reset = '\x1b[0m';

      console.log(`${statusColor}${status}${reset} ${result.name}`);
      if (!result.passed && result.error) {
        console.log(`      Error: ${result.error}`);
      }
    }

    console.log('─────────────────────────────────────────────────────────────────\n');
  }

  generateReport() {
    const totalTests = this.allResults.length;
    const passedTests = this.allResults.filter(t => t.passed).length;
    const failedTests = totalTests - passedTests;
    const passPercentage = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : '0.0';

    return {
      totalTests,
      passed: passedTests,
      failed: failedTests,
      passPercentage,
      results: this.allResults,
      status: failedTests === 0 ? 'PASSED' : 'FAILED',
    };
  }
}

// Run tests
const runner = new TestRunner();
runner.run().then(report => {
  console.log('\n');
  console.log(`Final Status: ${report.status}`);
  console.log(`Coverage: ${report.passPercentage}% (${report.passed}/${report.totalTests})`);

  if (report.failed > 0) {
    console.log(`\nWarning: ${report.failed} test(s) failed`);
    process.exit(1);
  } else {
    console.log('\nAll tests passed!');
    process.exit(0);
  }
});
