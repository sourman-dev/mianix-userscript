This file is a merged representation of the entire codebase, combined into a single document by Repomix.
The content has been processed where security check has been disabled.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Security check has been disabled - content may contain sensitive information
- Files are sorted by Git change count (files with more changes are at the bottom)

# createPersistenceAdapter

```ts
import { createPersistenceAdapter } from '@signaldb/core'
```

While SignalDB comes with a few built-in Persistence Adapters, there may be scenarios where you need to create a custom one to cater to specific requirements.

You can create a custom persistene adapter by calling `createPersistenceAdapter` and supplying a `PersistenceAdapter` compatible object as follows:

```ts
interface Changeset<T> {
  added:    T[],
  modified: T[],
  removed:  T[],
}

// contains either items or changes (but not both)
type LoadResponse<T> =
    { items:  T[],   changes?: never }
  | { items?: never, changes:  Changeset<T> }

interface PersistenceAdapter<T> {
  register(onChange: (data?: LoadResponse<T>) => void | Promise<void>): Promise<void>,
  load(): Promise<LoadResponse<T>>,
  save(items: T[], changes: Changeset<T>): Promise<void>,
  unregister?(): Promise<void>,
}
```

* **register** is called when initializing the collection.  The `onChange` function should be called when data in the adapter was updated externally so the collection can update its internal memory. You can optionally directly pass a `LoadResponse<T>` object returned from the `load` function to make the implementation of your adapter more straightforward.
* **load** is called to load data from the adapter and should return a `LoadResponse<T>` which includes either an `items` property containing all of the items, or a `changeset` property containing only the changes.  The collection will update its internal memory by either replacing all of its items, or applying the changeset to make differential changes, respectively.
* **save** is called when data was updated, and should save the data.  Both `items` and `changes` are provided so you can chose which one you'd like to use.
* **unregister?** *(optional)* is called when the `dispose` method of the collection is called. Allows you to clean up things.

Here is a short example how the File system persistence adapter is implemented:

```js
import fs from 'fs'
import { createPersistenceAdapter } from '@signaldb/core'

export default function createFilesystemAdapter(filename: string) {
  return createPersistenceAdapter({
    async register(onChange) {
      const exists = await fs.promises.access(filename).then(() => true).catch(() => false)
      if (!exists) await fs.promises.writeFile(filename, '[]')
      fs.watch(filename, { encoding: 'utf8' }, () => {
        void onChange()
      })
    },
    async load() {
      const exists = await fs.promises.access(filename).then(() => true).catch(() => false)
      if (!exists) return { items: [] }
      const contents = await fs.promises.readFile(filename, 'utf8')
      const items = JSON.parse(contents)
      return { items }
    },
    async save(items) {
      await fs.promises.writeFile(filename, JSON.stringify(items))
    },
  })
}
```


# Directory Structure of persistence-adapters
```
persistence-adapters/
  fs/
    __tests__/
      adapter.spec.ts
    src/
      index.ts
    CHANGELOG.md
    package.json
    README.md
    tsconfig.json
    typedoc.json
    vite.config.mts
    vitest.config.mts
  indexeddb/
    __tests__/
      adapter.spec.ts
    src/
      index.ts
    CHANGELOG.md
    package.json
    README.md
    tsconfig.json
    typedoc.json
    vite.config.mts
    vitest.config.mts
  localstorage/
    __tests__/
      adapter.spec.ts
    src/
      index.ts
    CHANGELOG.md
    package.json
    README.md
    tsconfig.json
    typedoc.json
    vite.config.mts
    vitest.config.mts
  opfs/
    __tests__/
      adapter.spec.ts
    src/
      index.ts
    CHANGELOG.md
    package.json
    README.md
    tsconfig.json
    typedoc.json
    vite.config.mts
    vitest.config.mts
```

# Files

## File: persistence-adapters/fs/__tests__/adapter.spec.ts
```typescript
import fs from 'fs/promises'
import type { EventEmitter } from '@signaldb/core'
import { it, expect } from 'vitest'
import { Collection } from '@signaldb/core'
import createFilesystemAdapter from '../src'

/**
 * Waits for a specific event to be emitted.
 * @template T
 * @param emitter - The event emitter instance.
 * @param event - The name of the event to wait for.
 * @param [timeout] - Optional timeout in milliseconds.
 * @returns A promise that resolves with the event value.
 */
async function waitForEvent<T>(
  emitter: EventEmitter<any>,
  event: string,
  timeout?: number,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = timeout && setTimeout(() => {
      reject(new Error('waitForEvent timeout'))
    }, timeout)

    emitter.once(event, (value: T) => {
      if (timeoutId) clearTimeout(timeoutId)
      resolve(value)
    })
  })
}

it('should persist changes to filesystem', { retry: 5 }, async () => {
  const file = `/tmp/${Math.floor(Math.random() * 1e17).toString(16)}.json`
  const persistence = createFilesystemAdapter(file)
  const collection = new Collection({ persistence })
  collection.on('persistence.error', (error) => {
    expect(error).toBeUndefined()
  })
  await waitForEvent(collection, 'persistence.init')

  collection.insert({ id: '1', name: 'John' })
  await waitForEvent(collection, 'persistence.transmitted')

  const contents = await fs.readFile(file, 'utf8')
  expect(JSON.parse(contents)).toEqual([{ id: '1', name: 'John' }])
})

it('should persist data that was modified before persistence.init', { retry: 5 }, async () => {
  const file = `/tmp/${Math.floor(Math.random() * 1e17).toString(16)}.json`
  const persistence = createFilesystemAdapter(file)
  await persistence.save([], { added: [], removed: [], modified: [] })
  const collection = new Collection({ persistence })
  collection.insert({ id: '1', name: 'John' })
  collection.insert({ id: '2', name: 'Jane' })
  collection.updateOne({ id: '1' }, { $set: { name: 'Johnny' } })
  collection.removeOne({ id: '2' })
  await waitForEvent(collection, 'persistence.init')

  const items = collection.find().fetch()
  expect(items).toEqual([{ id: '1', name: 'Johnny' }])
  const contents = await fs.readFile(file, 'utf8')
  expect(JSON.parse(contents)).toEqual([{ id: '1', name: 'Johnny' }])
})
```

## File: persistence-adapters/fs/src/index.ts
```typescript
import { createPersistenceAdapter } from '@signaldb/core'

/**
 * Creates a persistence adapter for managing a SignalDB collection backed by a filesystem.
 * This adapter reads and writes data to a file, providing serialization and deserialization options.
 * @template T - The type of the items in the collection.
 * @template I - The type of the unique identifier for the items.
 * @param filename - The name of the file to read/write data from/to.
 * @param options - Optional configuration for serialization and deserialization.
 * @param options.serialize - A function to serialize items to a string (default: `JSON.stringify`).
 * @param options.deserialize - A function to deserialize a string into items (default: `JSON.parse`).
 * @returns A SignalDB persistence adapter for managing data in the filesystem.
 * @example
 * import createFilesystemAdapter from './createFilesystemAdapter';
 *
 * const adapter = createFilesystemAdapter('data.json', {
 *   serialize: (items) => JSON.stringify(items, null, 2), // Pretty-print JSON
 *   deserialize: (itemsString) => JSON.parse(itemsString), // Default JSON parse
 * });
 *
 * const collection = new Collection({
 *   persistence: adapter,
 * });
 *
 * // Perform operations on the collection, and changes will be reflected in the file.
 */
export default function createFilesystemAdapter<
  T extends { id: I } & Record<string, any>,
  I,
>(
  filename: string,
  options?: {
    serialize?: (items: T[]) => string,
    deserialize?: (itemsString: string) => T[],
  },
) {
  const { serialize = JSON.stringify, deserialize = JSON.parse } = options || {}

  let savePromise: Promise<void> | null = null

  /**
   * Retrieves the items from the file.
   * @returns A promise that resolves to an array of items.
   */
  async function getItems(): Promise<T[]> {
    const fs = await import('fs')
    const exists = await fs.promises.access(filename).then(() => true).catch(() => false)
    if (!exists) return []
    const serializedItems = await fs.promises.readFile(filename, 'utf8').catch((error) => {
      /* istanbul ignore next -- @preserve */
      if (error.code === 'ENOENT') return
      /* istanbul ignore next -- @preserve */
      throw error
    })
    return serializedItems ? deserialize(serializedItems) : []
  }

  return createPersistenceAdapter<T, I>({
    async register(onChange) {
      // eslint-disable-next-line unicorn/prefer-global-this
      if (typeof window !== 'undefined') throw new Error('Filesystem adapter is not supported in the browser')
      const fs = await import('fs')
      const exists = await fs.promises.access(filename).then(() => true).catch(() => false)
      if (!exists) await fs.promises.writeFile(filename, '[]')
      fs.watch(filename, { encoding: 'utf8' }, () => {
        void onChange()
      })
    },
    async load() {
      // eslint-disable-next-line unicorn/prefer-global-this
      if (typeof window !== 'undefined') throw new Error('Filesystem adapter is not supported in the browser')
      if (savePromise) await savePromise
      const items = await getItems()
      return { items }
    },
    async save(_items, { added, modified, removed }) {
      // eslint-disable-next-line unicorn/prefer-global-this
      if (typeof window !== 'undefined') throw new Error('Filesystem adapter is not supported in the browser')
      if (savePromise) await savePromise
      savePromise = getItems()
        .then((currentItems) => {
          const items = [...currentItems]
          added.forEach((item) => {
            const index = items.findIndex(({ id }) => id === item.id)
            /* istanbul ignore if -- @preserve */
            if (index !== -1) {
              items[index] = item
              return
            }
            items.push(item)
          })
          modified.forEach((item) => {
            const index = items.findIndex(({ id }) => id === item.id)
            /* istanbul ignore if -- @preserve */
            if (index === -1) {
              items.push(item)
              return
            }
            items[index] = item
          })
          removed.forEach((item) => {
            const index = items.findIndex(({ id }) => id === item.id)
            /* istanbul ignore if -- @preserve */
            if (index === -1) return
            items.splice(index, 1)
          })
          return items
        })
        .then(async (items) => {
          const fs = await import('fs')
          await fs.promises.writeFile(filename, serialize(items))
        })
        .then(() => {
          savePromise = null
        })
      await savePromise
    },
  })
}
```

## File: persistence-adapters/fs/CHANGELOG.md
```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

* Custom deserialize function now works correctly when file is empty (thanks to @krolebord!)

## [1.0.1] - 2025-04-24

### Fixed

* Avoid duplicate ids and unnecessary errors

## [1.0.0] - 2024-12-16

### Added

* Added JSDoc comments to public API
```

## File: persistence-adapters/fs/package.json
```json
{
  "name": "@signaldb/fs",
  "version": "1.0.1",
  "description": "",
  "scripts": {
    "build": "rimraf dist && vite build",
    "analyze-bundle": "bundle-analyzer ./dist --upload-token=$BUNDLE_ANALYZER_UPLOAD_TOKEN --bundle-name=@signaldb/fs",
    "test": "vitest"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/maxnowack/signaldb.git"
  },
  "homepage": "https://signaldb.js.org",
  "keywords": [
    "filesystem",
    "client-database",
    "client",
    "database",
    "local-database",
    "offline-first",
    "optimistic-ui",
    "plugin",
    "reactive",
    "reactivity",
    "solid",
    "synchronization",
    "typescript"
  ],
  "author": "Max Nowack <max.nowack@gmail.com>",
  "license": "MIT",
  "sideEffects": false,
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.umd.js",
      "default": "./dist/index.umd.js"
    }
  },
  "main": "./dist/index.umd.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "typesVersions": {
    "*": {
      "*": [
        "./dist/*",
        "./dist/index.d.ts"
      ]
    }
  },
  "files": [
    "dist"
  ],
  "peerDependencies": {
    "@signaldb/core": "1.x"
  }
}
```

## File: persistence-adapters/fs/README.md
```markdown
# @signaldb/fs

This is the filesystem persistence adapter for [SignalDB](https://github.com/maxnowack/signaldb). SignalDB is a local-first JavaScript database with real-time sync, enabling optimistic UI with signal-based reactivity across multiple frameworks.

See https://signaldb.js.org/reference/fs/ for more information.
```

## File: persistence-adapters/fs/tsconfig.json
```json
{
  "extends": "../../../tsconfig.json",
  "exclude": [
    "**/*.spec.ts",
  ],
  "include": [
    "src/**/*.ts"
  ]
}
```

## File: persistence-adapters/fs/typedoc.json
```json
{
     "extends": ["../../../typedoc.base.json"],
     "entryPoints": ["src/index.ts"]
 }
```

## File: persistence-adapters/fs/vite.config.mts
```
/// <reference types="vitest" />
import path from 'path'
import { defineConfig } from 'vite'
import typescript from '@rollup/plugin-typescript'
import { typescriptPaths } from 'rollup-plugin-typescript-paths'
import dts from 'vite-plugin-dts'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    dts(),
    tsconfigPaths(),
  ],
  build: {
    manifest: true,
    minify: true,
    sourcemap: true,
    reportCompressedSize: true,
    lib: {
      name: 'SignalDB',
      entry: path.resolve(__dirname, 'src/index.ts'),
      fileName: format => (format === 'es' ? 'index.mjs' : `index.${format}.js`),
    },
    rollupOptions: {
      external: [
        '@signaldb/core',
        'fs',
      ],
      plugins: [
        typescriptPaths({
          preserveExtensions: true,
        }),
        typescript({
          sourceMap: false,
          declaration: true,
          outDir: 'dist',
        }),
      ],
    },
  },
})
```

## File: persistence-adapters/fs/vitest.config.mts
```
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.mts'

export default mergeConfig(viteConfig, defineConfig({}))
```

## File: persistence-adapters/indexeddb/__tests__/adapter.spec.ts
```typescript
// @vitest-environment happy-dom
import type { EventEmitter } from '@signaldb/core'
import { describe, it, expect } from 'vitest'
import { Collection } from '@signaldb/core'
import 'fake-indexeddb/auto'
import createIndexedDBAdapter from '../src'

/**
 * Waits for a specific event to be emitted.
 * @param emitter - The event emitter.
 * @param event - The event to wait for.
 * @param [timeout] - Optional timeout in milliseconds.
 * @returns A promise that resolves with the event value.
 */
async function waitForEvent<T>(
  emitter: EventEmitter<any>,
  event: string,
  timeout?: number,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = timeout && setTimeout(() => {
      reject(new Error('waitForEvent timeout'))
    }, timeout)

    emitter.once(event, (value: T) => {
      if (timeoutId) clearTimeout(timeoutId)
      resolve(value)
    })
  })
}

describe('Persistence', () => {
  describe('IndexedDB', () => {
    it('should load items from IndexedDB persistence adapter', async () => {
      const persistence = createIndexedDBAdapter(`test-${Math.floor(Math.random() * 1e17).toString(16)}`)
      await persistence.save([], { added: [{ id: '1', name: 'John' }], removed: [], modified: [] })
      const collection = new Collection({ persistence })
      await waitForEvent(collection, 'persistence.init')
      const items = collection.find().fetch()
      expect(items).toEqual([{ id: '1', name: 'John' }])
    })

    it('should save items to IndexedDB persistence adapter', async () => {
      const persistence = createIndexedDBAdapter(`test-${Math.floor(Math.random() * 1e17).toString(16)}`)
      await persistence.save([], { added: [], removed: [], modified: [] })
      const collection = new Collection({ persistence })
      await waitForEvent(collection, 'persistence.init')
      collection.insert({ id: '1', name: 'John' })
      await waitForEvent(collection, 'persistence.transmitted')
      const items = collection.find().fetch()
      expect(items).toEqual([{ id: '1', name: 'John' }])
      const loadResult = await persistence.load()
      expect(loadResult.items).toEqual([{ id: '1', name: 'John' }])
    })

    it('should remove item from IndexedDB persistence adapter', async () => {
      const persistence = createIndexedDBAdapter(`test-${Math.floor(Math.random() * 1e17).toString(16)}`)
      await persistence.save([], { added: [{ id: '1', name: 'John' }, { id: '2', name: 'Jane' }], removed: [], modified: [] })
      const collection = new Collection({ persistence })
      await waitForEvent(collection, 'persistence.init')

      collection.removeOne({ id: '1' })
      await waitForEvent(collection, 'persistence.transmitted')

      const items = collection.find().fetch()
      expect(items).toEqual([{ id: '2', name: 'Jane' }])
      const loadResult = await persistence.load()
      expect(loadResult.items).toEqual([{ id: '2', name: 'Jane' }])
    })

    it('should update item in IndexedDB persistence adapter', async () => {
      const persistence = createIndexedDBAdapter(`test-${Math.floor(Math.random() * 1e17).toString(16)}`)
      await persistence.save([], { added: [{ id: '1', name: 'John' }], removed: [], modified: [] })
      const collection = new Collection({ persistence })
      await waitForEvent(collection, 'persistence.init')

      collection.updateOne({ id: '1' }, { $set: { name: 'Johnny' } })
      await waitForEvent(collection, 'persistence.transmitted')

      const items = collection.find().fetch()
      expect(items).toEqual([{ id: '1', name: 'Johnny' }])
      const loadResult = await persistence.load()
      expect(loadResult.items).toEqual([{ id: '1', name: 'Johnny' }])
    })

    it('should not modify original items in IndexedDB persistence adapter', async () => {
      const persistence = createIndexedDBAdapter(`test-${Math.floor(Math.random() * 1e17).toString(16)}`)
      const originalItems = [{ id: '1', name: 'John' }]
      await persistence.save([], { added: originalItems, removed: [], modified: [] })
      const collection = new Collection({ persistence })
      await waitForEvent(collection, 'persistence.init')

      collection.insert({ id: '2', name: 'Jane' })
      await waitForEvent(collection, 'persistence.transmitted')

      expect(originalItems).toEqual([{ id: '1', name: 'John' }])
    })

    it('should handle multiple operations in order', async () => {
      const persistence = createIndexedDBAdapter(`test-${Math.floor(Math.random() * 1e17).toString(16)}`)
      await persistence.save([], { added: [], removed: [], modified: [] })
      const collection = new Collection({ persistence })
      await waitForEvent(collection, 'persistence.init')

      collection.insert({ id: '1', name: 'John' })
      await waitForEvent(collection, 'persistence.transmitted')
      collection.insert({ id: '2', name: 'Jane' })
      await waitForEvent(collection, 'persistence.transmitted')
      collection.removeOne({ id: '1' })
      await waitForEvent(collection, 'persistence.transmitted')

      const items = collection.find().fetch()
      expect(items).toEqual([{ id: '2', name: 'Jane' }])
      const loadResult = await persistence.load()
      expect(loadResult.items).toEqual([{ id: '2', name: 'Jane' }])
    })

    it('should persist data that was modified before persistence.init on client side', { retry: 5 }, async () => {
      const persistence = createIndexedDBAdapter(`test-${Math.floor(Math.random() * 1e17).toString(16)}`)
      await persistence.save([], { added: [], removed: [], modified: [] })
      const collection = new Collection({ persistence })
      collection.insert({ id: '1', name: 'John' })
      collection.insert({ id: '2', name: 'Jane' })
      collection.updateOne({ id: '1' }, { $set: { name: 'Johnny' } })
      collection.removeOne({ id: '2' })
      await waitForEvent(collection, 'persistence.init')

      const items = collection.find().fetch()
      expect(items).toEqual([{ id: '1', name: 'Johnny' }])
      const loadResult = await persistence.load()
      expect(loadResult.items).toEqual([{ id: '1', name: 'Johnny' }])
    })

    it('should not overwrite persisted data if items is undefined and changeSet is empty.', async () => {
      const persistence = createIndexedDBAdapter(`test-${Math.floor(Math.random() * 1e17).toString(16)}`)
      await persistence.save([], { added: [{ id: '1', name: 'John' }], removed: [], modified: [] })
      const collection = new Collection({ persistence })
      await waitForEvent(collection, 'persistence.init')
      await persistence.save([], { added: [], removed: [], modified: [] })
      const items = collection.find().fetch()
      expect(items).toEqual([{ id: '1', name: 'John' }])
      const loadResult = await persistence.load()
      expect(loadResult.items).toEqual([{ id: '1', name: 'John' }])
    })

    it('should use custom prefix when provided in options', async () => {
      const collectionName = `test-${Math.floor(Math.random() * 1e17).toString(16)}`
      const customPrefix = 'custom-prefix-'
      const persistence = createIndexedDBAdapter(collectionName, { prefix: customPrefix })
      await persistence.save([], { added: [{ id: '1', name: 'John' }], removed: [], modified: [] })

      // Verify data was saved with the custom prefix by opening the database directly
      const openRequest = indexedDB.open(`${customPrefix}${collectionName}`, 1)
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        openRequest.addEventListener('success', () => resolve(openRequest.result))
        openRequest.addEventListener('error', () => reject(new Error('Failed to open database with custom prefix')))
      })

      const transaction = database.transaction('items', 'readonly')
      const store = transaction.objectStore('items')
      const getAllRequest = store.getAll()

      const items = await new Promise<any[]>((resolve, reject) => {
        getAllRequest.addEventListener('success', () => resolve(getAllRequest.result))
        getAllRequest.addEventListener('error', () => reject(new Error('Failed to get items')))
      })

      expect(items).toEqual([{ id: '1', name: 'John' }])
      database.close()
    })
  })
})
```

## File: persistence-adapters/indexeddb/src/index.ts
```typescript
import { createPersistenceAdapter } from '@signaldb/core'

/**
 * Creates a persistence adapter for managing a SignalDB collection using IndexedDB.
 * This adapter reads and writes data to an IndexedDB object store, with customizable serialization and deserialization.
 * @template T - The type of the items in the collection.
 * @template I - The type of the unique identifier for the items.
 * @param name - A unique name for the collection, used as the database name.
 * @param options - Optional configuration for the adapter.
 * @param options.prefix - A prefix to be added to the database name (default: 'signaldb-').
 * @returns A SignalDB persistence adapter for managing data in IndexedDB.
 */
export default function createIndexedDBAdapter<
  T extends { id: I } & Record<string, any>,
  I extends IDBValidKey,
>(name: string, options?: { prefix?: string }) {
  const { prefix = 'signaldb-' } = options || {}
  const databaseName = `${prefix}${name}`
  const storeName = 'items'

  /**
   * Opens the IndexedDB database and creates the object store if it doesn't exist.
   * @returns A promise that resolves with the opened database.
   */
  function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1)
      request.addEventListener('upgradeneeded', () => {
        const database = request.result
        if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName, { keyPath: 'id' })
        }
      })
      request.addEventListener('success', () => resolve(request.result))
      request.addEventListener('error', () => reject(new Error(request.error?.message || 'Database error')))
    })
  }

  /**
   * Retrieves all items from the IndexedDB object store.
   * @returns A promise that resolves with an array of items.
   */
  async function getAllItems(): Promise<T[]> {
    const database = await openDatabase()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()
      request.addEventListener('success', () => resolve(request.result as T[]))
      request.addEventListener('error', () => reject(new Error(request.error?.message || 'Error fetching items')))
    })
  }

  return createPersistenceAdapter<T, I>({
    async load() {
      const items = await getAllItems()
      return { items }
    },
    async save(items, { added, modified, removed }) {
      const database = await openDatabase()
      const transaction = database.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)

      added.forEach(item => store.add(item))
      modified.forEach(item => store.put(item))
      removed.forEach(item => store.delete(item.id))

      return new Promise((resolve, reject) => {
        transaction.addEventListener('complete', () => resolve())
        transaction.addEventListener('error', () => reject(new Error(transaction.error?.message || 'Transaction error')))
      })
    },
    async register() {
      return
    },
  })
}
```

## File: persistence-adapters/indexeddb/CHANGELOG.md
```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2025-05-08

### Added

* Added support for custom database prefix option (thanks to @pierissimo!)

## [1.0.0] - 2025-01-06

* Initial release
```

## File: persistence-adapters/indexeddb/package.json
```json
{
  "name": "@signaldb/indexeddb",
  "version": "1.1.0",
  "description": "",
  "scripts": {
    "build": "rimraf dist && vite build",
    "analyze-bundle": "bundle-analyzer ./dist --upload-token=$BUNDLE_ANALYZER_UPLOAD_TOKEN --bundle-name=@signaldb/indexeddb",
    "test": "vitest"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/maxnowack/signaldb.git"
  },
  "homepage": "https://signaldb.js.org",
  "keywords": [
    "indexeddb",
    "client-database",
    "client",
    "database",
    "local-database",
    "offline-first",
    "optimistic-ui",
    "plugin",
    "reactive",
    "reactivity",
    "solid",
    "synchronization",
    "typescript"
  ],
  "author": "Max Nowack <max.nowack@gmail.com>",
  "license": "MIT",
  "sideEffects": false,
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.umd.js",
      "default": "./dist/index.umd.js"
    }
  },
  "main": "./dist/index.umd.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "typesVersions": {
    "*": {
      "*": [
        "./dist/*",
        "./dist/index.d.ts"
      ]
    }
  },
  "files": [
    "dist"
  ],
  "devDependencies": {
    "fake-indexeddb": "6.0.1"
  },
  "peerDependencies": {
    "@signaldb/core": "1.x"
  }
}
```

## File: persistence-adapters/indexeddb/README.md
```markdown
# @signaldb/indexeddb

This is the `IndexedDB` persistence adapter for [SignalDB](https://github.com/maxnowack/signaldb). SignalDB is a local-first JavaScript database with real-time sync, enabling optimistic UI with signal-based reactivity across multiple frameworks.

See https://signaldb.js.org/reference/indexeddb/ for more information.
```

## File: persistence-adapters/indexeddb/tsconfig.json
```json
{
  "extends": "../../../tsconfig.json",
  "exclude": [
    "**/*.spec.ts",
  ],
  "include": [
    "src/**/*.ts"
  ]
}
```

## File: persistence-adapters/indexeddb/typedoc.json
```json
{
     "extends": ["../../../typedoc.base.json"],
     "entryPoints": ["src/index.ts"]
 }
```

## File: persistence-adapters/indexeddb/vite.config.mts
```
/// <reference types="vitest" />
import path from 'path'
import { defineConfig } from 'vite'
import typescript from '@rollup/plugin-typescript'
import { typescriptPaths } from 'rollup-plugin-typescript-paths'
import dts from 'vite-plugin-dts'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    dts(),
    tsconfigPaths(),
  ],
  build: {
    manifest: true,
    minify: true,
    sourcemap: true,
    reportCompressedSize: true,
    lib: {
      name: 'SignalDB',
      entry: path.resolve(__dirname, 'src/index.ts'),
      fileName: format => (format === 'es' ? 'index.mjs' : `index.${format}.js`),
    },
    rollupOptions: {
      external: [
        '@signaldb/core',
      ],
      plugins: [
        typescriptPaths({
          preserveExtensions: true,
        }),
        typescript({
          sourceMap: false,
          declaration: true,
          outDir: 'dist',
        }),
      ],
    },
  },
})
```

## File: persistence-adapters/indexeddb/vitest.config.mts
```
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.mts'

export default mergeConfig(viteConfig, defineConfig({}))
```

## File: persistence-adapters/localstorage/__tests__/adapter.spec.ts
```typescript
// @vitest-environment happy-dom
import type { EventEmitter } from '@signaldb/core'
import { describe, it, expect } from 'vitest'
import { Collection } from '@signaldb/core'
import createLocalStorageAdapter from '../src'

/**
 * Waits for a specific event to be emitted.
 * @param emitter - The event emitter instance.
 * @param event - The event name to wait for.
 * @param [timeout] - Optional timeout in milliseconds.
 * @returns A promise that resolves with the event value.
 */
async function waitForEvent<T>(
  emitter: EventEmitter<any>,
  event: string,
  timeout?: number,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = timeout && setTimeout(() => {
      reject(new Error('waitForEvent timeout'))
    }, timeout)

    emitter.once(event, (value: T) => {
      if (timeoutId) clearTimeout(timeoutId)
      resolve(value)
    })
  })
}

describe('Persistence', () => {
  describe('localStorage', () => {
    it('should load items from localStorage persistence adapter', async () => {
      const persistence = createLocalStorageAdapter(`test-${Math.floor(Math.random() * 1e17).toString(16)}`)
      await persistence.save([], { added: [{ id: '1', name: 'John' }], removed: [], modified: [] })
      const collection = new Collection({ persistence })
      await waitForEvent(collection, 'persistence.init')
      const items = collection.find().fetch()
      expect(items).toEqual([{ id: '1', name: 'John' }])
    })

    it('should save items to localStorage persistence adapter', async () => {
      const persistence = createLocalStorageAdapter(`test-${Math.floor(Math.random() * 1e17).toString(16)}`)
      await persistence.save([], { added: [], removed: [], modified: [] })
      const collection = new Collection({ persistence })
      await waitForEvent(collection, 'persistence.init')
      collection.insert({ id: '1', name: 'John' })
      await waitForEvent(collection, 'persistence.transmitted')
      const items = collection.find().fetch()
      expect(items).toEqual([{ id: '1', name: 'John' }])
      const loadResult = await persistence.load()
      expect(loadResult.items).toEqual([{ id: '1', name: 'John' }])
    })

    it('should remove item from localStorage persistence adapter', async () => {
      const persistence = createLocalStorageAdapter(`test-${Math.floor(Math.random() * 1e17).toString(16)}`)
      await persistence.save([], { added: [{ id: '1', name: 'John' }, { id: '2', name: 'Jane' }], removed: [], modified: [] })
      const collection = new Collection({ persistence })
      await waitForEvent(collection, 'persistence.init')

      collection.removeOne({ id: '1' })
      await waitForEvent(collection, 'persistence.transmitted')

      const items = collection.find().fetch()
      expect(items).toEqual([{ id: '2', name: 'Jane' }])
      const loadResult = await persistence.load()
      expect(loadResult.items).toEqual([{ id: '2', name: 'Jane' }])
    })

    it('should update item in localStorage persistence adapter', async () => {
      const persistence = createLocalStorageAdapter(`test-${Math.floor(Math.random() * 1e17).toString(16)}`)
      await persistence.save([], { added: [{ id: '1', name: 'John' }], removed: [], modified: [] })
      const collection = new Collection({ persistence })
      await waitForEvent(collection, 'persistence.init')

      collection.updateOne({ id: '1' }, { $set: { name: 'Johnny' } })
      await waitForEvent(collection, 'persistence.transmitted')

      const items = collection.find().fetch()
      expect(items).toEqual([{ id: '1', name: 'Johnny' }])
      const loadResult = await persistence.load()
      expect(loadResult.items).toEqual([{ id: '1', name: 'Johnny' }])
    })

    it('should not modify original items in localStorage persistence adapter', async () => {
      const persistence = createLocalStorageAdapter(`test-${Math.floor(Math.random() * 1e17).toString(16)}`)
      const originalItems = [{ id: '1', name: 'John' }]
      await persistence.save([], { added: originalItems, removed: [], modified: [] })
      const collection = new Collection({ persistence })
      await waitForEvent(collection, 'persistence.init')

      collection.insert({ id: '2', name: 'Jane' })
      await waitForEvent(collection, 'persistence.transmitted')

      expect(originalItems).toEqual([{ id: '1', name: 'John' }])
    })

    it('should handle multiple operations in order', async () => {
      const persistence = createLocalStorageAdapter(`test-${Math.floor(Math.random() * 1e17).toString(16)}`)
      await persistence.save([], { added: [], removed: [], modified: [] })
      const collection = new Collection({ persistence })
      await waitForEvent(collection, 'persistence.init')

      collection.insert({ id: '1', name: 'John' })
      await waitForEvent(collection, 'persistence.transmitted')
      collection.insert({ id: '2', name: 'Jane' })
      await waitForEvent(collection, 'persistence.transmitted')
      collection.removeOne({ id: '1' })
      await waitForEvent(collection, 'persistence.transmitted')

      const items = collection.find().fetch()
      expect(items).toEqual([{ id: '2', name: 'Jane' }])
      const loadResult = await persistence.load()
      expect(loadResult.items).toEqual([{ id: '2', name: 'Jane' }])
    })

    it('should persist data that was modified before persistence.init on client side', { retry: 5 }, async () => {
      const persistence = createLocalStorageAdapter(`test-${Math.floor(Math.random() * 1e17).toString(16)}`)
      await persistence.save([], { added: [], removed: [], modified: [] })
      const collection = new Collection({ persistence })
      collection.insert({ id: '1', name: 'John' })
      collection.insert({ id: '2', name: 'Jane' })
      collection.updateOne({ id: '1' }, { $set: { name: 'Johnny' } })
      collection.removeOne({ id: '2' })
      await waitForEvent(collection, 'persistence.init')

      const items = collection.find().fetch()
      expect(items).toEqual([{ id: '1', name: 'Johnny' }])
      const loadResult = await persistence.load()
      expect(loadResult.items).toEqual([{ id: '1', name: 'Johnny' }])
    })

    it('should not overwrite persisted data if items is undefined and changeSet is empty.', async () => {
      const persistence = createLocalStorageAdapter(`test-${Math.floor(Math.random() * 1e17).toString(16)}`)
      await persistence.save([], { added: [{ id: '1', name: 'John' }], removed: [], modified: [] })
      const collection = new Collection({ persistence })
      await waitForEvent(collection, 'persistence.init')
      await persistence.save([], { added: [], removed: [], modified: [] })
      const items = collection.find().fetch()
      expect(items).toEqual([{ id: '1', name: 'John' }])
      const loadResult = await persistence.load()
      expect(loadResult.items).toEqual([{ id: '1', name: 'John' }])
    })
  })
})
```

## File: persistence-adapters/localstorage/src/index.ts
```typescript
import { createPersistenceAdapter } from '@signaldb/core'

/**
 * Creates a persistence adapter for managing a SignalDB collection using browser `localStorage`.
 * This adapter reads and writes data to `localStorage`, with customizable serialization and deserialization.
 * @template T - The type of the items in the collection.
 * @template I - The type of the unique identifier for the items.
 * @param name - A unique name for the collection, used as the key in `localStorage`.
 * @param options - Optional configuration for serialization and deserialization.
 * @param options.serialize - A function to serialize items to a string (default: `JSON.stringify`).
 * @param options.deserialize - A function to deserialize a string into items (default: `JSON.parse`).
 * @returns A SignalDB persistence adapter for managing data in `localStorage`.
 * @example
 * import createLocalStorageAdapter from './createLocalStorageAdapter';
 *
 * const adapter = createLocalStorageAdapter('myCollection', {
 *   serialize: (items) => JSON.stringify(items, null, 2), // Pretty-print JSON
 *   deserialize: (itemsString) => JSON.parse(itemsString), // Default JSON parse
 * });
 *
 * const collection = new Collection({
 *   persistence: adapter,
 * });
 *
 * // Perform operations on the collection, and changes will be reflected in local storage.
 */
export default function createLocalStorageAdapter<
  T extends { id: I } & Record<string, any>,
  I,
>(
  name: string,
  options?: {
    serialize?: (items: T[]) => string,
    deserialize?: (itemsString: string) => T[],
  },
) {
  const { serialize = JSON.stringify, deserialize = JSON.parse } = options || {}

  const collectionId = `signaldb-collection-${name}`
  /**
   * Retrieves items from localStorage and deserializes them.
   * @returns The deserialized items from localStorage.
   */
  function getItems(): T[] {
    const serializedItems = localStorage.getItem(collectionId)
    return serializedItems ? deserialize(serializedItems) : []
  }
  return createPersistenceAdapter<T, I>({
    async load() {
      const items = getItems()
      return { items }
    },
    async save(_items, { added, modified, removed }) {
      const items = [...getItems()]
      added.forEach((item) => {
        const index = items.findIndex(({ id }) => id === item.id)
        /* istanbul ignore if -- @preserve */
        if (index !== -1) {
          items[index] = item
          return
        }
        items.push(item)
      })
      modified.forEach((item) => {
        const index = items.findIndex(({ id }) => id === item.id)
        /* istanbul ignore if -- @preserve */
        if (index === -1) {
          items.push(item)
          return
        }
        items[index] = item
      })
      removed.forEach((item) => {
        const index = items.findIndex(({ id }) => id === item.id)
        /* istanbul ignore if -- @preserve */
        if (index === -1) return
        items.splice(index, 1)
      })
      localStorage.setItem(collectionId, serialize(items))
      return
    },
    async register() {
      return
    },
  })
}
```

## File: persistence-adapters/localstorage/CHANGELOG.md
```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

* Custom deserialize function now works correctly when localStorage is empty (thanks to @krolebord!)

## [1.0.1] - 2025-04-24

### Fixed

* Avoid duplicate ids and unnecessary errors

## [1.0.0] - 2024-12-16

### Added

* Added JSDoc comments to public API
```

## File: persistence-adapters/localstorage/package.json
```json
{
  "name": "@signaldb/localstorage",
  "version": "1.0.1",
  "description": "",
  "scripts": {
    "build": "rimraf dist && vite build",
    "analyze-bundle": "bundle-analyzer ./dist --upload-token=$BUNDLE_ANALYZER_UPLOAD_TOKEN --bundle-name=@signaldb/localstorage",
    "test": "vitest"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/maxnowack/signaldb.git"
  },
  "homepage": "https://signaldb.js.org",
  "keywords": [
    "local-storage",
    "client-database",
    "client",
    "database",
    "local-database",
    "offline-first",
    "optimistic-ui",
    "plugin",
    "reactive",
    "reactivity",
    "solid",
    "synchronization",
    "typescript"
  ],
  "author": "Max Nowack <max.nowack@gmail.com>",
  "license": "MIT",
  "sideEffects": false,
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.umd.js",
      "default": "./dist/index.umd.js"
    }
  },
  "main": "./dist/index.umd.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "typesVersions": {
    "*": {
      "*": [
        "./dist/*",
        "./dist/index.d.ts"
      ]
    }
  },
  "files": [
    "dist"
  ],
  "peerDependencies": {
    "@signaldb/core": "1.x"
  }
}
```

## File: persistence-adapters/localstorage/README.md
```markdown
# @signaldb/localstorage

This is the `localStorage` persistence adapter for [SignalDB](https://github.com/maxnowack/signaldb). SignalDB is a local-first JavaScript database with real-time sync, enabling optimistic UI with signal-based reactivity across multiple frameworks.

See https://signaldb.js.org/reference/localstorage/ for more information.
```

## File: persistence-adapters/localstorage/tsconfig.json
```json
{
  "extends": "../../../tsconfig.json",
  "exclude": [
    "**/*.spec.ts",
  ],
  "include": [
    "src/**/*.ts"
  ]
}
```

## File: persistence-adapters/localstorage/typedoc.json
```json
{
     "extends": ["../../../typedoc.base.json"],
     "entryPoints": ["src/index.ts"]
 }
```

## File: persistence-adapters/localstorage/vite.config.mts
```
/// <reference types="vitest" />
import path from 'path'
import { defineConfig } from 'vite'
import typescript from '@rollup/plugin-typescript'
import { typescriptPaths } from 'rollup-plugin-typescript-paths'
import dts from 'vite-plugin-dts'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    dts(),
    tsconfigPaths(),
  ],
  build: {
    manifest: true,
    minify: true,
    sourcemap: true,
    reportCompressedSize: true,
    lib: {
      name: 'SignalDB',
      entry: path.resolve(__dirname, 'src/index.ts'),
      fileName: format => (format === 'es' ? 'index.mjs' : `index.${format}.js`),
    },
    rollupOptions: {
      external: [
        '@signaldb/core',
      ],
      plugins: [
        typescriptPaths({
          preserveExtensions: true,
        }),
        typescript({
          sourceMap: false,
          declaration: true,
          outDir: 'dist',
        }),
      ],
    },
  },
})
```

## File: persistence-adapters/localstorage/vitest.config.mts
```
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.mts'

export default mergeConfig(viteConfig, defineConfig({}))
```

## File: persistence-adapters/opfs/__tests__/adapter.spec.ts
```typescript
// @vitest-environment happy-dom
import type { EventEmitter } from '@signaldb/core'
import { describe, it, expect } from 'vitest'
import { Collection } from '@signaldb/core'
import createOPFSAdapter from '../src'

/**
 * Waits for a specific event to be emitted.
 * @param emitter - The event emitter.
 * @param event - The event to wait for.
 * @param [timeout] - Optional timeout in milliseconds.
 * @returns A promise that resolves with the event value.
 */
async function waitForEvent<T>(
  emitter: EventEmitter<any>,
  event: string,
  timeout?: number,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = timeout && setTimeout(() => {
      reject(new Error('waitForEvent timeout'))
    }, timeout)

    emitter.once(event, (value: T) => {
      if (timeoutId) clearTimeout(timeoutId)
      resolve(value)
    })
  })
}

describe('OPFS', () => {
  const fileContents: Record<string, string | null> = {}
  const mockedOPFS = {
    getDirectory: () => {
      const opfsRoot = {
        getFileHandle(filename: string, options?: { create: boolean }) {
          if (!Object.hasOwnProperty.call(fileContents, filename)) {
            if (options?.create) {
              fileContents[filename] = null
            } else {
              return Promise.reject(new Error('File not found'))
            }
          }

          const fileHandle = {
            getFile() {
              return Promise.resolve({
                text() {
                  return Promise.resolve(fileContents[filename])
                },
              })
            },
            createWritable() {
              return Promise.resolve({
                write(data: string) {
                  fileContents[filename] = data
                  return Promise.resolve()
                },
                close() {
                  return Promise.resolve()
                },
              })
            },
          }

          return fileHandle
        },
      }
      return Promise.resolve(opfsRoot)
    },
  }

  // @ts-expect-error mocking navigator.storage for testing purposes
  navigator.storage = mockedOPFS

  it('should load items from OPFS persistence adapter', async () => {
    const persistence = createOPFSAdapter(`test-${Math.floor(Math.random() * 1e17).toString(16)}`)
    await persistence.save([], { added: [{ id: '1', name: 'John' }], removed: [], modified: [] })
    const collection = new Collection({ persistence })
    await waitForEvent(collection, 'persistence.init')
    const items = collection.find().fetch()
    expect(items).toEqual([{ id: '1', name: 'John' }])
  })

  it('should save items to OPFS persistence adapter', async () => {
    const persistence = createOPFSAdapter(`test-${Math.floor(Math.random() * 1e17).toString(16)}`)
    await persistence.save([], { added: [], removed: [], modified: [] })
    const collection = new Collection({ persistence })
    await waitForEvent(collection, 'persistence.init')
    collection.insert({ id: '1', name: 'John' })
    await waitForEvent(collection, 'persistence.transmitted')
    const items = collection.find().fetch()
    expect(items).toEqual([{ id: '1', name: 'John' }])
    const loadResult = await persistence.load()
    expect(loadResult.items).toEqual([{ id: '1', name: 'John' }])
  })

  it('should remove item from OPFS persistence adapter', async () => {
    const persistence = createOPFSAdapter(`test-${Math.floor(Math.random() * 1e17).toString(16)}`)
    await persistence.save([], { added: [{ id: '1', name: 'John' }, { id: '2', name: 'Jane' }], removed: [], modified: [] })
    const collection = new Collection({ persistence })
    await waitForEvent(collection, 'persistence.init')

    collection.removeOne({ id: '1' })
    await waitForEvent(collection, 'persistence.transmitted')

    const items = collection.find().fetch()
    expect(items).toEqual([{ id: '2', name: 'Jane' }])
    const loadResult = await persistence.load()
    expect(loadResult.items).toEqual([{ id: '2', name: 'Jane' }])
  })

  it('should update item in OPFS persistence adapter', async () => {
    const persistence = createOPFSAdapter(`test-${Math.floor(Math.random() * 1e17).toString(16)}`)
    await persistence.save([], { added: [{ id: '1', name: 'John' }], removed: [], modified: [] })
    const collection = new Collection({ persistence })
    await waitForEvent(collection, 'persistence.init')

    collection.updateOne({ id: '1' }, { $set: { name: 'Johnny' } })
    await waitForEvent(collection, 'persistence.transmitted')

    const items = collection.find().fetch()
    expect(items).toEqual([{ id: '1', name: 'Johnny' }])
    const loadResult = await persistence.load()
    expect(loadResult.items).toEqual([{ id: '1', name: 'Johnny' }])
  })

  it('should not modify original items in OPFS persistence adapter', async () => {
    const persistence = createOPFSAdapter(`test-${Math.floor(Math.random() * 1e17).toString(16)}`)
    const originalItems = [{ id: '1', name: 'John' }]
    await persistence.save([], { added: originalItems, removed: [], modified: [] })
    const collection = new Collection({ persistence })
    await waitForEvent(collection, 'persistence.init')

    collection.insert({ id: '2', name: 'Jane' })
    await waitForEvent(collection, 'persistence.transmitted')

    expect(originalItems).toEqual([{ id: '1', name: 'John' }])
  })

  it('should handle multiple operations in order', async () => {
    const persistence = createOPFSAdapter(`test-${Math.floor(Math.random() * 1e17).toString(16)}`)
    await persistence.save([], { added: [], removed: [], modified: [] })
    const collection = new Collection({ persistence })
    await waitForEvent(collection, 'persistence.init')

    collection.insert({ id: '1', name: 'John' })
    await waitForEvent(collection, 'persistence.transmitted')
    collection.insert({ id: '2', name: 'Jane' })
    await waitForEvent(collection, 'persistence.transmitted')
    collection.removeOne({ id: '1' })
    await waitForEvent(collection, 'persistence.transmitted')

    const items = collection.find().fetch()
    expect(items).toEqual([{ id: '2', name: 'Jane' }])
    const loadResult = await persistence.load()
    expect(loadResult.items).toEqual([{ id: '2', name: 'Jane' }])
  })

  it('should persist data that was modified before persistence.init on client side', { retry: 5 }, async () => {
    const persistence = createOPFSAdapter(`test-${Math.floor(Math.random() * 1e17).toString(16)}`)
    await persistence.save([], { added: [], removed: [], modified: [] })
    const collection = new Collection({ persistence })
    collection.insert({ id: '1', name: 'John' })
    collection.insert({ id: '2', name: 'Jane' })
    collection.updateOne({ id: '1' }, { $set: { name: 'Johnny' } })
    collection.removeOne({ id: '2' })
    await waitForEvent(collection, 'persistence.init')

    const items = collection.find().fetch()
    expect(items).toEqual([{ id: '1', name: 'Johnny' }])
    const loadResult = await persistence.load()
    expect(loadResult.items).toEqual([{ id: '1', name: 'Johnny' }])
  })
})
```

## File: persistence-adapters/opfs/src/index.ts
```typescript
import { createPersistenceAdapter } from '@signaldb/core'

/**
 * Creates a persistence adapter for managing a SignalDB collection using the
 * Origin Private File System (OPFS). This adapter allows data to be stored and managed
 * directly in the browser's file system with support for customizable serialization
 * and deserialization.
 * @template T - The type of the items in the collection.
 * @template I - The type of the unique identifier for the items.
 * @param filename - The name of the file in OPFS where data will be stored.
 * @param options - Optional configuration for serialization and deserialization.
 * @param options.serialize - A function to serialize items to a string (default: `JSON.stringify`).
 * @param options.deserialize - A function to deserialize a string into items (default: `JSON.parse`).
 * @returns A SignalDB persistence adapter for managing data in OPFS.
 * @example
 * import createOPFSAdapter from './createOPFSAdapter';
 * import { Collection } from '@signaldb/core';
 *
 * const adapter = createOPFSAdapter('myCollection.json', {
 *   serialize: (items) => JSON.stringify(items, null, 2), // Pretty-print JSON
 *   deserialize: (itemsString) => JSON.parse(itemsString), // Default JSON parse
 * });
 *
 * const collection = new Collection({
 *   persistence: adapter,
 * });
 *
 * // Perform operations on the collection, and changes will be reflected in the OPFS file.
 */
export default function createOPFSAdapter<
  T extends { id: I } & Record<string, any>,
  I,
>(
  filename: string,
  options?: {
    serialize?: (items: T[]) => string,
    deserialize?: (itemsString: string) => T[],
  },
) {
  const { serialize = JSON.stringify, deserialize = JSON.parse } = options || {}

  let savePromise: Promise<void> | null = null

  /**
   * Retrieves the items from the OPFS file.
   * @returns A promise that resolves to an array of items.
   */
  async function getItems(): Promise<T[]> {
    const opfsRoot = await navigator.storage.getDirectory()
    const existingFileHandle = await opfsRoot.getFileHandle(filename, { create: true })
    const serializedItems = await existingFileHandle.getFile().then(value => value.text())
    return serializedItems ? deserialize(serializedItems) : []
  }

  return createPersistenceAdapter<T, I>({
    async register(onChange) {
      const opfsRoot = await navigator.storage.getDirectory()
      await opfsRoot.getFileHandle(filename, { create: true })
      void onChange()
    },
    async load() {
      if (savePromise) await savePromise

      const items = await getItems()
      return { items }
    },
    async save(_items, { added, modified, removed }) {
      if (savePromise) await savePromise
      const opfsRoot = await navigator.storage.getDirectory()
      const existingFileHandle = await opfsRoot.getFileHandle(filename, { create: true })
      if (added.length === 0 && modified.length === 0 && removed.length === 0) {
        const writeStream = await existingFileHandle.createWritable()
        await writeStream.write(serialize(_items))
        await writeStream.close()
        await savePromise
        return
      }
      savePromise = getItems()
        .then((currentItems) => {
          const items = [...currentItems]
          added.forEach((item) => {
            const index = items.findIndex(({ id }) => id === item.id)
            /* istanbul ignore if -- @preserve */
            if (index !== -1) {
              items[index] = item
              return
            }
            items.push(item)
          })
          modified.forEach((item) => {
            const index = items.findIndex(({ id }) => id === item.id)
            /* istanbul ignore if -- @preserve */
            if (index === -1) {
              items.push(item)
              return
            }
            items[index] = item
          })
          removed.forEach((item) => {
            const index = items.findIndex(({ id }) => id === item.id)
            /* istanbul ignore if -- @preserve */
            if (index === -1) return
            items.splice(index, 1)
          })
          return items
        })
        .then(async (items) => {
          const writeStream = await existingFileHandle.createWritable()
          await writeStream.write(serialize(items))
          await writeStream.close()
        })
        .then(() => {
          savePromise = null
        })
      await savePromise
    },
  })
}
```

## File: persistence-adapters/opfs/CHANGELOG.md
```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

* Custom deserialize function now works correctly when file is empty (thanks to @krolebord!)

## [1.0.1] - 2025-04-24

### Fixed

* Avoid duplicate ids and unnecessary errors

## [1.0.0] - 2024-12-16

### Added

* Added JSDoc comments to public API
```

## File: persistence-adapters/opfs/package.json
```json
{
  "name": "@signaldb/opfs",
  "version": "1.0.1",
  "description": "",
  "scripts": {
    "build": "rimraf dist && vite build",
    "analyze-bundle": "bundle-analyzer ./dist --upload-token=$BUNDLE_ANALYZER_UPLOAD_TOKEN --bundle-name=@signaldb/opfs",
    "test": "vitest"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/maxnowack/signaldb.git"
  },
  "homepage": "https://signaldb.js.org",
  "keywords": [
    "opfs",
    "client-database",
    "client",
    "database",
    "local-database",
    "offline-first",
    "optimistic-ui",
    "plugin",
    "reactive",
    "reactivity",
    "solid",
    "synchronization",
    "typescript"
  ],
  "author": "Max Nowack <max.nowack@gmail.com>",
  "license": "MIT",
  "sideEffects": false,
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.umd.js",
      "default": "./dist/index.umd.js"
    }
  },
  "main": "./dist/index.umd.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "typesVersions": {
    "*": {
      "*": [
        "./dist/*",
        "./dist/index.d.ts"
      ]
    }
  },
  "files": [
    "dist"
  ],
  "peerDependencies": {
    "@signaldb/core": "1.x"
  }
}
```

## File: persistence-adapters/opfs/README.md
```markdown
# @signaldb/opfs

This is the OPFS persistence adapter for [SignalDB](https://github.com/maxnowack/signaldb). SignalDB is a local-first JavaScript database with real-time sync, enabling optimistic UI with signal-based reactivity across multiple frameworks.

See https://signaldb.js.org/reference/opfs/ for more information.
```

## File: persistence-adapters/opfs/tsconfig.json
```json
{
  "extends": "../../../tsconfig.json",
  "exclude": [
    "**/*.spec.ts",
  ],
  "include": [
    "src/**/*.ts"
  ]
}
```

## File: persistence-adapters/opfs/typedoc.json
```json
{
     "extends": ["../../../typedoc.base.json"],
     "entryPoints": ["src/index.ts"]
 }
```

## File: persistence-adapters/opfs/vite.config.mts
```
/// <reference types="vitest" />
import path from 'path'
import { defineConfig } from 'vite'
import typescript from '@rollup/plugin-typescript'
import { typescriptPaths } from 'rollup-plugin-typescript-paths'
import dts from 'vite-plugin-dts'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    dts(),
    tsconfigPaths(),
  ],
  build: {
    manifest: true,
    minify: true,
    sourcemap: true,
    reportCompressedSize: true,
    lib: {
      name: 'SignalDB',
      entry: path.resolve(__dirname, 'src/index.ts'),
      fileName: format => (format === 'es' ? 'index.mjs' : `index.${format}.js`),
    },
    rollupOptions: {
      external: [
        '@signaldb/core',
      ],
      plugins: [
        typescriptPaths({
          preserveExtensions: true,
        }),
        typescript({
          sourceMap: false,
          declaration: true,
          outDir: 'dist',
        }),
      ],
    },
  },
})
```

## File: persistence-adapters/opfs/vitest.config.mts
```
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.mts'

export default mergeConfig(viteConfig, defineConfig({}))
```
