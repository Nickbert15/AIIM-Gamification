import { Game } from '@/types/game'
import GamesClient from './GamesClient'

export const dynamic = 'force-dynamic'

export default async function GamesPage() {
  let games: Game[] = []
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/games?select=*&order=created_at.desc`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        cache: 'no-store',
      }
    )
    if (res.ok) games = await res.json()
  } catch {
    games = []
  }

  return <GamesClient games={games} />
}
