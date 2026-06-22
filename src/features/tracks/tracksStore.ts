import { create } from 'zustand'
import { storage } from '../../storage'
import type { Track, TrackSource } from '../../types'
import { uid } from '../../lib/id'
import { decodeMeta } from '../../audio/decode'

type ImportState = 'idle' | 'importing'

interface TracksState {
  tracks: Track[]
  selectedTrackId: string | null
  importState: ImportState
  error?: string
  refresh: () => Promise<void>
  importFiles: (files: FileList | File[]) => Promise<void>
  importCapture: (blob: Blob) => Promise<void>
  select: (id: string | null) => void
  remove: (id: string) => Promise<void>
}

const ACCEPTED = /\.(wav|mp3|flac|m4a|aac|ogg)$/i

/** Decode, persist the Blob, and create a Track record. Returns the track id. */
async function ingestBlob(blob: Blob, name: string, source: TrackSource): Promise<string> {
  // Decode first so an undecodable input leaves no orphan blob/record.
  const meta = await decodeMeta(await blob.arrayBuffer())
  const id = uid()
  const audioBlobKey = `track-${id}`
  await storage.putBlob(audioBlobKey, blob)
  const track: Track = {
    id,
    source,
    name,
    durationSec: meta.durationSec,
    sampleRate: meta.sampleRate,
    audioBlobKey,
    createdAt: Date.now(),
  }
  await storage.putTrack(track)
  return id
}

export const useTracksStore = create<TracksState>((set, get) => ({
  tracks: [],
  selectedTrackId: null,
  importState: 'idle',

  refresh: async () => {
    const tracks = await storage.getAllTracks()
    tracks.sort((a, b) => b.createdAt - a.createdAt)
    set({ tracks })
    const sel = get().selectedTrackId
    if (sel && !tracks.some((t) => t.id === sel)) {
      set({ selectedTrackId: tracks[0]?.id ?? null })
    } else if (!sel && tracks.length) {
      set({ selectedTrackId: tracks[0].id })
    }
  },

  importFiles: async (files) => {
    const list = Array.from(files).filter(
      (f) => ACCEPTED.test(f.name) || f.type.startsWith('audio/'),
    )
    if (!list.length) {
      set({ error: 'No supported audio files (wav / mp3 / flac / m4a).' })
      return
    }
    set({ importState: 'importing', error: undefined })
    try {
      let lastId: string | null = null
      for (const file of list) {
        lastId = await ingestBlob(file, file.name, 'upload')
      }
      await get().refresh()
      if (lastId) set({ selectedTrackId: lastId })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Import failed' })
    } finally {
      set({ importState: 'idle' })
    }
  },

  importCapture: async (blob) => {
    set({ importState: 'importing', error: undefined })
    try {
      const name = `Capture ${new Date().toLocaleString()}`
      const id = await ingestBlob(blob, name, 'capture')
      await get().refresh()
      set({ selectedTrackId: id })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Capture import failed' })
    } finally {
      set({ importState: 'idle' })
    }
  },

  select: (id) => set({ selectedTrackId: id }),

  remove: async (id) => {
    const track = await storage.getTrack(id)
    if (track) await storage.deleteBlob(track.audioBlobKey)
    await storage.deleteTrack(id)
    const sections = await storage.getSectionsByTrack(id)
    await Promise.all(sections.map((s) => storage.deleteSection(s.id)))
    await get().refresh()
  },
}))
