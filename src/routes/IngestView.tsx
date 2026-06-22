import { useEffect } from 'react'
import { useTracksStore } from '../features/tracks/tracksStore'
import { TrackImport } from '../features/tracks/TrackImport'
import { TrackList } from '../features/tracks/TrackList'
import { TrackPlayer } from '../features/tracks/TrackPlayer'

export function IngestView() {
  const refresh = useTracksStore((s) => s.refresh)

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Ingest</h1>
        <p className="text-sm text-zinc-400">
          Upload a track and play it back. Sectioning, analysis and tagging come
          in later phases.
        </p>
      </div>

      <TrackImport />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-300">Tracks</h2>
          <TrackList />
        </div>
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-300">Player</h2>
          <TrackPlayer />
        </div>
      </div>
    </section>
  )
}
