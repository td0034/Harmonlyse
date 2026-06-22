# Harmolyse — Build Spec (Claude Code handoff)

*Implementation-ready spec for an agentic build. Decisions are made on purpose — where a choice is genuinely uncertain it's flagged as a **risk** with a fallback, not left open. Build phase by phase; each phase should run and be committed before starting the next.*

---

## 0. What we're building

A web app for capturing, analysing, emotionally tagging, and retrieving musical **snippets** (short sections cut from longer tracks) for harmonic mixing and composition.

Core loop: **ingest a track → mark sections → analyse each section (BPM, key, spectrum, chroma) → tag with emotion → optionally repitch/retime → save → filter & retrieve.**

The differentiator is the **emotion layer over section-level harmonic data** — being able to query "snippets in 8A that feel like dread." Analysis is solved by libraries; the value is the tagging + retrieval workflow.

**Current state:** a prototype exists that analyses a *whole* track. This spec assumes a clean web build; if reusing the prototype, adapt Phase 0 to its stack and keep the rest.

---

## 1. Stack (concrete)

| Concern | Choice | Why |
|---|---|---|
| Framework | **React + TypeScript + Vite** | Fast, standard, good audio-lib ecosystem |
| Styling | Tailwind | Quick, consistent |
| Audio engine | **Web Audio API** | Playback, routing, spectrum via `AnalyserNode` |
| Analysis (key/BPM/chroma) | **Essentia.js** (WASM) | Best-in-class MIR, runs client-side — no server needed |
| Waveform UI | **wavesurfer.js** (v7) | Waveform + draggable region markers out of the box |
| Pitch/time shift | **Rubber Band WASM** (`rubberband-wasm`) | Quality independent stretch + shift. *Fallback:* SoundTouch.js (lighter, lower quality) |
| Storage | **IndexedDB** via `idb` | Local-first, offline, no backend for MVP. Audio blobs + metadata |
| State | Zustand | Light, fits this app |

**Architecture:** entirely client-side for MVP. No backend. Analysis in WASM, snippets in IndexedDB. Keep a thin storage abstraction (`StorageProvider` interface) so a sync backend can be added later without touching feature code.

---

## 2. Data model

```ts
interface Track {
  id: string;
  source: 'upload' | 'capture';
  name: string;
  durationSec: number;
  sampleRate: number;
  audioBlobKey: string;      // IndexedDB key for the source audio
  createdAt: number;
  // track-level analysis used as a reference for sections:
  bpm?: number;
  key?: KeyEstimate;
}

interface Section {
  id: string;
  trackId: string;
  startSec: number;
  endSec: number;
  label?: string;
}

interface KeyEstimate {
  tonic: string;             // 'C', 'F#', ...
  scale: 'major' | 'minor';
  camelot: string;           // '8A', '5B', ...
  confidence: number;        // 0..1
}

interface EmotionTag {
  valence: number;           // -1..1  (unpleasant..pleasant)
  arousal: number;           // -1..1  (low..high energy)
  names: string[];           // optional named emotions
}

interface Snippet {
  id: string;
  sectionId: string;
  trackId: string;
  bpm: number;
  key: KeyEstimate;
  chroma: number[];          // length 12, normalised
  emotion: EmotionTag;
  transform: { speedRatio: number; pitchSemitones: number };
  audioBlobKey: string;      // IndexedDB key for the rendered (transformed) audio
  createdAt: number;
}
```

IndexedDB stores: `tracks`, `sections`, `snippets`, `audioBlobs` (key → Blob). Indexes on `snippets`: by `key.camelot`, by `bpm`, and a derived emotion-quadrant field for fast filtering.

---

## 3. Feature modules

**Ingest** — file upload (wav/mp3/flac/m4a) decoded via `AudioContext.decodeAudioData`. Capture-from-web via `getDisplayMedia({ audio: true })` recording to a Blob. *(See risk R1.)*

**Sectioning** — wavesurfer waveform; user adds/drags/resizes regions; each region → a `Section`. Sections may overlap.

**Analysis** — per section, slice the decoded buffer and run Essentia.js for BPM, key (→ Camelot), and chroma (HPCP). Spectrum for display from `AnalyserNode` (FFT) or a static FFT of the slice. **Analyse sections against the parent track's key/grid where possible**, and always let the user confirm/override — short-snippet estimates are noisy.

**Emotion tagging** — interactive valence/arousal plane: click or drag a point to set `(valence, arousal)`; optional multi-select of named emotions that snap to coordinates. Show the live quadrant label.

**Transform dial** — two controls (speed, pitch in semitones), decoupled, via Rubber Band. **Show the resulting key live** as pitch shifts (a +n semitone shift transposes the detected key). On save, render the transformed audio to a Blob.

**Storage & retrieval** — save Snippet + analysis + tag + transform + audio. Library view with filters: emotion (point + radius on the plane, or named, or quadrant), key/Camelot, BPM range, chroma similarity. In-browser playback of any snippet.

---

## 4. Build phases

Each phase is a working, committable increment. Don't start the next until the current one runs.

**Phase 0 — Scaffold**
Vite + React + TS + Tailwind + Zustand. App shell, routing (Ingest / Library), IndexedDB set up via `idb` with the stores above behind a `StorageProvider` interface.
*Done when:* app boots, an empty DB initialises, you can navigate between two stub views.

**Phase 1 — Ingest + playback**
Upload an audio file, decode it, persist the Blob + a `Track` record, play it back with transport controls.
*Done when:* a file round-trips through IndexedDB and plays after reload.

**Phase 2 — Waveform + sectioning**
wavesurfer waveform; add/drag/resize regions; persist `Section` records; play a single section in isolation.
*Done when:* sections survive reload and play back correctly.

**Phase 3 — Analysis**
Integrate Essentia.js (WASM). Per section: BPM, key→Camelot, chroma (12-bin), spectrum display. Show results in the UI with manual confirm/override.
*Done when:* a known reference track returns plausible BPM/key, and chroma renders.

**Phase 4 — Emotion tagging**
Valence/arousal plane component (click/drag point + named-emotion picker), live quadrant label, stored on the snippet draft.
*Done when:* a tag is set, persisted, and re-loads on the snippet.

**Phase 5 — Save snippets + library**
Commit a section + analysis + emotion + (untransformed) audio as a `Snippet`. Library view listing snippets with playback.
*Done when:* snippets persist and play from the library after reload.

**Phase 6 — Retrieval / filtering**
Filters over the library: emotion (region/quadrant/named), Camelot key, BPM range. Optional: chroma-similarity sort.
*Done when:* "find me 8A snippets in the unpleasant/low quadrant" returns the right set.

**Phase 7 — Transform dial**
Rubber Band WASM. Speed + pitch dials, decoupled, with live resulting-key readout. Render transformed audio on save; store original + transform params non-destructively.
*Done when:* a snippet shifted +2 semitones plays cleanly, shows the new key, and persists the transform.

**Phase 8 — Web capture (risk-gated, last)**
`getDisplayMedia` system/tab audio → record to Blob → into the ingest pipeline.
*Done when:* a captured clip lands as a Track. If capture proves unreliable, ship without it (see R1).

---

## 5. Risks & mitigations

- **R1 — Web audio capture is patchy.** `getDisplayMedia` audio support varies by browser/OS; tab/system audio isn't guaranteed. *Mitigation:* it's Phase 8 (last) and non-blocking. File upload is the reliable primary path. Don't let capture gate the rest. Consider a Tauri wrapper later if system audio becomes essential.
- **R2 — Short-snippet BPM/key is noisy.** *Mitigation:* analyse against parent-track context; always allow manual override; surface confidence.
- **R3 — Rubber Band WASM integration friction.** *Mitigation:* SoundTouch.js fallback for the dial; quality is lower but unblocks the feature.
- **R4 — Essentia.js bundle size / load time.** *Mitigation:* lazy-load the WASM module on first analysis; show a one-time load state.
- **R5 — IndexedDB audio-blob size.** Many snippets = lots of storage. *Mitigation:* store snippet audio, not whole-track copies, where possible; surface usage; allow delete.

---

## 6. Non-goals (MVP)

- No multi-device sync / cloud backend (storage abstraction leaves the door open).
- No downloading from streaming URLs (ToS/legal; out of scope).
- No collaborative/multi-user features.
- No mobile-native app (responsive web is enough for now).

---

## 7. How to drive this with Claude Code

Work one phase at a time. For each: implement, run it, verify against the phase's *Done when*, commit, then move on. Keep the `StorageProvider` and analysis behind interfaces so later phases (and a future backend) don't require rewrites. If the existing prototype is in a different stack, adapt Phase 0 and Phase 1 to it and keep Phases 2–8 as written.
