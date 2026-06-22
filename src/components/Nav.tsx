import { NavLink } from 'react-router-dom'
import type { DbStatus } from '../store/useAppStore'

interface NavProps {
  dbStatus: DbStatus
  dbError?: string
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
    isActive ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-300 hover:bg-zinc-800'
  }`

export function Nav({ dbStatus, dbError }: NavProps) {
  return (
    <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <span className="text-lg font-semibold tracking-tight">Harmolyse</span>
          <nav className="flex items-center gap-1">
            <NavLink to="/" className={linkClass} end>
              Ingest
            </NavLink>
            <NavLink to="/library" className={linkClass}>
              Library
            </NavLink>
          </nav>
        </div>
        <DbBadge status={dbStatus} error={dbError} />
      </div>
    </header>
  )
}

function DbBadge({ status, error }: { status: DbStatus; error?: string }) {
  const styles: Record<DbStatus, string> = {
    idle: 'bg-zinc-700 text-zinc-200',
    initialising: 'bg-amber-500/20 text-amber-300',
    ready: 'bg-emerald-500/20 text-emerald-300',
    error: 'bg-red-500/20 text-red-300',
  }
  const labels: Record<DbStatus, string> = {
    idle: 'DB idle',
    initialising: 'DB…',
    ready: 'DB ready',
    error: 'DB error',
  }
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}
      title={error}
    >
      {labels[status]}
    </span>
  )
}
