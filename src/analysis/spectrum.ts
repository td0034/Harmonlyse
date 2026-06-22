import { fftMagnitudes } from './fft'

const FRAME = 4096
const DISPLAY_BARS = 128

export interface SpectrumResult {
  /** Averaged magnitude spectrum, downsampled to DISPLAY_BARS, normalised 0..1. */
  spectrum: number[]
  /** 12-bin chroma (index 0 = C .. 11 = B), normalised so the max bin = 1. */
  chroma: number[]
}

/**
 * Compute an averaged magnitude spectrum (for display) and a 12-bin chroma
 * vector by folding FFT bins into pitch classes. Chroma is computed here
 * (not via Essentia) so the metric stays under our control for later
 * similarity work; Essentia handles key/BPM.
 */
export function computeSpectrumAndChroma(mono: Float32Array, sampleRate: number): SpectrumResult {
  const acc = new Float32Array(FRAME / 2)
  const win = new Float32Array(FRAME)
  for (let i = 0; i < FRAME; i++) win[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (FRAME - 1)))

  const buf = new Float32Array(FRAME)
  let frames = 0
  for (let start = 0; start + FRAME <= mono.length; start += FRAME) {
    for (let i = 0; i < FRAME; i++) buf[i] = mono[start + i] * win[i]
    const mag = fftMagnitudes(buf)
    for (let i = 0; i < acc.length; i++) acc[i] += mag[i]
    frames++
  }
  if (frames === 0) {
    // Signal shorter than one frame: zero-pad a single frame.
    for (let i = 0; i < FRAME; i++) buf[i] = (i < mono.length ? mono[i] : 0) * win[i]
    const mag = fftMagnitudes(buf)
    for (let i = 0; i < acc.length; i++) acc[i] += mag[i]
    frames = 1
  }
  for (let i = 0; i < acc.length; i++) acc[i] /= frames

  const binHz = sampleRate / FRAME

  // Chroma: fold bins (within a musical range) into 12 pitch classes.
  const chroma = new Array(12).fill(0)
  for (let i = 1; i < acc.length; i++) {
    const f = i * binHz
    if (f < 27.5 || f > 5000) continue
    const midi = 69 + 12 * Math.log2(f / 440)
    const pc = ((Math.round(midi) % 12) + 12) % 12
    chroma[pc] += acc[i]
  }
  const maxC = Math.max(...chroma, 1e-9)
  for (let i = 0; i < 12; i++) chroma[i] = chroma[i] / maxC

  // Spectrum for display: log-frequency bins, dB-scaled — far more legible
  // for music than a linear axis (which crams everything into the low end).
  const fMin = 30
  const fMax = Math.min(sampleRate / 2, 16000)
  const logMin = Math.log2(fMin)
  const logSpan = Math.log2(fMax) - logMin
  const power = new Array(DISPLAY_BARS).fill(0)
  const counts = new Array(DISPLAY_BARS).fill(0)
  for (let i = 1; i < acc.length; i++) {
    const f = i * binHz
    if (f < fMin || f > fMax) continue
    let b = Math.floor(((Math.log2(f) - logMin) / logSpan) * DISPLAY_BARS)
    if (b < 0) b = 0
    if (b >= DISPLAY_BARS) b = DISPLAY_BARS - 1
    power[b] += acc[i] * acc[i]
    counts[b]++
  }
  const FLOOR_DB = -60
  const db = power.map((p, b) => 10 * Math.log10((counts[b] ? p / counts[b] : 0) + 1e-12))
  const maxDb = Math.max(...db)
  const spectrum = db.map((d) => Math.max(0, Math.min(1, (d - (maxDb + FLOOR_DB)) / -FLOOR_DB)))

  return { spectrum, chroma }
}
