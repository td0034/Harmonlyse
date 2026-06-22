import { create } from 'zustand'
import type { EmotionTag } from '../../types'

const empty = (): EmotionTag => ({ valence: 0, arousal: 0, names: [] })

interface EmotionState {
  /** Per-section emotion drafts (assembled onto the Snippet in Phase 5). */
  drafts: Record<string, EmotionTag>
  setPoint: (sectionId: string, valence: number, arousal: number) => void
  toggleName: (sectionId: string, name: string) => void
}

/**
 * Emotion drafts. The (valence, arousal) point is always user-placed; `names`
 * are independent labels and never move the point — this is deliberate so the
 * same name can spread across the plane (Phase 6 distribution view).
 */
export const useEmotionStore = create<EmotionState>((set, get) => ({
  drafts: {},

  setPoint: (sectionId, valence, arousal) => {
    const cur = get().drafts[sectionId] ?? empty()
    set((s) => ({ drafts: { ...s.drafts, [sectionId]: { ...cur, valence, arousal } } }))
  },

  toggleName: (sectionId, name) => {
    const cur = get().drafts[sectionId] ?? empty()
    const names = cur.names.includes(name)
      ? cur.names.filter((n) => n !== name)
      : [...cur.names, name]
    set((s) => ({ drafts: { ...s.drafts, [sectionId]: { ...cur, names } } }))
  },
}))
