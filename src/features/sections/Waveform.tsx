import { useCallback, useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'
import type { Section, Track } from '../../types'
import { storage } from '../../storage'
import { formatTime } from '../../lib/format'
import { snapToZeroCrossing } from '../../audio/zeroCrossing'
import { useAnalysisStore } from '../analysis/analysisStore'
import { useSectionsStore } from './sectionsStore'
import { SectionList } from './SectionList'

const SEC_PREFIX = 'sec:'
const BOUND_PREFIX = 'bound:'

interface WaveformProps {
  track: Track | null
}

export function Waveform({ track }: WaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WaveSurfer | null>(null)
  const regionsRef = useRef<RegionsPlugin | null>(null)
  const decodedRef = useRef<AudioBuffer | null>(null)
  const zoomRef = useRef(80)

  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [zoom, setZoom] = useState(80)

  const sections = useSectionsStore((s) => s.sections)
  const duration = useSectionsStore((s) => s.duration)
  const selectedId = useSectionsStore((s) => s.selectedSectionId)
  const select = useSectionsStore((s) => s.select)

  const snap = useCallback(
    (t: number) => (decodedRef.current ? snapToZeroCrossing(decodedRef.current, t) : t),
    [],
  )

  // Create / tear down the wavesurfer instance for the selected track.
  useEffect(() => {
    let cancelled = false
    let ws: WaveSurfer | null = null
    let objectUrl: string | null = null
    setReady(false)
    setPlaying(false)
    setCurrent(0)

    if (!track || !containerRef.current) return

    void (async () => {
      const blob = await storage.getBlob(track.audioBlobKey)
      if (cancelled || !blob || !containerRef.current) return
      objectUrl = URL.createObjectURL(blob)
      ws = WaveSurfer.create({
        container: containerRef.current,
        url: objectUrl,
        height: 96,
        waveColor: '#3f3f46',
        progressColor: '#10b981',
        cursorColor: '#e4e4e7',
        minPxPerSec: zoomRef.current,
        dragToSeek: true,
      })
      const regions = ws.registerPlugin(RegionsPlugin.create())
      wsRef.current = ws
      regionsRef.current = regions

      ws.on('decode', (d) => {
        if (cancelled || !ws) return
        const decoded = ws.getDecodedData()
        decodedRef.current = decoded
        if (decoded) useAnalysisStore.getState().setBuffer(track.id, decoded)
        void useSectionsStore.getState().load(track.id, d)
        setReady(true)
      })
      ws.on('timeupdate', (t) => setCurrent(t))
      ws.on('play', () => setPlaying(true))
      ws.on('pause', () => setPlaying(false))
      ws.on('finish', () => setPlaying(false))

      regions.on('region-clicked', (region, e) => {
        e.stopPropagation()
        if (region.id.startsWith(SEC_PREFIX)) {
          useSectionsStore.getState().select(region.id.slice(SEC_PREFIX.length))
          region.play(true)
        }
      })
      regions.on('region-double-clicked', (region, e) => {
        if (region.id.startsWith(SEC_PREFIX)) {
          const el = region.element
          const frac = el && el.offsetWidth ? e.offsetX / el.offsetWidth : 0.5
          const t = region.start + frac * (region.end - region.start)
          void useSectionsStore.getState().splitAt(snap(t))
        } else if (region.id.startsWith(BOUND_PREFIX)) {
          void useSectionsStore.getState().mergeRightOf(region.id.slice(BOUND_PREFIX.length))
        }
      })
      regions.on('region-updated', (region) => {
        if (!region.id.startsWith(BOUND_PREFIX)) return
        void useSectionsStore
          .getState()
          .moveBoundary(region.id.slice(BOUND_PREFIX.length), snap(region.start))
      })
    })()

    return () => {
      cancelled = true
      ws?.destroy()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      wsRef.current = null
      regionsRef.current = null
      decodedRef.current = null
    }
  }, [track?.id, track?.audioBlobKey, snap])

  // Re-draw section regions + divider handles whenever the model changes.
  useEffect(() => {
    const regions = regionsRef.current
    if (!regions || !ready) return
    regions.clearRegions()
    sections.forEach((s, i) => {
      regions.addRegion({
        id: `${SEC_PREFIX}${s.id}`,
        start: s.startSec,
        end: s.endSec,
        drag: false,
        resize: false,
        color:
          s.id === selectedId
            ? 'rgba(16,185,129,0.20)'
            : i % 2
              ? 'rgba(244,244,245,0.05)'
              : 'rgba(244,244,245,0.10)',
        content: s.label || `${i + 1}`,
      })
    })
    for (let i = 0; i < sections.length - 1; i++) {
      regions.addRegion({
        id: `${BOUND_PREFIX}${sections[i].id}`,
        start: sections[i].endSec,
        end: sections[i].endSec,
        drag: true,
        resize: false,
        color: '#f59e0b',
      })
    }
  }, [sections, selectedId, ready])

  // Apply zoom changes.
  useEffect(() => {
    zoomRef.current = zoom
    if (ready && wsRef.current) wsRef.current.zoom(zoom)
  }, [zoom, ready])

  const togglePlay = () => void wsRef.current?.playPause()
  const splitAtPlayhead = () => {
    const ws = wsRef.current
    if (ws) void useSectionsStore.getState().splitAt(snap(ws.getCurrentTime()))
  }
  const playSection = (s: Section) => {
    select(s.id)
    void wsRef.current?.play(s.startSec, s.endSec)
  }

  if (!track) {
    return <p className="text-sm text-zinc-500">Select a track to view its waveform.</p>
  }

  const total = duration || track.durationSec

  return (
    <div className="space-y-3 rounded-lg border border-zinc-800 p-4">
      <div className="truncate text-sm font-medium">{track.name}</div>
      <div ref={containerRef} data-testid="waveform" className="w-full rounded bg-zinc-900/40" />

      <div className="flex flex-wrap items-center gap-3">
        <button
          data-testid="play-toggle"
          onClick={togglePlay}
          disabled={!ready}
          className="rounded-md bg-emerald-500 px-4 py-1.5 text-sm font-medium text-emerald-950 hover:bg-emerald-400 disabled:opacity-40"
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <span data-testid="current-time" className="tabular-nums text-xs text-zinc-400">
          {formatTime(current)} / {formatTime(total)}
        </span>
        <button
          data-testid="split-btn"
          onClick={splitAtPlayhead}
          disabled={!ready}
          className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
        >
          Split at playhead
        </button>
        <label className="ml-auto flex items-center gap-2 text-xs text-zinc-400">
          Zoom
          <input
            type="range"
            min={20}
            max={400}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="accent-emerald-500"
          />
        </label>
      </div>

      <p className="text-xs text-zinc-500">
        Double-click a section to split it · drag an amber handle to move a divider ·
        double-click a handle to remove it
      </p>

      <SectionList
        sections={sections}
        selectedId={selectedId}
        onPlay={playSection}
        onSelect={select}
        onRename={(id, label) => void useSectionsStore.getState().rename(id, label)}
        onRemove={(id) => void useSectionsStore.getState().removeSection(id)}
      />
    </div>
  )
}
