import { redirect } from 'next/navigation'
import { getSessionPlayer } from '@/lib/auth'
import AdminNav from './AdminNav'

// Authorization happens here rather than in the middleware: is_admin is fetched
// fresh from the DB so a revoked privilege takes effect immediately. This applies
// to /admin and all sub-pages — including direct URL access.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const player = await getSessionPlayer()
  if (!player) redirect('/login?next=/admin')
  if (!player.is_admin) redirect('/')

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Admin</h1>
        <p className="page-subtitle">Plattform-Verwaltung — PoC Dashboard</p>
      </div>

      <AdminNav />

      {children}
    </>
  )
}
