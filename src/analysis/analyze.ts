import type { KeyEstimate } from '../types'
import { getEssentia } from './essentia'
import { makeKeyEstimate } from './camelot'
import { computeSpectrumAndChroma } from './spectrum'

/** Essentia's rhythm/key algorithms assume 44.1 kHz input. */
const ANALYSIS_SR = 44100

export interface SectionAnalysis {
  bpm: number
  key: KeyEstimate
  chroma: number[]
  spectrum: number[]
  /** 0..1 blended confidence (key strength + rhythm confidence). */
  confidence: number
}

/** Down-mix a section of an AudioBuffer to mono Float32. */
function sliceMono(buffer: AudioBuffer, startSec: number, endSec: number): Float32Array {
  const sr = buffer.sampleRate
  const s = Math.max(0, Math.floor(startSec * sr))
  const e = Math.min(buffer.length, Math.floor(endSec * sr))
  const len = Math.max(0, e - s)
  const out = new Float32Array(len)
  const chs = buffer.numberOfChannels
  for (let c = 0; c < chs; c++) {
    const d = buffer.getChannelData(c)
    for (let i = 0; i < len; i++) out[i] += d[s + i] / chs
  }
  return out
}

/** Resample mono audio to 44.1 kHz via OfflineAudioContext (no-op if already 44.1k). */
async function resampleTo44k(mono: Float32Array, fromSr: number): Promise<Float32Array> {
  if (fromSr === ANALYSIS_SR || mono.length === 0) return mono
  const frames = Math.max(1, Math.ceil((mono.length * ANALYSIS_SR) / fromSr))
  const offline = new OfflineAudioContext(1, frames, ANALYSIS_SR)
  const buf = offline.createBuffer(1, mono.length, fromSr)
  // Copy into a buffer-backed Float32Array (satisfies copyToChannel's typing).
  buf.copyToChannel(new Float32Array(mono), 0)
  const src = offline.createBufferSource()
  src.buffer = buf
  src.connect(offline.destination)
  src.start()
  const rendered = await offline.startRendering()
  return rendered.getChannelData(0).slice()
}

/**
 * Analyse one section: BPM + key→Camelot (Essentia) and chroma + spectrum
 * (our FFT). Audio is resampled to 44.1 kHz so Essentia's rate assumptions
 * hold regardless of the decode sample rate.
 */
export async function analyzeSection(
  buffer: AudioBuffer,
  startSec: number,
  endSec: number,
): Promise<SectionAnalysis> {
  const mono = await resampleTo44k(sliceMono(buffer, startSec, endSec), buffer.sampleRate)
  const essentia = await getEssentia()

  const vec = essentia.arrayToVector(mono)
  let bpm = 0
  let rhythmConf = 0
  try {
    const r = essentia.RhythmExtractor2013(vec, 208, 'multifeature', 40)
    bpm = r.bpm
    rhythmConf = r.confidence
  } catch {
    try {
      bpm = essentia.PercivalBpmEstimator(vec).bpm
    } catch {
      bpm = 0
    }
  }

  const k = essentia.KeyExtractor(
    vec,
    true,
    4096,
    4096,
    12,
    3500,
    60,
    25,
    0.2,
    'bgate',
    ANALYSIS_SR,
    0.0001,
    440,
    'cosine',
    'hann',
  )
  ;(vec as { delete?: () => void }).delete?.()

  const key = makeKeyEstimate(k.key, k.scale === 'minor' ? 'minor' : 'major', k.strength)
  const { spectrum, chroma } = computeSpectrumAndChroma(mono, ANALYSIS_SR)

  // RhythmExtractor2013 confidence is ~0..5.32; normalise loosely.
  const confidence = Math.max(0, Math.min(1, (key.confidence + Math.min(1, rhythmConf / 3)) / 2))

  return { bpm: Math.round(bpm * 10) / 10, key, chroma, spectrum, confidence }
}
