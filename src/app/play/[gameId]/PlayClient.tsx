'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Player } from '@/lib/supabase'
import ExcelGamePlayer from '@/components/ExcelGamePlayer'
import { ExcelTableState } from '@/types/game'
import { useI18n } from '@/lib/i18n'

interface Props {
  gameId: string
  title: string
  difficulty: string | null
  task: string
  initialData: ExcelTableState
  maxAttempts: number
}

export default function PlayClient({ gameId, title, difficulty, task, initialData, maxAttempts }: Props) {
  const { t } = useI18n()
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [started, setStarted] = useState(false)
  const [completedMsg, setCompletedMsg] = useState('')

  useEffect(() => {
    supabase.from('players').select('*').order('display_name').then(({ data }) => setPlayers(data ?? []))
  }, [])

  if (!started) {
    return (
      <div className="card" style={{ maxWidth: 480, margin: '0 auto' }}>
        <div className="card-title">{title}</div>
        {difficulty && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>{difficulty}</p>
        )}
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label>{t('play.whoAreYou')}</label>
          <select value={selectedPlayerId} onChange={(e) => setSelectedPlayerId(e.target.value)}>
            <option value="">{t('play.selectPlayer')}</option>
            {players.map(p => (
              <option key={p.id} value={p.id}>{p.display_name} ({p.role})</option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" disabled={!selectedPlayerId} onClick={() => setStarted(true)}>
          {t('play.start')}
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <ExcelGamePlayer
          gameId={gameId}
          task={task}
          initialData={initialData}
          maxAttempts={maxAttempts}
          playerId={selectedPlayerId}
          onComplete={() => setCompletedMsg(t('play.scoreSaved'))}
          onClose={() => router.push('/')}
        />
      </div>
      {completedMsg && <div className="alert alert-success" style={{ marginTop: 16 }}>{completedMsg}</div>}
    </div>
  )
}
