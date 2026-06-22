/** Encode planar Float32 channels as a 16-bit PCM WAV Blob. */
export function encodeWavBlob(channels: Float32Array[], sampleRate: number): Blob {
  const numCh = Math.max(1, channels.length)
  const len = channels[0]?.length ?? 0
  const blockAlign = numCh * 2
  const dataLen = len * blockAlign
  const buffer = new ArrayBuffer(44 + dataLen)
  const view = new DataView(buffer)

  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i))
  }

  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + dataLen, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, numCh, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, dataLen, true)

  let off = 44
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < numCh; c++) {
      let s = channels[c][i] ?? 0
      s = Math.max(-1, Math.min(1, s))
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      off += 2
    }
  }
  return new Blob([buffer], { type: 'audio/wav' })
}
