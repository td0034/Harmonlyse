import { useRef, useState } from 'react'
import { useTracksStore } from './tracksStore'

export function TrackImport() {
  const importFiles = useTracksStore((s) => s.importFiles)
  const importState = useTracksStore((s) => s.importState)
  const error = useTracksStore((s) => s.error)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const busy = importState === 'importing'

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (e.dataTransfer.files.length) void importFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragging
            ? 'border-emerald-400 bg-emerald-400/5'
            : 'border-zinc-700 hover:border-zinc-500'
        }`}
      >
        <p className="text-sm text-zinc-300">
          {busy ? 'Importing…' : 'Tap to choose audio — or drop a file'}
        </p>
        <p className="mt-1 text-xs text-zinc-500">wav · mp3 · flac · m4a</p>
        <input
          ref={inputRef}
          data-testid="file-input"
          type="file"
          accept="audio/*,.wav,.mp3,.flac,.m4a"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void importFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>
      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
