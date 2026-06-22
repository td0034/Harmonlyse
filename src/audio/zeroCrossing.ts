/**
 * Snap a time (seconds) to the nearest zero-crossing of channel 0 within
 * `windowSec`. Used so divider boundaries fall on clean sample crossings,
 * avoiding clicks/pops when a section is auditioned or rendered.
 *
 * Returns the original time if no decoded data or no crossing is found.
 */
export function snapToZeroCrossing(
  buffer: AudioBuffer,
  timeSec: number,
  windowSec = 0.01,
): number {
  const sr = buffer.sampleRate
  const data = buffer.getChannelData(0)
  const center = Math.round(timeSec * sr)
  const win = Math.max(1, Math.round(windowSec * sr))
  const lo = Math.max(1, center - win)
  const hi = Math.min(data.length - 1, center + win)

  let best = -1
  let bestDist = Infinity
  for (let i = lo; i <= hi; i++) {
    const crossed =
      (data[i - 1] <= 0 && data[i] > 0) || (data[i - 1] >= 0 && data[i] < 0)
    if (crossed) {
      const dist = Math.abs(i - center)
      if (dist < bestDist) {
        bestDist = dist
        best = i
      }
    }
  }
  return best === -1 ? timeSec : best / sr
}
