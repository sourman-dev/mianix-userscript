import { GM } from '$';
import { createPersistenceAdapter } from '@signaldb/core'

/**
 * Creates a persistence adapter for managing a SignalDB collection backed by Greasemonkey's storage.
 * This adapter uses GM.getValue and GM.setValue for data persistence.
 * @template T - The type of the items in the collection.
 * @param collectionName - The name of the collection, used as the key for storage.
 * @returns A SignalDB persistence adapter for managing data in Greasemonkey's storage.
 */
export default function createMonkeyAdapter<T extends { id: I }, I>(
  collectionName: string,
) {
  return createPersistenceAdapter<T, I>({
    async register() {
      // No-op. We don't need to watch for external changes in this simple adapter.
    },
    async load() {
      const serializedItems = await GM.getValue(collectionName, '[]')
      const items = JSON.parse(serializedItems as string) as T[]
      return { items }
    },
    async save(items) {
      const serializedItems = JSON.stringify(items)
      await GM.setValue(collectionName, serializedItems)
    },
  })

}