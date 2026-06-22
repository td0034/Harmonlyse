import type Essentia from 'essentia.js/dist/essentia.js-core.es.js'

let enginePromise: Promise<Essentia> | null = null
let loaded = false

/** Whether the WASM engine has finished loading at least once. */
export function essentiaLoaded(): boolean {
  return loaded
}

/**
 * Lazily load Essentia.js (WASM) and instantiate the engine once.
 * The ~2.5 MB WASM build is code-split via dynamic import, so it's only
 * fetched on first analysis (R4). Subsequent calls reuse the instance.
 */
export function getEssentia(): Promise<Essentia> {
  if (!enginePromise) {
    enginePromise = (async () => {
      const [wasmMod, coreMod] = await Promise.all([
        import('essentia.js/dist/essentia-wasm.es.js'),
        import('essentia.js/dist/essentia.js-core.es.js'),
      ])
      const EssentiaClass = coreMod.default
      // The .es build embeds the binary and is ready synchronously, but tolerate
      // a factory form too.
      let wasm = wasmMod.EssentiaWASM as unknown
      if (typeof wasm === 'function') wasm = await (wasm as () => Promise<unknown>)()
      const essentia = new EssentiaClass(wasm)
      loaded = true
      return essentia
    })()
  }
  return enginePromise
}
