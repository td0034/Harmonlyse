import { useState } from 'react'
import type { Snippet } from '../../types'
import { uid } from '../../lib/id'
import { useSectionsStore } from '../sections/sectionsStore'
import { useAnalysisStore } from '../analysis/analysisStore'
import { useEmotionStore } from '../emotion/emotionStore'
import { useSnippetsStore } from './snippetsStore'

export function SaveSnippet() {
  const sections = useSectionsStore((s) => s.sections)
  const selectedId = useSectionsStore((s) => s.selectedSectionId)
  const section = sections.find((s) => s.id === selectedId) ?? null
  const analysis = useAnalysisStore((s) => (selectedId ? s.drafts[selectedId]?.result : undefined))
  const emotion = useEmotionStore((s) => (selectedId ? s.drafts[selectedId] : undefined))
  const save = useSnippetsStore((s) => s.save)
  const [saved, setSaved] = useState(false)

  if (!section) return null
  const canSave = !!analysis

  const onSave = async () => {
    if (!analysis) return
    const snippet: Snippet = {
      id: uid(),
      sectionId: section.id,
      trackId: section.trackId,
      startSec: section.startSec,
      endSec: section.endSec,
      bpm: analysis.bpm,
      key: analysis.key,
      chroma: analysis.chroma,
      emotion: emotion ?? { valence: 0, arousal: 0, names: [] },
      // Untransformed: identity transform, audio referenced by offsets (no blob).
      transform: { speedRatio: 1, pitchSemitones: 0, pitchCents: 0 },
      createdAt: Date.now(),
    }
    await save(snippet)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800 p-4">
      <button
        data-testid="save-snippet-btn"
        disabled={!canSave}
        onClick={() => void onSave()}
        className="rounded-md bg-emerald-500 px-4 py-1.5 text-sm font-medium text-emerald-950 hover:bg-emerald-400 disabled:opacity-40"
      >
        Save snippet
      </button>
      <span className="text-xs text-zinc-500">
        {canSave
          ? 'Saves the selected section with its analysis + emotion (audio referenced by offsets).'
          : 'Analyse the section first to enable saving.'}
      </span>
      {saved && (
        <span data-testid="snippet-saved" className="text-xs font-medium text-emerald-300">
          Saved ✓
        </span>
      )}
    </div>
  )
}
