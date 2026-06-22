/**
 * In-place iterative radix-2 FFT, returning the magnitude spectrum.
 * `real.length` must be a power of two. Returns length n/2 magnitudes.
 * Used for the chroma + spectrum display (Essentia handles key/BPM).
 */
export function fftMagnitudes(real: Float32Array): Float32Array {
  const n = real.length
  const re = Float32Array.from(real)
  const im = new Float32Array(n)

  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      const tr = re[i]
      re[i] = re[j]
      re[j] = tr
      const ti = im[i]
      im[i] = im[j]
      im[j] = ti
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    const wr = Math.cos(ang)
    const wi = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let cr = 1
      let ci = 0
      const half = len >> 1
      for (let k = 0; k < half; k++) {
        const a = i + k
        const b = a + half
        const vr = re[b] * cr - im[b] * ci
        const vi = re[b] * ci + im[b] * cr
        re[b] = re[a] - vr
        im[b] = im[a] - vi
        re[a] += vr
        im[a] += vi
        const ncr = cr * wr - ci * wi
        ci = cr * wi + ci * wr
        cr = ncr
      }
    }
  }

  const half = n >> 1
  const mag = new Float32Array(half)
  for (let i = 0; i < half; i++) mag[i] = Math.hypot(re[i], im[i])
  return mag
}
