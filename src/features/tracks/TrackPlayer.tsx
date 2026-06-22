import { useEffect, useRef, useState } from 'react'
import { useTracksStore } from './tracksStore'
import { storage } from '../../storage'
import { formatTime } from '../../lib/format'

export function TrackPlayer() {
  const selectedTrackId = useTracksStore((s) => s.selectedTrackId)
  const tracks = useTracksStore((s) => s.tracks)
  const track = tracks.find((t) => t.id === selectedTrackId) ?? null

  const audioRef = useRef<HTMLAudioElement>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)

  // Load the track's audio Blob into an object URL.
  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    setPlaying(false)
    setCurrent(0)
    setDuration(0)
    if (!track) {
      setUrl(null)
      return
    }
    void storage.getBlob(track.audioBlobKey).then((blob) => {
      if (cancelled || !blob) {
        setUrl(null)
        return
      }
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [track?.id, track?.audioBlobKey])

  const toggle = () => {
    const el = audioRef.current
    if (!el) return
    if (el.paused) void el.play()
    else el.pause()
  }

  if (!track) {
    return <p className="text-sm text-zinc-500">Select a track to play.</p>
  }

  const max = duration || track.durationSec

  return (
    <div className="space-y-3 rounded-lg border border-zinc-800 p-4">
      <div className="truncate text-sm font-medium">{track.name}</div>
      <audio
        ref={audioRef}
        src={url ?? undefined}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration
          if (Number.isFinite(d)) setDuration(d)
        }}
        onEnded={() => setPlaying(false)}
      />
      <div className="flex items-center gap-3">
        <button
          data-testid="play-toggle"
          onClick={toggle}
          disabled={!url}
          className="rounded-md bg-emerald-500 px-4 py-1.5 text-sm font-medium text-emerald-950 transition-colors hover:bg-emerald-400 disabled:opacity-40"
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <span data-testid="current-time" className="tabular-nums text-xs text-zinc-400">
          {formatTime(current)} / {formatTime(max)}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={max || 1}
        step={0.01}
        value={current}
        aria-label="Seek"
        onChange={(e) => {
          const el = audioRef.current
          const v = Number(e.target.value)
          if (el) el.currentTime = v
          setCurrent(v)
        }}
        className="w-full accent-emerald-500"
      />
    </div>
  )
}
