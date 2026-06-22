let sharedCtx: AudioContext | null = null

/**
 * Lazily-created shared AudioContext. The Web Audio API is the app's audio
 * engine (decode now; routing / AnalyserNode spectrum in later phases).
 */
export function getAudioContext(): AudioContext {
  if (!sharedCtx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    sharedCtx = new Ctor()
  }
  return sharedCtx
}

export interface DecodedMeta {
  durationSec: number
  sampleRate: number
}

/**
 * Decode `data` to read duration and sample rate. Note: decodeAudioData
 * detaches (consumes) the passed ArrayBuffer, so pass a buffer you don't
 * need afterwards — the persisted audio Blob is kept separately.
 */
export async function decodeMeta(data: ArrayBuffer): Promise<DecodedMeta> {
  const buf = await getAudioContext().decodeAudioData(data)
  return { durationSec: buf.duration, sampleRate: buf.sampleRate }
}
