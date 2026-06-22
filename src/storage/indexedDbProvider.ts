import type { IDBPDatabase } from 'idb'
import type { Section, Snippet, Track } from '../types'
import type { SnippetFilter, StorageProvider } from './StorageProvider'
import {
  openHarmolyseDb,
  quadrantOf,
  type HarmolyseDB,
  type StoredSnippet,
} from './db'

/** Local-first StorageProvider backed by IndexedDB (via `idb`). */
export class IndexedDbProvider implements StorageProvider {
  private dbPromise: Promise<IDBPDatabase<HarmolyseDB>> | null = null

  /** Open (once) and reuse the connection. Self-initialising so feature
   *  code can't race the app's explicit init() call. */
  private ensureDb(): Promise<IDBPDatabase<HarmolyseDB>> {
    if (!this.dbPromise) this.dbPromise = openHarmolyseDb()
    return this.dbPromise
  }

  async init(): Promise<void> {
    await this.ensureDb()
  }

  // Tracks
  async putTrack(track: Track): Promise<void> {
    await (await this.ensureDb()).put('tracks', track)
  }
  async getTrack(id: string): Promise<Track | undefined> {
    return (await this.ensureDb()).get('tracks', id)
  }
  async getAllTracks(): Promise<Track[]> {
    return (await this.ensureDb()).getAll('tracks')
  }
  async deleteTrack(id: string): Promise<void> {
    await (await this.ensureDb()).delete('tracks', id)
  }

  // Sections
  async putSection(section: Section): Promise<void> {
    await (await this.ensureDb()).put('sections', section)
  }
  async getSectionsByTrack(trackId: string): Promise<Section[]> {
    return (await this.ensureDb()).getAllFromIndex('sections', 'by-track', trackId)
  }
  async deleteSection(id: string): Promise<void> {
    await (await this.ensureDb()).delete('sections', id)
  }

  // Snippets
  async putSnippet(snippet: Snippet): Promise<void> {
    const stored: StoredSnippet = {
      ...snippet,
      emotionQuadrant: quadrantOf(snippet.emotion.valence, snippet.emotion.arousal),
    }
    await (await this.ensureDb()).put('snippets', stored)
  }
  async getSnippet(id: string): Promise<Snippet | undefined> {
    return stripStored(await (await this.ensureDb()).get('snippets', id))
  }
  async querySnippets(filter: SnippetFilter = {}): Promise<Snippet[]> {
    const db = await this.ensureDb()
    // Narrow with the most selective index available, then refine in memory.
    let rows: StoredSnippet[]
    if (filter.sectionId) {
      rows = await db.getAllFromIndex('snippets', 'by-section', filter.sectionId)
    } else if (filter.trackId) {
      rows = await db.getAllFromIndex('snippets', 'by-track', filter.trackId)
    } else if (filter.camelot) {
      rows = await db.getAllFromIndex('snippets', 'by-camelot', filter.camelot)
    } else if (filter.quadrant) {
      rows = await db.getAllFromIndex('snippets', 'by-quadrant', filter.quadrant)
    } else {
      rows = await db.getAll('snippets')
    }

    return rows
      .filter((r) => (filter.camelot == null ? true : r.key.camelot === filter.camelot))
      .filter((r) => (filter.quadrant == null ? true : r.emotionQuadrant === filter.quadrant))
      .filter((r) => (filter.bpmMin == null ? true : r.bpm >= filter.bpmMin))
      .filter((r) => (filter.bpmMax == null ? true : r.bpm <= filter.bpmMax))
      .map((r) => stripStored(r)!)
  }
  async deleteSnippet(id: string): Promise<void> {
    await (await this.ensureDb()).delete('snippets', id)
  }

  // Audio blobs
  async putBlob(key: string, blob: Blob): Promise<void> {
    await (await this.ensureDb()).put('audioBlobs', { key, blob })
  }
  async getBlob(key: string): Promise<Blob | undefined> {
    const rec = await (await this.ensureDb()).get('audioBlobs', key)
    return rec?.blob
  }
  async deleteBlob(key: string): Promise<void> {
    await (await this.ensureDb()).delete('audioBlobs', key)
  }

  async estimateUsage(): Promise<StorageEstimate | undefined> {
    if (navigator.storage?.estimate) return navigator.storage.estimate()
    return undefined
  }
}

/** Drop the persistence-only derived field so callers see a clean Snippet. */
function stripStored(row?: StoredSnippet): Snippet | undefined {
  if (!row) return undefined
  const rest: Partial<StoredSnippet> = { ...row }
  delete rest.emotionQuadrant
  return rest as Snippet
}
