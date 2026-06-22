// Domain model for Harmolyse. See docs/harmolyse-build-spec.md.
// Persistence-only derived fields (e.g. emotion quadrant) live in src/storage/db.ts,
// not here — this file is the clean domain shape used by feature code.

export type TrackSource = 'upload' | 'capture'

export interface Track {
  id: string
  source: TrackSource
  name: string
  durationSec: number
  sampleRate: number
  audioBlobKey: string // IndexedDB key for the source audio
  createdAt: number
  // Track-level analysis, used as a reference for noisy short-section estimates:
  bpm?: number
  key?: KeyEstimate
}

/**
 * A contiguous region of a track, bounded by user-placed dividers.
 * Sections do NOT overlap — the sectioning UI manages them as a
 * partition of the timeline (add/drag/remove dividers).
 */
export interface Section {
  id: string
  trackId: string
  startSec: number
  endSec: number
  label?: string
}

export type Scale = 'major' | 'minor'

export interface KeyEstimate {
  tonic: string // 'C', 'F#', ...
  scale: Scale
  camelot: string // '8A', '5B', ...
  confidence: number // 0..1
}

/**
 * Emotion tag.
 * The (valence, arousal) point is ALWAYS user-placed; `names` are
 * independent labels and do NOT snap the point to a fixed coordinate.
 * This is deliberate: it lets the same name (e.g. "nostalgia") spread
 * across a region of the plane so we can later visualise its cloud.
 */
export interface EmotionTag {
  valence: number // -1..1 (unpleasant..pleasant)
  arousal: number // -1..1 (low..high energy)
  names: string[]
}

export interface Transform {
  speedRatio: number // 1 = unchanged
  pitchSemitones: number // integer semitone shift
  pitchCents: number // -100..100 fine adjustment (sub-semitone)
}

/**
 * A saved, analysed, tagged section — optionally transformed.
 * Audio is referenced by `startSec`/`endSec` offsets into the parent
 * track blob by default; `audioBlobKey` is only set when the snippet
 * has its own rendered audio (any transform, or an explicit "save whole
 * snippet" / export). A transformed snippet becomes a NEW snippet with
 * its already-transposed `key`, linked back via `derivedFromSnippetId`.
 */
export interface Snippet {
  id: string
  sectionId: string
  trackId: string
  startSec: number
  endSec: number
  bpm: number
  key: KeyEstimate
  chroma: number[] // length 12, normalised
  emotion: EmotionTag
  transform: Transform
  audioBlobKey?: string // present only for rendered/transformed audio
  derivedFromSnippetId?: string
  createdAt: number
}

// Emotion quadrants (used for fast filtering / indexing):
//   q1: +valence +arousal   q2: -valence +arousal
//   q3: -valence -arousal   q4: +valence -arousal
export type EmotionQuadrant = 'q1' | 'q2' | 'q3' | 'q4'
