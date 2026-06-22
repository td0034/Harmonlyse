import type { KeyEstimate, Scale } from '../types'

// Pitch-class index (0 = C .. 11 = B) for note names, accepting sharps or flats.
const PITCH_CLASS: Record<string, number> = {
  C: 0, 'B#': 0,
  'C#': 1, Db: 1,
  D: 2,
  'D#': 3, Eb: 3,
  E: 4, Fb: 4,
  F: 5, 'E#': 5,
  'F#': 6, Gb: 6,
  G: 7,
  'G#': 8, Ab: 8,
  A: 9,
  'A#': 10, Bb: 10,
  B: 11, Cb: 11,
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// Camelot wheel number by pitch class (index 0 = C .. 11 = B).
const MAJOR_NUM = [8, 3, 10, 5, 12, 7, 2, 9, 4, 11, 6, 1] // major = 'B' side
const MINOR_NUM = [5, 12, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10] // minor = 'A' side

export const NOTE_OPTIONS = NOTE_NAMES

export function pitchClassOf(tonic: string): number | null {
  const pc = PITCH_CLASS[tonic.trim()]
  return pc == null ? null : pc
}

/** Camelot code for a pitch class + scale, e.g. (9, 'minor') -> '8A'. */
export function camelotOf(pitchClass: number, scale: Scale): string {
  const pc = ((pitchClass % 12) + 12) % 12
  const num = scale === 'major' ? MAJOR_NUM[pc] : MINOR_NUM[pc]
  return `${num}${scale === 'major' ? 'B' : 'A'}`
}

/** Build a normalised KeyEstimate from a tonic name + scale + confidence. */
export function makeKeyEstimate(tonic: string, scale: Scale, confidence: number): KeyEstimate {
  const pc = pitchClassOf(tonic) ?? 0
  return { tonic: NOTE_NAMES[pc], scale, camelot: camelotOf(pc, scale), confidence }
}

/** Rotate a 12-bin chroma vector by `semitones` (a +n pitch shift moves
 *  pitch-class i to i+n). Used when rendering a transformed snippet. */
export function rotateChroma(chroma: number[], semitones: number): number[] {
  const n = chroma.length
  if (n === 0) return chroma
  const shift = ((Math.round(semitones) % n) + n) % n
  const out = new Array<number>(n)
  for (let i = 0; i < n; i++) out[(i + shift) % n] = chroma[i]
  return out
}

/**
 * Transpose a key by `semitones` (used by the Phase 7 transform dial).
 * Pitch class shifts; scale is unchanged. On the Camelot wheel a +1 semitone
 * shift moves +7 mod 12 with the same letter (e.g. 8A +1 -> 3A).
 */
export function transposeKey(key: KeyEstimate, semitones: number): KeyEstimate {
  const base = pitchClassOf(key.tonic) ?? 0
  const pc = ((base + (semitones % 12)) % 12 + 12) % 12
  return {
    tonic: NOTE_NAMES[pc],
    scale: key.scale,
    camelot: camelotOf(pc, key.scale),
    confidence: key.confidence,
  }
}
