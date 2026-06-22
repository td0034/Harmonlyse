import { useEffect, useRef, useState } from 'react'
import type { Snippet } from '../types'
import { storage } from '../storage'
import { formatTime } from '../lib/format'
import { useSnippetsStore } from '../features/snippets/snippetsStore'
import { SnippetFilters } from '../features/snippets/SnippetFilters'

function quadrantLabel(valence: number, arousal: number): string {
  if (arousal >= 0) return valence >= 0 ? 'high · pleasant' : 'high · unpleasant'
  return valence >= 0 ? 'low · pleasant' : 'low · unpleasant'
}

export function LibraryView() {
  const snippets = useSnippetsStore((s) => s.snippets)
  const tracksById = useSnippetsStore((s) => s.tracksById)
  const load = useSnippetsStore((s) => s.load)
  const remove = useSnippetsStore((s) => s.remove)

  const audioRef = useRef<HTMLAudioElement>(null)
  const urlRef = useRef<string | null>(null)
  const stopAtRef = useRef<number>(Infinity)
  const [playingId, setPlayingId] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [load])
  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    },
    [],
  )

  const playSnippet = async (snippet: Snippet) => {
    const audio = audioRef.current
    if (!audio) return
    const track = tracksById[snippet.trackId]
    // Transformed snippets own a rendered blob; untransformed reference the track.
    const blobKey = snippet.audioBlobKey ?? track?.audioBlobKey
    if (!blobKey) return
    const blob = await storage.getBlob(blobKey)
    if (!blob) return
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    const url = URL.createObjectURL(blob)
    urlRef.current = url
    const startAt = snippet.audioBlobKey ? 0 : snippet.startSec
    stopAtRef.current = snippet.audioBlobKey ? Infinity : snippet.endSec
    audio.src = url
    audio.onloadedmetadata = () => {
      audio.currentTime = startAt
      void audio.play()
    }
    setPlayingId(snippet.id)
  }

  const onTimeUpdate = () => {
    const audio = audioRef.current
    if (audio && audio.currentTime >= stopAtRef.current) audio.pause()
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Library</h1>
        <p className="text-sm text-zinc-400">
          Saved snippets — filter by Camelot, emotion quadrant, BPM range, and named
          emotions.
        </p>
      </div>

      <SnippetFilters />
      <p className="text-xs text-zinc-500">
        <span data-testid="snippet-count">{snippets.length}</span> snippet
        {snippets.length === 1 ? '' : 's'}
      </p>

      <audio
        ref={audioRef}
        data-testid="library-audio"
        onTimeUpdate={onTimeUpdate}
        onEnded={() => setPlayingId(null)}
      />

      {snippets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-700 p-10 text-center text-zinc-500">
          No snippets yet — analyse a section and save it from Ingest.
        </div>
      ) : (
        <ul className="space-y-2">
          {snippets.map((s) => {
            const track = tracksById[s.trackId]
            return (
              <li
                key={s.id}
                data-testid="snippet-row"
                className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-zinc-800 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div data-testid="snippet-name" className="truncate text-sm font-medium text-zinc-100">
                    {track?.name ?? 'unknown track'}{' '}
                    <span className="text-zinc-500">
                      [{formatTime(s.startSec)}–{formatTime(s.endSec)}]
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 text-xs text-zinc-400">
                    <span data-testid="snippet-camelot" className="font-semibold text-emerald-300">
                      {s.key.camelot}
                    </span>
                    <span data-testid="snippet-bpm">{s.bpm} BPM</span>
                    <span data-testid="snippet-quadrant">
                      {quadrantLabel(s.emotion.valence, s.emotion.arousal)}
                    </span>
                    {s.emotion.names.length > 0 && (
                      <span data-testid="snippet-names" className="text-zinc-500">
                        {s.emotion.names.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  data-testid="snippet-play"
                  onClick={() => void playSnippet(s)}
                  className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-medium text-emerald-950 hover:bg-emerald-400"
                >
                  {playingId === s.id ? 'Playing…' : 'Play'}
                </button>
                <button
                  data-testid="snippet-delete"
                  onClick={() => void remove(s.id)}
                  className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  Delete
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
