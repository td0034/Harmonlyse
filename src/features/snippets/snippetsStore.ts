import { create } from 'zustand'
import { storage } from '../../storage'
import type { Snippet, Track } from '../../types'

interface SnippetsState {
  snippets: Snippet[]
  tracksById: Record<string, Track>
  load: () => Promise<void>
  save: (snippet: Snippet) => Promise<void>
  remove: (id: string) => Promise<void>
}

async function fetchAll(): Promise<{ snippets: Snippet[]; tracksById: Record<string, Track> }> {
  const [snippets, tracks] = await Promise.all([storage.querySnippets(), storage.getAllTracks()])
  snippets.sort((a, b) => b.createdAt - a.createdAt)
  const tracksById: Record<string, Track> = {}
  for (const t of tracks) tracksById[t.id] = t
  return { snippets, tracksById }
}

export const useSnippetsStore = create<SnippetsState>((set) => ({
  snippets: [],
  tracksById: {},

  load: async () => set(await fetchAll()),

  save: async (snippet) => {
    await storage.putSnippet(snippet)
    set(await fetchAll())
  },

  remove: async (id) => {
    const snip = await storage.getSnippet(id)
    // Only transformed snippets own a blob; untransformed ones reference the track.
    if (snip?.audioBlobKey) await storage.deleteBlob(snip.audioBlobKey)
    await storage.deleteSnippet(id)
    set(await fetchAll())
  },
}))
