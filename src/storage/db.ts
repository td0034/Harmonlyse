import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { EmotionQuadrant, Section, Snippet, Track } from '../types'

/**
 * Persisted snippet shape: the domain Snippet plus a derived
 * `emotionQuadrant` field so we can index emotion for fast filtering
 * without recomputing on read.
 */
export type StoredSnippet = Snippet & { emotionQuadrant: EmotionQuadrant }

interface BlobRecord {
  key: string
  blob: Blob
}

export interface HarmolyseDB extends DBSchema {
  tracks: {
    key: string
    value: Track
  }
  sections: {
    key: string
    value: Section
    indexes: { 'by-track': string }
  }
  snippets: {
    key: string
    value: StoredSnippet
    indexes: {
      'by-track': string
      'by-section': string
      'by-camelot': string
      'by-bpm': number
      'by-quadrant': EmotionQuadrant
    }
  }
  audioBlobs: {
    key: string
    value: BlobRecord
  }
}

export const DB_NAME = 'harmolyse'
export const DB_VERSION = 1

export function openHarmolyseDb(): Promise<IDBPDatabase<HarmolyseDB>> {
  return openDB<HarmolyseDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('tracks')) {
        db.createObjectStore('tracks', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('sections')) {
        const sections = db.createObjectStore('sections', { keyPath: 'id' })
        sections.createIndex('by-track', 'trackId')
      }
      if (!db.objectStoreNames.contains('snippets')) {
        const snippets = db.createObjectStore('snippets', { keyPath: 'id' })
        snippets.createIndex('by-track', 'trackId')
        snippets.createIndex('by-section', 'sectionId')
        snippets.createIndex('by-camelot', 'key.camelot')
        snippets.createIndex('by-bpm', 'bpm')
        snippets.createIndex('by-quadrant', 'emotionQuadrant')
      }
      if (!db.objectStoreNames.contains('audioBlobs')) {
        db.createObjectStore('audioBlobs', { keyPath: 'key' })
      }
    },
  })
}

/** Map a (valence, arousal) point to its emotion quadrant. */
export function quadrantOf(valence: number, arousal: number): EmotionQuadrant {
  if (arousal >= 0) return valence >= 0 ? 'q1' : 'q2'
  return valence >= 0 ? 'q4' : 'q3'
}
