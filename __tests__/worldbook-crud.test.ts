/**
 * Phase 04: Global Worldbook CRUD Operations Tests
 * Tests: Create, Read, Update, Delete operations for global worldbooks
 */

import type { GlobalWorldbookType, WorldBookEntry } from '../src/types/character';

// Mock database
const mockDatabase = {
  GlobalWorldbooks: {
    records: new Map<string, GlobalWorldbookType>(),

    insert(doc: GlobalWorldbookType) {
      this.records.set(doc.id, { ...doc });
    },

    findOne(query: any): GlobalWorldbookType | undefined {
      return Array.from(this.records.values()).find(
        doc => Object.keys(query).every(key => doc[key as keyof GlobalWorldbookType] === query[key])
      );
    },

    find(): any {
      return { fetch: () => Array.from(this.records.values()) };
    },

    updateOne(query: any, update: any) {
      const doc = this.findOne(query);
      if (doc && update.$set) {
        Object.assign(doc, update.$set);
      }
    },

    removeOne(query: any) {
      for (const [key, doc] of this.records) {
        if (Object.keys(query).every(k => doc[k as keyof GlobalWorldbookType] === query[k])) {
          this.records.delete(key);
          break;
        }
      }
    },
  }
};

// Test Suite
class WorldbookCRUDTests {
  private db = mockDatabase;
  private testResults: Array<{ name: string; passed: boolean; error?: string }> = [];

  run() {
    console.log('\n=== Global Worldbook CRUD Tests ===\n');

    this.testCreate();
    this.testRead();
    this.testUpdate();
    this.testDelete();

    return this.testResults;
  }

  private testCreate() {
    try {
      const id = crypto.randomUUID();
      const now = Date.now();

      const worldbook: GlobalWorldbookType = {
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
    } catch (e: any) {
      this.testResults.push({ name: 'Create global worldbook', passed: false, error: e.message });
    }
  }

  private testRead() {
    try {
      const id = crypto.randomUUID();
      const worldbook: GlobalWorldbookType = {
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
    } catch (e: any) {
      this.testResults.push({ name: 'Read global worldbooks', passed: false, error: e.message });
    }
  }

  private testUpdate() {
    try {
      const id = crypto.randomUUID();
      const worldbook: GlobalWorldbookType = {
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
      this.db.GlobalWorldbooks.updateOne(
        { id },
        {
          $set: {
            name: 'Updated Name',
            description: 'Updated description',
            updatedAt
          }
        }
      );

      const updated = this.db.GlobalWorldbooks.findOne({ id });
      if (!updated || updated.name !== 'Updated Name' || updated.description !== 'Updated description') {
        throw new Error('Update failed or has incorrect data');
      }

      this.testResults.push({ name: 'Update global worldbook', passed: true });
    } catch (e: any) {
      this.testResults.push({ name: 'Update global worldbook', passed: false, error: e.message });
    }
  }

  private testDelete() {
    try {
      const id = crypto.randomUUID();
      const worldbook: GlobalWorldbookType = {
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
    } catch (e: any) {
      this.testResults.push({ name: 'Delete global worldbook', passed: false, error: e.message });
    }
  }
}

export default new WorldbookCRUDTests();
