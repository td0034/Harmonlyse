import type { EmotionQuadrant, Section, Snippet, Track } from '../types'

/**
 * Filter for snippet retrieval. The provider owns query execution so the
 * heavy lifting can move server-side later without touching feature code.
 */
export interface SnippetFilter {
  trackId?: string
  sectionId?: string
  camelot?: string
  bpmMin?: number
  bpmMax?: number
  quadrant?: EmotionQuadrant
}

/**
 * Persistence boundary for Harmolyse.
 *
 * Implemented today by IndexedDB (local-first, offline). The same surface
 * is intended to back a remote/home-server provider later — so it owns
 * QUERIES, not just CRUD-by-id, because querying is exactly where a local
 * store and a remote one diverge most. Feature code depends only on this.
 */
export interface StorageProvider {
  init(): Promise<void>

  // Tracks
  putTrack(track: Track): Promise<void>
  getTrack(id: string): Promise<Track | undefined>
  getAllTracks(): Promise<Track[]>
  deleteTrack(id: string): Promise<void>

  // Sections
  putSection(section: Section): Promise<void>
  getSectionsByTrack(trackId: string): Promise<Section[]>
  deleteSection(id: string): Promise<void>

  // Snippets
  putSnippet(snippet: Snippet): Promise<void>
  getSnippet(id: string): Promise<Snippet | undefined>
  querySnippets(filter?: SnippetFilter): Promise<Snippet[]>
  deleteSnippet(id: string): Promise<void>

  // Audio blobs (key -> Blob)
  putBlob(key: string, blob: Blob): Promise<void>
  getBlob(key: string): Promise<Blob | undefined>
  deleteBlob(key: string): Promise<void>

  // Storage usage (R5 — surface usage so the user can manage it)
  estimateUsage(): Promise<StorageEstimate | undefined>
}
