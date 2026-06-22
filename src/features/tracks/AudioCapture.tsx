import { useEffect, useRef, useState } from 'react'
import { useTracksStore } from './tracksStore'

const captureSupported = (): boolean =>
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices &&
  typeof navigator.mediaDevices.getDisplayMedia === 'function' &&
  typeof window.MediaRecorder === 'function' &&
  window.isSecureContext

/**
 * Capture tab/system audio via getDisplayMedia → MediaRecorder → ingest as a
 * Track. Risk-gated (R1): tab/system audio support varies by browser/OS, so
 * this fails gracefully and never blocks the file-upload path.
 */
export function AudioCapture() {
  const importCapture = useTracksStore((s) => s.importCapture)
  const [supported] = useState(captureSupported)
  const [capturing, setCapturing] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  useEffect(() => () => cleanupStream(), [])

  const stop = () => {
    recorderRef.current?.state !== 'inactive' && recorderRef.current?.stop()
    setCapturing(false)
  }

  const start = async () => {
    setError(undefined)
    try {
      // Chromium requires a video track to offer the "share audio" option.
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      streamRef.current = stream
      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length === 0) {
        cleanupStream()
        setError('No audio was shared — pick a tab/window and tick “Share tab audio”.')
        return
      }
      // We only want the audio; drop the video track.
      stream.getVideoTracks().forEach((t) => t.stop())
      // Stop if the user ends sharing from the browser UI.
      audioTracks[0].addEventListener('ended', stop)

      const audioStream = new MediaStream(audioTracks)
      const recorder = new MediaRecorder(audioStream)
      recorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        cleanupStream()
        if (blob.size > 0) await importCapture(blob)
      }
      recorder.start()
      setCapturing(true)
    } catch (e) {
      cleanupStream()
      setCapturing(false)
      // NotAllowedError = user cancelled the picker; treat as a no-op.
      if (e instanceof DOMException && e.name === 'NotAllowedError') return
      setError(e instanceof Error ? e.message : 'Capture failed')
    }
  }

  if (!supported) {
    return (
      <p data-testid="capture-unsupported" className="text-xs text-zinc-500">
        Tab/system audio capture needs a Chromium browser over HTTPS (or localhost). Open the
        app via the secure URL to enable it.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {!capturing ? (
        <button
          data-testid="capture-btn"
          onClick={() => void start()}
          className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800"
        >
          ● Capture tab / system audio
        </button>
      ) : (
        <button
          data-testid="capture-stop"
          onClick={stop}
          className="rounded-md bg-red-500 px-3 py-1.5 text-sm font-medium text-red-950 hover:bg-red-400"
        >
          ■ Stop capture
        </button>
      )}
      {capturing && (
        <span data-testid="capture-status" className="text-xs text-amber-300">
          Recording… stop to save as a track
        </span>
      )}
      {error && (
        <span data-testid="capture-error" className="text-xs text-red-400">
          {error}
        </span>
      )}
    </div>
  )
}
