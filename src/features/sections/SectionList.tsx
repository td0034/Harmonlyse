import type { Section } from '../../types'
import { formatTime } from '../../lib/format'

interface SectionListProps {
  sections: Section[]
  selectedId: string | null
  onPlay: (section: Section) => void
  onSelect: (id: string) => void
  onRename: (id: string, label: string) => void
  onRemove: (id: string) => void
}

export function SectionList({
  sections,
  selectedId,
  onPlay,
  onSelect,
  onRename,
  onRemove,
}: SectionListProps) {
  return (
    <ul className="divide-y divide-zinc-800 overflow-hidden rounded-lg border border-zinc-800">
      {sections.map((s, i) => {
        const active = s.id === selectedId
        return (
          <li
            key={s.id}
            data-testid="section-row"
            className={`flex items-center gap-2 px-3 py-2 ${active ? 'bg-zinc-800/70' : ''}`}
            onClick={() => onSelect(s.id)}
          >
            <span className="w-6 shrink-0 text-xs tabular-nums text-zinc-500">{i + 1}</span>
            <input
              data-testid="section-label"
              value={s.label ?? ''}
              placeholder="label…"
              onChange={(e) => onRename(s.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="min-w-0 flex-1 rounded bg-zinc-900 px-2 py-1 text-sm text-zinc-100 outline-none ring-1 ring-inset ring-zinc-700 focus:ring-emerald-500"
            />
            <span className="shrink-0 tabular-nums text-xs text-zinc-500">
              {formatTime(s.startSec)}–{formatTime(s.endSec)}
            </span>
            <button
              data-testid="section-play"
              onClick={(e) => {
                e.stopPropagation()
                onPlay(s)
              }}
              className="shrink-0 rounded bg-emerald-500 px-2 py-1 text-xs font-medium text-emerald-950 hover:bg-emerald-400"
            >
              Play
            </button>
            <button
              data-testid="section-remove"
              disabled={sections.length <= 1}
              onClick={(e) => {
                e.stopPropagation()
                onRemove(s.id)
              }}
              className="shrink-0 rounded px-2 py-1 text-xs text-zinc-400 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-30"
              title="Remove section (merge with neighbour)"
            >
              ✕
            </button>
          </li>
        )
      })}
    </ul>
  )
}
