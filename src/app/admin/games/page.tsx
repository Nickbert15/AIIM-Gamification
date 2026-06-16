import { Game } from '@/types/game'
import GamesClient from './GamesClient'

export const dynamic = 'force-dynamic'

export default async function GamesPage() {
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

  const games: Game[] = res.ok ? await res.json() : []

  return <GamesClient games={games} />
}
