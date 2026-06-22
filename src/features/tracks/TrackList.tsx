import { useEffect, useState } from 'react'
import { useTracksStore } from './tracksStore'
import { storage } from '../../storage'
import { formatBytes, formatTime } from '../../lib/format'

export function TrackList() {
  const tracks = useTracksStore((s) => s.tracks)
  const selectedTrackId = useTracksStore((s) => s.selectedTrackId)
  const select = useTracksStore((s) => s.select)
  const remove = useTracksStore((s) => s.remove)
  const [usage, setUsage] = useState<string | null>(null)

  useEffect(() => {
    void storage.estimateUsage().then((est) => {
      if (est?.usage != null) setUsage(formatBytes(est.usage))
    })
  }, [tracks])

  if (!tracks.length) {
    return <p className="text-sm text-zinc-500">No tracks yet — import one above.</p>
  }

  return (
    <div className="space-y-2">
      <ul className="divide-y divide-zinc-800 overflow-hidden rounded-lg border border-zinc-800">
        {tracks.map((t) => {
          const active = t.id === selectedTrackId
          return (
            <li
              key={t.id}
              data-testid="track-row"
              className={`flex items-center gap-3 px-3 py-2 ${
                active ? 'bg-zinc-800/70' : 'hover:bg-zinc-900'
              }`}
            >
              <button className="min-w-0 flex-1 text-left" onClick={() => select(t.id)}>
                <div className="truncate text-sm font-medium text-zinc-100">{t.name}</div>
                <div className="text-xs text-zinc-500">
                  {formatTime(t.durationSec)} · {Math.round(t.sampleRate / 1000)} kHz
                </div>
              </button>
              <button
                onClick={() => void remove(t.id)}
                className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-red-500/10 hover:text-red-300"
              >
                Delete
              </button>
            </li>
          )
        })}
      </ul>
      {usage && <p className="text-xs text-zinc-500">Storage used: {usage}</p>}
    </div>
  )
}
