import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types matching your schema
export type Player = {
  id: string
  email: string
  display_name: string
  role: string
  is_admin: boolean
  created_at: string
}

export type Score = {
  id: string
  player_id: string
  game_id: string
  score: number
  completed_at: string
  players?: Player
}

export type LeaderboardEntry = {
  display_name: string
  role: string
  total_score: number
  rank: number
}
