import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Nav } from './components/Nav'
import { IngestView } from './routes/IngestView'
import { LibraryView } from './routes/LibraryView'
import { useAppStore } from './store/useAppStore'

export default function App() {
  const dbStatus = useAppStore((s) => s.dbStatus)
  const dbError = useAppStore((s) => s.dbError)
  const initDb = useAppStore((s) => s.initDb)

  useEffect(() => {
    void initDb()
  }, [initDb])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Nav dbStatus={dbStatus} dbError={dbError} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Routes>
          <Route path="/" element={<IngestView />} />
          <Route path="/library" element={<LibraryView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
