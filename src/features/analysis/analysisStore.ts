import { create } from 'zustand'
import type { Scale, Section } from '../../types'
import { analyzeSection, type SectionAnalysis } from '../../analysis/analyze'
import { essentiaLoaded } from '../../analysis/essentia'
import { makeKeyEstimate } from '../../analysis/camelot'

type DraftStatus = 'idle' | 'analysing' | 'done' | 'error'

interface AnalysisDraft {
  status: DraftStatus
  result?: SectionAnalysis
  error?: string
}

interface AnalysisState {
  buffer: AudioBuffer | null
  bufferTrackId: string | null
  engineLoading: boolean
  drafts: Record<string, AnalysisDraft>

  setBuffer: (trackId: string, buffer: AudioBuffer) => void
  analyse: (section: Section) => Promise<void>
  override: (sectionId: string, patch: { bpm?: number; tonic?: string; scale?: Scale }) => void
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  buffer: null,
  bufferTrackId: null,
  engineLoading: false,
  drafts: {},

  setBuffer: (trackId, buffer) => {
    // New track → drop stale drafts.
    if (get().bufferTrackId !== trackId) set({ drafts: {} })
    set({ buffer, bufferTrackId: trackId })
  },

  analyse: async (section) => {
    const { buffer } = get()
    if (!buffer) return
    set((s) => ({
      drafts: { ...s.drafts, [section.id]: { status: 'analysing' } },
      engineLoading: !essentiaLoaded(),
    }))
    try {
      const result = await analyzeSection(buffer, section.startSec, section.endSec)
      set((s) => ({
        drafts: { ...s.drafts, [section.id]: { status: 'done', result } },
        engineLoading: false,
      }))
    } catch (e) {
      set((s) => ({
        drafts: {
          ...s.drafts,
          [section.id]: { status: 'error', error: e instanceof Error ? e.message : String(e) },
        },
        engineLoading: false,
      }))
    }
  },

  override: (sectionId, patch) => {
    const draft = get().drafts[sectionId]
    if (!draft?.result) return
    const r = { ...draft.result }
    if (patch.bpm != null && Number.isFinite(patch.bpm)) r.bpm = patch.bpm
    if (patch.tonic || patch.scale) {
      const tonic = patch.tonic ?? r.key.tonic
      const scale = patch.scale ?? r.key.scale
      r.key = makeKeyEstimate(tonic, scale, r.key.confidence)
    }
    set((s) => ({ drafts: { ...s.drafts, [sectionId]: { ...draft, result: r } } }))
  },
}))
