import { useRef } from 'react'

interface EmotionPlaneProps {
  valence: number
  arousal: number
  onChange: (valence: number, arousal: number) => void
}

const clamp = (x: number) => Math.min(1, Math.max(-1, x))
const round2 = (x: number) => Math.round(x * 100) / 100

/**
 * Valence/arousal plane. X = valence (−1 left .. +1 right),
 * Y = arousal (+1 top .. −1 bottom). Click or drag to place the point.
 */
export function EmotionPlane({ valence, arousal, onChange }: EmotionPlaneProps) {
  const ref = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const update = (clientX: number, clientY: number) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const v = clamp(((clientX - r.left) / r.width) * 2 - 1)
    const a = clamp(1 - ((clientY - r.top) / r.height) * 2)
    onChange(round2(v), round2(a))
  }

  const left = `${((valence + 1) / 2) * 100}%`
  const top = `${((1 - arousal) / 2) * 100}%`

  return (
    <div
      ref={ref}
      data-testid="va-plane"
      onMouseDown={(e) => {
        dragging.current = true
        update(e.clientX, e.clientY)
      }}
      onMouseMove={(e) => {
        if (dragging.current) update(e.clientX, e.clientY)
      }}
      onMouseUp={() => {
        dragging.current = false
      }}
      onMouseLeave={() => {
        dragging.current = false
      }}
      className="relative aspect-square w-56 shrink-0 cursor-crosshair select-none rounded-lg border border-zinc-700 bg-zinc-900"
    >
      <div className="absolute left-1/2 top-0 h-full w-px bg-zinc-700/60" />
      <div className="absolute left-0 top-1/2 h-px w-full bg-zinc-700/60" />
      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500">pleasant</span>
      <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500">unpleasant</span>
      <span className="absolute left-1/2 top-1 -translate-x-1/2 text-[10px] text-zinc-500">high</span>
      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-zinc-500">low</span>
      <div
        data-testid="va-point"
        className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400 ring-2 ring-emerald-200"
        style={{ left, top }}
      />
    </div>
  )
}
