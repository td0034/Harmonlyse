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
  private db: IDBPDatabase<HarmolyseDB> | null = null

  async init(): Promise<void> {
    if (!this.db) this.db = await openHarmolyseDb()
  }

  private get database(): IDBPDatabase<HarmolyseDB> {
    if (!this.db) {
      throw new Error('StorageProvider not initialised — call init() first')
    }
    return this.db
  }

  // Tracks
  async putTrack(track: Track): Promise<void> {
    await this.database.put('tracks', track)
  }
  getTrack(id: string): Promise<Track | undefined> {
    return this.database.get('tracks', id)
  }
  getAllTracks(): Promise<Track[]> {
    return this.database.getAll('tracks')
  }
  async deleteTrack(id: string): Promise<void> {
    await this.database.delete('tracks', id)
  }

  // Sections
  async putSection(section: Section): Promise<void> {
    await this.database.put('sections', section)
  }
  getSectionsByTrack(trackId: string): Promise<Section[]> {
    return this.database.getAllFromIndex('sections', 'by-track', trackId)
  }
  async deleteSection(id: string): Promise<void> {
    await this.database.delete('sections', id)
  }

  // Snippets
  async putSnippet(snippet: Snippet): Promise<void> {
    const stored: StoredSnippet = {
      ...snippet,
      emotionQuadrant: quadrantOf(snippet.emotion.valence, snippet.emotion.arousal),
    }
    await this.database.put('snippets', stored)
  }
  async getSnippet(id: string): Promise<Snippet | undefined> {
    return stripStored(await this.database.get('snippets', id))
  }
  async querySnippets(filter: SnippetFilter = {}): Promise<Snippet[]> {
    // Narrow with the most selective index available, then refine in memory.
    let rows: StoredSnippet[]
    if (filter.sectionId) {
      rows = await this.database.getAllFromIndex('snippets', 'by-section', filter.sectionId)
    } else if (filter.trackId) {
      rows = await this.database.getAllFromIndex('snippets', 'by-track', filter.trackId)
    } else if (filter.camelot) {
      rows = await this.database.getAllFromIndex('snippets', 'by-camelot', filter.camelot)
    } else if (filter.quadrant) {
      rows = await this.database.getAllFromIndex('snippets', 'by-quadrant', filter.quadrant)
    } else {
      rows = await this.database.getAll('snippets')
    }

    return rows
      .filter((r) => (filter.camelot == null ? true : r.key.camelot === filter.camelot))
      .filter((r) => (filter.quadrant == null ? true : r.emotionQuadrant === filter.quadrant))
      .filter((r) => (filter.bpmMin == null ? true : r.bpm >= filter.bpmMin))
      .filter((r) => (filter.bpmMax == null ? true : r.bpm <= filter.bpmMax))
      .map((r) => stripStored(r)!)
  }
  async deleteSnippet(id: string): Promise<void> {
    await this.database.delete('snippets', id)
  }

  // Audio blobs
  async putBlob(key: string, blob: Blob): Promise<void> {
    await this.database.put('audioBlobs', { key, blob })
  }
  async getBlob(key: string): Promise<Blob | undefined> {
    const rec = await this.database.get('audioBlobs', key)
    return rec?.blob
  }
  async deleteBlob(key: string): Promise<void> {
    await this.database.delete('audioBlobs', key)
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
