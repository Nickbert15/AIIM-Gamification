import { redirect } from 'next/navigation'
import { getSessionPlayer } from '@/lib/auth'
import AdminNav from './AdminNav'

// Autorisierung passiert hier und nicht in der Middleware: is_admin kommt frisch
// aus der DB, damit ein entzogenes Recht sofort greift. Gilt für /admin und alle
// Unterseiten — auch beim direkten Aufruf der URL.
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
