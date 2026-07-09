import PlayClient from './PlayClient'
import { ExcelTableState } from '@/types/game'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { gameId: string }
}

interface RawGame {
  id: string
  title: string
  difficulty: string | null
  format: string
  game_json: {
    task?: string
    initialData?: ExcelTableState
    maxAttempts?: number
  }
}

export default async function PlayGamePage({ params }: PageProps) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/games?id=eq.${params.gameId}&status=eq.approved&select=id,title,difficulty,format,game_json`,
    {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
      cache: 'no-store',
    }
  )

  const rows: RawGame[] = res.ok ? await res.json() : []
  const game = rows[0]

  if (!game) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🔍</div>
        <div className="empty-state-text">Spiel nicht gefunden oder noch nicht freigegeben.</div>
      </div>
    )
  }

  if (game.format !== 'excel_challenge' || !game.game_json.initialData) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🚧</div>
        <div className="empty-state-text">
          Spieltyp nicht verfügbar — /play unterstützt aktuell nur die Excel Challenge.
        </div>
      </div>
    )
  }

  return (
    <PlayClient
      gameId={game.id}
      title={game.title}
      difficulty={game.difficulty}
      task={game.game_json.task ?? ''}
      initialData={game.game_json.initialData}
      maxAttempts={game.game_json.maxAttempts ?? 3}
    />
  )
}
