import { create } from 'zustand'
import { storage } from '../../storage'
import type { SnippetFilter } from '../../storage'
import type { EmotionQuadrant, Snippet, Track } from '../../types'

/** Library filter — provider-indexed fields plus client-side name matching. */
export interface LibraryFilter {
  camelot?: string
  bpmMin?: number
  bpmMax?: number
  quadrant?: EmotionQuadrant
  names: string[]
}

const EMPTY_FILTER: LibraryFilter = { names: [] }

interface SnippetsState {
  snippets: Snippet[]
  tracksById: Record<string, Track>
  filter: LibraryFilter
  load: () => Promise<void>
  setFilter: (partial: Partial<LibraryFilter>) => Promise<void>
  clearFilter: () => Promise<void>
  save: (snippet: Snippet) => Promise<void>
  remove: (id: string) => Promise<void>
}

async function query(
  filter: LibraryFilter,
): Promise<{ snippets: Snippet[]; tracksById: Record<string, Track> }> {
  // Camelot / BPM / quadrant go through the indexed provider query; names
  // (not indexed) are matched client-side here.
  const provFilter: SnippetFilter = {
    camelot: filter.camelot,
    bpmMin: filter.bpmMin,
    bpmMax: filter.bpmMax,
    quadrant: filter.quadrant,
  }
  let snippets = await storage.querySnippets(provFilter)
  if (filter.names.length) {
    snippets = snippets.filter((s) => filter.names.every((n) => s.emotion.names.includes(n)))
  }
  snippets.sort((a, b) => b.createdAt - a.createdAt)
  const tracks = await storage.getAllTracks()
  const tracksById: Record<string, Track> = {}
  for (const t of tracks) tracksById[t.id] = t
  return { snippets, tracksById }
}

export const useSnippetsStore = create<SnippetsState>((set, get) => ({
  snippets: [],
  tracksById: {},
  filter: EMPTY_FILTER,

  load: async () => set(await query(get().filter)),

  setFilter: async (partial) => {
    const filter = { ...get().filter, ...partial }
    set({ filter })
    set(await query(filter))
  },

  clearFilter: async () => {
    set({ filter: EMPTY_FILTER })
    set(await query(EMPTY_FILTER))
  },

  save: async (snippet) => {
    await storage.putSnippet(snippet)
    set(await query(get().filter))
  },

  remove: async (id) => {
    const snip = await storage.getSnippet(id)
    if (snip?.audioBlobKey) await storage.deleteBlob(snip.audioBlobKey)
    await storage.deleteSnippet(id)
    set(await query(get().filter))
  },
}))
