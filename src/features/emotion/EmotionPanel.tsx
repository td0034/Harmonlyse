import type { EmotionTag } from '../../types'
import { useSectionsStore } from '../sections/sectionsStore'
import { useEmotionStore } from './emotionStore'
import { EmotionPlane } from './EmotionPlane'

const NAMED = [
  'nostalgia',
  'dread',
  'euphoria',
  'melancholy',
  'tension',
  'calm',
  'triumph',
  'longing',
  'eerie',
  'warmth',
  'playful',
  'yearning',
]

function quadrantLabel(valence: number, arousal: number): string {
  if (arousal >= 0) return valence >= 0 ? 'high energy · pleasant' : 'high energy · unpleasant'
  return valence >= 0 ? 'low energy · pleasant' : 'low energy · unpleasant'
}

export function EmotionPanel() {
  const sections = useSectionsStore((s) => s.sections)
  const selectedId = useSectionsStore((s) => s.selectedSectionId)
  const draft = useEmotionStore((s) => (selectedId ? s.drafts[selectedId] : undefined))
  const setPoint = useEmotionStore((s) => s.setPoint)
  const toggleName = useEmotionStore((s) => s.toggleName)

  if (!selectedId || !sections.some((s) => s.id === selectedId)) return null

  const tag: EmotionTag = draft ?? { valence: 0, arousal: 0, names: [] }

  return (
    <div className="space-y-3 rounded-lg border border-zinc-800 p-4">
      <h3 className="text-sm font-semibold text-zinc-200">Emotion</h3>
      <div className="flex flex-wrap gap-5">
        <EmotionPlane
          valence={tag.valence}
          arousal={tag.arousal}
          onChange={(v, a) => setPoint(selectedId, v, a)}
        />
        <div className="min-w-[14rem] flex-1 space-y-3">
          <div className="text-xs text-zinc-400">
            Point{' '}
            <span data-testid="va-values" className="tabular-nums text-zinc-200">
              {tag.valence.toFixed(2)}, {tag.arousal.toFixed(2)}
            </span>
            <span className="mx-2 text-zinc-600">·</span>
            <span data-testid="quadrant" className="text-emerald-300">
              {quadrantLabel(tag.valence, tag.arousal)}
            </span>
          </div>
          <div>
            <div className="mb-1 text-xs text-zinc-400">
              Named emotions (independent of the point)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {NAMED.map((n) => {
                const on = tag.names.includes(n)
                return (
                  <button
                    key={n}
                    data-testid="emotion-chip"
                    data-name={n}
                    aria-pressed={on}
                    onClick={() => toggleName(selectedId, n)}
                    className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                      on
                        ? 'bg-emerald-500 text-emerald-950'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {n}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="text-xs text-zinc-500">
            Selected:{' '}
            <span data-testid="selected-emotions">{tag.names.join(', ') || '—'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
