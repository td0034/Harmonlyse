import type { RubberBandInterface } from 'rubberband-wasm'
import { encodeWavBlob } from './wav'

let apiPromise: Promise<RubberBandInterface> | null = null

/**
 * Lazily load Rubber Band (WASM) once. The .wasm is fetched + compiled on
 * first transform (code-split), then RubberBandInterface wraps the module.
 */
function getRubberBand(): Promise<RubberBandInterface> {
  if (!apiPromise) {
    apiPromise = (async () => {
      const [{ RubberBandInterface }, wasmUrlMod] = await Promise.all([
        import('rubberband-wasm'),
        import('rubberband-wasm/dist/rubberband.wasm?url'),
      ])
      const bytes = await (await fetch(wasmUrlMod.default)).arrayBuffer()
      const module = await WebAssembly.compile(bytes)
      return RubberBandInterface.initialize(module)
    })()
  }
  return apiPromise
}

function concatF32(chunks: Float32Array[]): Float32Array {
  let total = 0
  for (const c of chunks) total += c.length
  const out = new Float32Array(total)
  let o = 0
  for (const c of chunks) {
    out.set(c, o)
    o += c.length
  }
  return out
}

/**
 * Offline time/pitch render via Rubber Band. Follows the library's offline
 * study → process → retrieve pattern with manual WASM channel pointers.
 * `timeRatio` = output/input duration; `pitchScale` = frequency multiplier.
 */
async function renderRB(
  channels: Float32Array[],
  sampleRate: number,
  timeRatio: number,
  pitchScale: number,
): Promise<Float32Array[]> {
  const rb = await getRubberBand()
  const numCh = channels.length
  const inLen = channels[0].length

  const state = rb.rubberband_new(sampleRate, numCh, 0, timeRatio, pitchScale)
  rb.rubberband_set_time_ratio(state, timeRatio)
  rb.rubberband_set_pitch_scale(state, pitchScale)

  let block = rb.rubberband_get_samples_required(state)
  if (!block || block < 1) block = 1024

  const arrayPtr = rb.malloc(numCh * 4)
  const chPtr: number[] = []
  for (let c = 0; c < numCh; c++) {
    const p = rb.malloc(block * 4)
    chPtr.push(p)
    rb.memWritePtr(arrayPtr + c * 4, p)
  }
  rb.rubberband_set_expected_input_duration(state, inLen)

  const out: Float32Array[][] = Array.from({ length: numCh }, () => [])
  const drain = (final: boolean) => {
    for (;;) {
      const avail = rb.rubberband_available(state)
      if (avail < 1) break
      if (!final && avail < block) break
      const got = rb.rubberband_retrieve(state, arrayPtr, Math.min(block, avail))
      if (got < 1) break
      // Copy out before the next retrieve overwrites the WASM buffers.
      for (let c = 0; c < numCh; c++) out[c].push(rb.memReadF32(chPtr[c], got).slice())
    }
  }

  let read = 0
  while (read < inLen) {
    for (let c = 0; c < numCh; c++) rb.memWrite(chPtr[c], channels[c].subarray(read, read + block))
    const rem = Math.min(block, inLen - read)
    read += rem
    rb.rubberband_study(state, arrayPtr, rem, read >= inLen ? 1 : 0)
  }

  read = 0
  while (read < inLen) {
    for (let c = 0; c < numCh; c++) rb.memWrite(chPtr[c], channels[c].subarray(read, read + block))
    const rem = Math.min(block, inLen - read)
    read += rem
    rb.rubberband_process(state, arrayPtr, rem, read >= inLen ? 1 : 0)
    drain(false)
  }
  drain(true)

  for (const p of chPtr) rb.free(p)
  rb.free(arrayPtr)
  rb.rubberband_delete(state)

  return out.map(concatF32)
}

export interface RenderParams {
  speedRatio: number // playback speed multiplier (1 = unchanged)
  pitchSemitones: number
  pitchCents: number
}

/** Render a section of `buffer` with the given transform to a WAV Blob. */
export async function renderTransform(
  buffer: AudioBuffer,
  startSec: number,
  endSec: number,
  p: RenderParams,
): Promise<Blob> {
  const sr = buffer.sampleRate
  const s = Math.max(0, Math.floor(startSec * sr))
  const e = Math.min(buffer.length, Math.floor(endSec * sr))
  const len = Math.max(0, e - s)
  const channels: Float32Array[] = []
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    channels.push(buffer.getChannelData(c).slice(s, s + len))
  }
  const timeRatio = 1 / p.speedRatio
  const pitchScale = Math.pow(2, (p.pitchSemitones + p.pitchCents / 100) / 12)
  const rendered = await renderRB(channels, sr, timeRatio, pitchScale)
  return encodeWavBlob(rendered, sr)
}
