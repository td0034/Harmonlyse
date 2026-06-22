import { create } from 'zustand'
import { storage } from '../../storage'
import type { Section } from '../../types'
import { uid } from '../../lib/id'

/** Minimum section length (seconds) — prevents zero/negative-width sections. */
const MIN_SECTION_SEC = 0.05

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

interface SectionsState {
  trackId: string | null
  duration: number
  /** Contiguous, non-overlapping sections sorted by startSec, covering [0, duration]. */
  sections: Section[]

  load: (trackId: string, duration: number) => Promise<void>
  /** Split the section containing `timeSec` into two at that point. */
  splitAt: (timeSec: number) => Promise<void>
  /** Move the boundary after `leftSectionId` to `newTime` (resizes both neighbours). */
  moveBoundary: (leftSectionId: string, newTime: number) => Promise<void>
  /** Remove the divider after `leftSectionId`, merging it with its right neighbour. */
  mergeRightOf: (leftSectionId: string) => Promise<void>
  /** Remove `id` by merging it into its previous neighbour (or next, if first). */
  removeSection: (id: string) => Promise<void>
  rename: (id: string, label: string) => Promise<void>
  reset: () => void
}

/** Sync the DB to exactly `sections` for a track (upsert current, delete dropped). */
async function persistSections(trackId: string, sections: Section[]): Promise<void> {
  const existing = await storage.getSectionsByTrack(trackId)
  const keep = new Set(sections.map((s) => s.id))
  await Promise.all(
    existing.filter((e) => !keep.has(e.id)).map((e) => storage.deleteSection(e.id)),
  )
  await Promise.all(sections.map((s) => storage.putSection(s)))
}

export const useSectionsStore = create<SectionsState>((set, get) => ({
  trackId: null,
  duration: 0,
  sections: [],

  load: async (trackId, duration) => {
    const stored = await storage.getSectionsByTrack(trackId)
    const sections = stored.length
      ? stored.slice().sort((a, b) => a.startSec - b.startSec)
      : [{ id: uid(), trackId, startSec: 0, endSec: duration, label: '' }]
    set({ trackId, duration, sections })
  },

  splitAt: async (timeSec) => {
    const { trackId, sections, duration } = get()
    if (!trackId) return
    const t = clamp(timeSec, 0, duration)
    const idx = sections.findIndex(
      (s) => t > s.startSec + MIN_SECTION_SEC && t < s.endSec - MIN_SECTION_SEC,
    )
    if (idx === -1) return // too close to an existing boundary / out of range
    const left = sections[idx]
    const newLeft: Section = { ...left, endSec: t }
    const right: Section = { id: uid(), trackId, startSec: t, endSec: left.endSec, label: '' }
    const next = [...sections.slice(0, idx), newLeft, right, ...sections.slice(idx + 1)]
    set({ sections: next })
    await persistSections(trackId, next)
  },

  moveBoundary: async (leftSectionId, newTime) => {
    const { trackId, sections } = get()
    if (!trackId) return
    const i = sections.findIndex((s) => s.id === leftSectionId)
    if (i === -1 || i === sections.length - 1) return
    const left = sections[i]
    const right = sections[i + 1]
    const t = clamp(newTime, left.startSec + MIN_SECTION_SEC, right.endSec - MIN_SECTION_SEC)
    const next = sections.map((s, idx) =>
      idx === i ? { ...s, endSec: t } : idx === i + 1 ? { ...s, startSec: t } : s,
    )
    set({ sections: next })
    await persistSections(trackId, next)
  },

  mergeRightOf: async (leftSectionId) => {
    const { trackId, sections } = get()
    if (!trackId) return
    const i = sections.findIndex((s) => s.id === leftSectionId)
    if (i === -1 || i === sections.length - 1) return
    const merged: Section = { ...sections[i], endSec: sections[i + 1].endSec }
    const next = [...sections.slice(0, i), merged, ...sections.slice(i + 2)]
    set({ sections: next })
    await persistSections(trackId, next)
  },

  removeSection: async (id) => {
    const { sections } = get()
    if (sections.length <= 1) return // never remove the last remaining section
    const i = sections.findIndex((s) => s.id === id)
    if (i === -1) return
    // Merge into the previous neighbour, or the next one if this is the first.
    await get().mergeRightOf(i > 0 ? sections[i - 1].id : sections[0].id)
  },

  rename: async (id, label) => {
    const { trackId, sections } = get()
    if (!trackId) return
    const next = sections.map((s) => (s.id === id ? { ...s, label } : s))
    set({ sections: next })
    await persistSections(trackId, next)
  },

  reset: () => set({ trackId: null, duration: 0, sections: [] }),
}))
