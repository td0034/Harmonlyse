import { IndexedDbProvider } from './indexedDbProvider'
import type { StorageProvider } from './StorageProvider'

/**
 * The app's single storage instance. Swap the implementation here (e.g.
 * for a home-server-backed provider) without touching feature code.
 */
export const storage: StorageProvider = new IndexedDbProvider()

export type { StorageProvider, SnippetFilter } from './StorageProvider'
