import { create } from 'zustand'
import { storage } from '../storage'

export type DbStatus = 'idle' | 'initialising' | 'ready' | 'error'

interface AppState {
  dbStatus: DbStatus
  dbError?: string
  initDb: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  dbStatus: 'idle',
  initDb: async () => {
    const status = get().dbStatus
    if (status === 'initialising' || status === 'ready') return
    set({ dbStatus: 'initialising', dbError: undefined })
    try {
      await storage.init()
      set({ dbStatus: 'ready' })
    } catch (e) {
      set({ dbStatus: 'error', dbError: e instanceof Error ? e.message : String(e) })
    }
  },
}))
