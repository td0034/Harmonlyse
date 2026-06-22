import type { Scale } from '../../types'
import { NOTE_OPTIONS } from '../../analysis/camelot'
import { useSectionsStore } from '../sections/sectionsStore'
import { useAnalysisStore } from './analysisStore'

const NOTE_LABELS = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']

export function AnalysisPanel() {
  const sections = useSectionsStore((s) => s.sections)
  const selectedId = useSectionsStore((s) => s.selectedSectionId)
  const section = sections.find((s) => s.id === selectedId) ?? null

  const buffer = useAnalysisStore((s) => s.buffer)
  const engineLoading = useAnalysisStore((s) => s.engineLoading)
  const draft = useAnalysisStore((s) => (selectedId ? s.drafts[selectedId] : undefined))
  const analyse = useAnalysisStore((s) => s.analyse)
  const override = useAnalysisStore((s) => s.override)

  if (!section) {
    return (
      <div className="rounded-lg border border-zinc-800 p-4 text-sm text-zinc-500">
        Select a section to analyse it.
      </div>
    )
  }

  const result = draft?.result
  const analysing = draft?.status === 'analysing'

  return (
    <div className="space-y-4 rounded-lg border border-zinc-800 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-zinc-200">
          Analysis — section {sections.findIndex((s) => s.id === section.id) + 1}
        </h3>
        <button
          data-testid="analyse-btn"
          onClick={() => void analyse(section)}
          disabled={!buffer || analysing}
          className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-medium text-emerald-950 hover:bg-emerald-400 disabled:opacity-40"
        >
          {analysing ? 'Analysing…' : result ? 'Re-analyse' : 'Analyse'}
        </button>
      </div>

      {engineLoading && analysing && (
        <p className="text-xs text-amber-300">Loading analysis engine (one-time)…</p>
      )}
      {draft?.status === 'error' && (
        <p className="text-xs text-red-400">Analysis failed: {draft.error}</p>
      )}
      {!result && !analysing && (
        <p className="text-xs text-zinc-500">
          Runs Essentia.js for BPM &amp; key (→ Camelot) plus chroma and spectrum. Short
          sections can be noisy — confirm or override below.
        </p>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <label className="text-xs text-zinc-400">
              BPM
              <input
                data-testid="analysis-bpm"
                type="number"
                step="0.1"
                value={result.bpm}
                onChange={(e) => override(section.id, { bpm: Number(e.target.value) })}
                className="mt-1 block w-24 rounded bg-zinc-900 px-2 py-1 text-sm text-zinc-100 ring-1 ring-inset ring-zinc-700 focus:ring-emerald-500"
              />
            </label>

            <label className="text-xs text-zinc-400">
              Key
              <select
                data-testid="analysis-tonic"
                value={result.key.tonic}
                onChange={(e) => override(section.id, { tonic: e.target.value })}
                className="mt-1 ml-0 block rounded bg-zinc-900 px-2 py-1 text-sm text-zinc-100 ring-1 ring-inset ring-zinc-700 focus:ring-emerald-500"
              >
                {NOTE_OPTIONS.map((n, i) => (
                  <option key={n} value={n}>
                    {NOTE_LABELS[i]}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs text-zinc-400">
              Scale
              <select
                data-testid="analysis-scale"
                value={result.key.scale}
                onChange={(e) => override(section.id, { scale: e.target.value as Scale })}
                className="mt-1 block rounded bg-zinc-900 px-2 py-1 text-sm text-zinc-100 ring-1 ring-inset ring-zinc-700 focus:ring-emerald-500"
              >
                <option value="major">major</option>
                <option value="minor">minor</option>
              </select>
            </label>

            <div className="text-xs text-zinc-400">
              Camelot
              <div
                data-testid="analysis-camelot"
                className="mt-1 rounded bg-emerald-500/15 px-3 py-1 text-base font-semibold text-emerald-300"
              >
                {result.key.camelot}
              </div>
            </div>

            <div className="text-xs text-zinc-400">
              Confidence
              <div className="mt-1 h-2 w-28 overflow-hidden rounded bg-zinc-800">
                <div
                  data-testid="analysis-confidence"
                  className="h-full bg-emerald-500"
                  style={{ width: `${Math.round(result.confidence * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs text-zinc-400">Chroma</div>
            <div data-testid="chroma" className="flex h-20 items-end gap-1">
              {result.chroma.map((v, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    data-testid="chroma-bar"
                    data-pc={i}
                    data-value={v.toFixed(4)}
                    className="w-full rounded-t bg-emerald-500/70"
                    style={{ height: `${Math.max(2, v * 100)}%` }}
                  />
                  <span className="text-[10px] text-zinc-500">{NOTE_LABELS[i]}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs text-zinc-400">Spectrum</div>
            <div data-testid="spectrum" className="flex h-16 items-end gap-px">
              {result.spectrum.map((v, i) => (
                <div
                  key={i}
                  className="flex-1 bg-zinc-500"
                  style={{ height: `${Math.max(1, v * 100)}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
