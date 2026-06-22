import type { EmotionQuadrant } from '../../types'
import { NAMED_EMOTIONS } from '../emotion/names'
import { useSnippetsStore } from './snippetsStore'

const CAMELOTS: string[] = []
for (let n = 1; n <= 12; n++) {
  CAMELOTS.push(`${n}A`)
  CAMELOTS.push(`${n}B`)
}

const QUADRANTS: { value: EmotionQuadrant; label: string }[] = [
  { value: 'q1', label: 'high · pleasant' },
  { value: 'q2', label: 'high · unpleasant' },
  { value: 'q3', label: 'low · unpleasant' },
  { value: 'q4', label: 'low · pleasant' },
]

const selectClass =
  'mt-1 block rounded bg-zinc-900 px-2 py-1 text-sm text-zinc-100 ring-1 ring-inset ring-zinc-700 focus:ring-emerald-500'

export function SnippetFilters() {
  const filter = useSnippetsStore((s) => s.filter)
  const setFilter = useSnippetsStore((s) => s.setFilter)
  const clearFilter = useSnippetsStore((s) => s.clearFilter)

  const toggleName = (n: string) => {
    const names = filter.names.includes(n)
      ? filter.names.filter((x) => x !== n)
      : [...filter.names, n]
    void setFilter({ names })
  }

  return (
    <div className="space-y-3 rounded-lg border border-zinc-800 p-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-zinc-400">
          Camelot
          <select
            data-testid="filter-camelot"
            value={filter.camelot ?? ''}
            onChange={(e) => void setFilter({ camelot: e.target.value || undefined })}
            className={selectClass}
          >
            <option value="">any</option>
            {CAMELOTS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-zinc-400">
          Quadrant
          <select
            data-testid="filter-quadrant"
            value={filter.quadrant ?? ''}
            onChange={(e) =>
              void setFilter({ quadrant: (e.target.value || undefined) as EmotionQuadrant | undefined })
            }
            className={selectClass}
          >
            <option value="">any</option>
            {QUADRANTS.map((q) => (
              <option key={q.value} value={q.value}>
                {q.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-zinc-400">
          BPM min
          <input
            data-testid="filter-bpm-min"
            type="number"
            value={filter.bpmMin ?? ''}
            onChange={(e) => void setFilter({ bpmMin: e.target.value ? Number(e.target.value) : undefined })}
            className="mt-1 block w-20 rounded bg-zinc-900 px-2 py-1 text-sm text-zinc-100 ring-1 ring-inset ring-zinc-700 focus:ring-emerald-500"
          />
        </label>

        <label className="text-xs text-zinc-400">
          BPM max
          <input
            data-testid="filter-bpm-max"
            type="number"
            value={filter.bpmMax ?? ''}
            onChange={(e) => void setFilter({ bpmMax: e.target.value ? Number(e.target.value) : undefined })}
            className="mt-1 block w-20 rounded bg-zinc-900 px-2 py-1 text-sm text-zinc-100 ring-1 ring-inset ring-zinc-700 focus:ring-emerald-500"
          />
        </label>

        <button
          data-testid="filter-clear"
          onClick={() => void clearFilter()}
          className="rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          Clear
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-zinc-500">names:</span>
        {NAMED_EMOTIONS.map((n) => {
          const on = filter.names.includes(n)
          return (
            <button
              key={n}
              data-testid="filter-name"
              data-name={n}
              aria-pressed={on}
              onClick={() => toggleName(n)}
              className={`rounded-full px-2 py-0.5 text-xs ${
                on ? 'bg-emerald-500 text-emerald-950' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {n}
            </button>
          )
        })}
      </div>
    </div>
  )
}
