import { useState } from 'react'
import type { Snippet } from '../../types'
import { uid } from '../../lib/id'
import { rotateChroma, transposeKey } from '../../analysis/camelot'
import { renderTransform } from '../../audio/transform'
import { storage } from '../../storage'
import { useSectionsStore } from '../sections/sectionsStore'
import { useAnalysisStore } from '../analysis/analysisStore'
import { useEmotionStore } from '../emotion/emotionStore'
import { useSnippetsStore } from '../snippets/snippetsStore'

const numInput =
  'mt-1 block w-20 rounded bg-zinc-900 px-2 py-1 text-sm text-zinc-100 ring-1 ring-inset ring-zinc-700 focus:ring-emerald-500'

export function TransformPanel() {
  const sections = useSectionsStore((s) => s.sections)
  const selectedId = useSectionsStore((s) => s.selectedSectionId)
  const section = sections.find((s) => s.id === selectedId) ?? null
  const analysis = useAnalysisStore((s) => (selectedId ? s.drafts[selectedId]?.result : undefined))
  const buffer = useAnalysisStore((s) => s.buffer)
  const emotion = useEmotionStore((s) => (selectedId ? s.drafts[selectedId] : undefined))
  const save = useSnippetsStore((s) => s.save)

  const [speed, setSpeed] = useState(1)
  const [semitones, setSemitones] = useState(0)
  const [cents, setCents] = useState(0)
  const [rendering, setRendering] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | undefined>()

  if (!section) return null

  const totalCents = semitones * 100 + cents
  const roundedSemis = Math.round(totalCents / 100)
  const residual = totalCents - roundedSemis * 100
  const resultKey = analysis ? transposeKey(analysis.key, roundedSemis) : null
  const camelotText = !resultKey
    ? '—'
    : resultKey.camelot !== analysis!.key.camelot
      ? `${resultKey.camelot} (${analysis!.key.camelot})`
      : resultKey.camelot

  const onSave = async () => {
    if (!analysis || !buffer) return
    setRendering(true)
    setError(undefined)
    try {
      const blob = await renderTransform(buffer, section.startSec, section.endSec, {
        speedRatio: speed,
        pitchSemitones: semitones,
        pitchCents: cents,
      })
      const blobKey = `snip-${uid()}`
      await storage.putBlob(blobKey, blob)
      // Link back to a base (untransformed) snippet of this section, if one exists.
      const existing = await storage.querySnippets({ sectionId: section.id })
      const base = existing.find((x) => !x.audioBlobKey)
      const snippet: Snippet = {
        id: uid(),
        sectionId: section.id,
        trackId: section.trackId,
        startSec: section.startSec,
        endSec: section.endSec,
        bpm: Math.round(analysis.bpm * speed * 10) / 10,
        key: transposeKey(analysis.key, roundedSemis),
        chroma: rotateChroma(analysis.chroma, roundedSemis),
        emotion: emotion ?? { valence: 0, arousal: 0, names: [] },
        transform: { speedRatio: speed, pitchSemitones: semitones, pitchCents: cents },
        audioBlobKey: blobKey,
        derivedFromSnippetId: base?.id,
        createdAt: Date.now(),
      }
      await save(snippet)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRendering(false)
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-zinc-800 p-4">
      <h3 className="text-sm font-semibold text-zinc-200">Transform</h3>
      {!analysis && (
        <p className="text-xs text-zinc-500">
          Analyse the section first — the transform needs the detected key.
        </p>
      )}
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-xs text-zinc-400">
          Speed ×
          <input
            data-testid="transform-speed"
            type="number"
            step="0.05"
            min="0.25"
            max="4"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value) || 1)}
            className={numInput}
          />
        </label>
        <label className="text-xs text-zinc-400">
          Pitch semitones
          <input
            data-testid="transform-semitones"
            type="number"
            step="1"
            min="-24"
            max="24"
            value={semitones}
            onChange={(e) => setSemitones(Math.round(Number(e.target.value) || 0))}
            className={numInput}
          />
        </label>
        <label className="text-xs text-zinc-400">
          Cents
          <input
            data-testid="transform-cents"
            type="number"
            step="1"
            min="-100"
            max="100"
            value={cents}
            onChange={(e) => setCents(Number(e.target.value) || 0)}
            className={numInput}
          />
        </label>
        <div className="text-xs text-zinc-400">
          Resulting key
          <div
            data-testid="transform-camelot"
            className="mt-1 rounded bg-emerald-500/15 px-3 py-1 text-base font-semibold text-emerald-300"
          >
            {camelotText}
            {residual !== 0 && (
              <span className="ml-1 text-xs text-zinc-400">
                {residual > 0 ? '+' : ''}
                {residual}¢
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          data-testid="save-transform-btn"
          disabled={!analysis || !buffer || rendering}
          onClick={() => void onSave()}
          className="rounded-md bg-emerald-500 px-4 py-1.5 text-sm font-medium text-emerald-950 hover:bg-emerald-400 disabled:opacity-40"
        >
          {rendering ? 'Rendering…' : 'Save transformed snippet'}
        </button>
        {saved && (
          <span data-testid="transform-saved" className="text-xs font-medium text-emerald-300">
            Saved ✓
          </span>
        )}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
      <p className="text-xs text-zinc-500">
        Independent time/pitch via Rubber Band → saved as a new derived snippet
        (the source keeps its original key).
      </p>
    </div>
  )
}
