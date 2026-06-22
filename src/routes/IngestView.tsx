import { useEffect } from 'react'
import { useTracksStore } from '../features/tracks/tracksStore'
import { TrackImport } from '../features/tracks/TrackImport'
import { AudioCapture } from '../features/tracks/AudioCapture'
import { TrackList } from '../features/tracks/TrackList'
import { Waveform } from '../features/sections/Waveform'
import { AnalysisPanel } from '../features/analysis/AnalysisPanel'
import { EmotionPanel } from '../features/emotion/EmotionPanel'
import { SaveSnippet } from '../features/snippets/SaveSnippet'
import { TransformPanel } from '../features/transform/TransformPanel'

export function IngestView() {
  const refresh = useTracksStore((s) => s.refresh)
  const tracks = useTracksStore((s) => s.tracks)
  const selectedTrackId = useTracksStore((s) => s.selectedTrackId)
  const selectedTrack = tracks.find((t) => t.id === selectedTrackId) ?? null

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Ingest</h1>
        <p className="text-sm text-zinc-400">
          Upload a track, mark sections with dividers, and audition them. Analysis
          and tagging come next.
        </p>
      </div>

      <TrackImport />
      <AudioCapture />

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <div className="min-w-0 space-y-2">
          <h2 className="text-sm font-semibold text-zinc-300">Tracks</h2>
          <TrackList />
        </div>
        <div className="min-w-0 space-y-4">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-zinc-300">Waveform &amp; sections</h2>
            <Waveform track={selectedTrack} />
          </div>
          {selectedTrack && <AnalysisPanel />}
          {selectedTrack && <EmotionPanel />}
          {selectedTrack && <TransformPanel />}
          {selectedTrack && <SaveSnippet />}
        </div>
      </div>
    </section>
  )
}
