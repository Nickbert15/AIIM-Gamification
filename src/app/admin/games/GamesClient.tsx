'use client'

import { useState } from 'react'
import { Game } from '@/types/game'
import GamePreviewModal from '@/components/GamePreviewModal'
import GameReviewModal from '@/components/GameReviewModal'

interface Props {
  games: Game[]
}

// Demo-Spiel, damit der neue Spieltyp getestet werden kann, solange die n8n-Pipeline
// noch keine echten hallucination_spotter-Games generiert.
const DEMO_HALLUCINATION_GAME: Game = {
  id: 'demo-hallucination-spotter',
  title: '[Demo] Monatsabschluss-Kommentar prüfen',
  format: 'hallucination_spotter',
  library_type: null,
  target_role: 'Financial Analyst',
  difficulty: 'intermediate',
  language: 'de',
  topic: 'Monatsabschluss',
  persona_key: null,
  learning_objective: 'Der Lernende kann erkennen, welche KI-generierten Aussagen in einem Finance-Report sachlich falsch oder erfunden sind und einer menschlichen Prüfung bedürfen.',
  game_json: {
    format: 'hallucination_spotter',
    contextIntro: 'Ein KI-Assistent hat folgenden Kommentar zum Monatsabschluss Juni erstellt. Prüfe jede Aussage: Fakt oder Halluzination?',
    statements: [
      { id: 1, text: 'Die Personalkosten sind im Juni um 3,2% gegenüber dem Vormonat gestiegen, hauptsächlich durch die Tariferhöhung zum 1. Juni.', isHallucination: false, explanation: 'Korrekt – die Tariferhöhung ist im Buchungsjournal dokumentiert und deckt sich mit der Kostenstellenauswertung.' },
      { id: 2, text: 'Der Vorstand hat in der Sitzung vom 14. Juni beschlossen, das Budget für Q3 um 10% zu kürzen.', isHallucination: true, explanation: 'Halluzination – am 14. Juni fand keine Vorstandssitzung statt, ein solcher Budgetbeschluss ist in keinem Protokoll verzeichnet.' },
      { id: 3, text: 'Die Rückstellungen für Gewährleistungen liegen mit 1,4 Mio. EUR auf Vorjahresniveau.', isHallucination: false, explanation: 'Korrekt – der Wert stimmt mit der Rückstellungsübersicht aus SAP überein.' },
      { id: 4, text: 'Laut IFRS 16 müssen ab Juli alle Leasingverträge unter 12 Monaten Laufzeit erstmals bilanziert werden.', isHallucination: true, explanation: 'Halluzination – IFRS 16 sieht ein Wahlrecht zur Nichtbilanzierung für kurzfristige Leasingverhältnisse (<12 Monate) vor, hier wird das Gegenteil behauptet.' },
      { id: 5, text: 'Die liquiden Mittel sind zum Monatsende um 2,1 Mio. EUR gesunken, primär durch die Auszahlung der Jahresboni.', isHallucination: false, explanation: 'Korrekt – deckt sich mit dem Cashflow-Report und dem Auszahlungstermin der Boni am 25. Juni.' },
    ],
    scoring: { maxPoints: 5, passingScore: 4 },
  },
  status: 'draft',
  source_attribution: null,
  created_at: new Date().toISOString(),
}

type Filter = 'all' | 'draft' | 'approved' | 'rejected'

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  approved: 'Approved',
  rejected: 'Rejected',
}

function statusBadgeStyle(status: string): React.CSSProperties {
  switch (status) {
    case 'approved': return { background: 'rgba(16,185,129,0.15)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.3)' }
    case 'rejected': return { background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.25)' }
    default: return { background: 'rgba(100,116,139,0.12)', color: 'var(--text-dim)', border: '1px solid var(--border)' }
  }
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'draft', label: 'Draft' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
]

export default function GamesClient({ games: initialGames }: Props) {
  const [games, setGames] = useState<Game[]>([...initialGames, DEMO_HALLUCINATION_GAME])
  const [filter, setFilter] = useState<Filter>('all')
  const [previewGame, setPreviewGame] = useState<Game | null>(null)
  const [reviewGame, setReviewGame] = useState<Game | null>(null)

  const counts: Record<Filter, number> = {
    all: games.length,
    draft: games.filter(g => g.status === 'draft').length,
    approved: games.filter(g => g.status === 'approved').length,
    rejected: games.filter(g => g.status === 'rejected').length,
  }

  const filtered = filter === 'all' ? games : games.filter(g => g.status === filter)

  function handleStatusChange(id: string, status: string) {
    setGames(prev => prev.map(g => g.id === id ? { ...g, status: status as Game['status'] } : g))
    setReviewGame(null)
  }

  return (
    <>
      <style>{`
        .gp-filter-bar {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .gp-filter-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: var(--radius);
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: border-color 0.15s, background 0.15s, color 0.15s;
          font-family: inherit;
        }
        .gp-filter-btn:hover { border-color: var(--accent); color: var(--text); }
        .gp-filter-btn.active { border-color: var(--accent); background: rgba(14,165,233,0.08); color: var(--text); }
        .gp-filter-count {
          background: var(--bg);
          border-radius: 9999px;
          padding: 1px 7px;
          font-size: 11px;
          color: var(--text-muted);
        }
        .gp-filter-btn.active .gp-filter-count { color: var(--accent); }
        .gp-grid { display: flex; flex-direction: column; gap: 12px; }
        .gp-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: border-color 0.15s;
        }
        .gp-card:hover { border-color: rgba(14,165,233,0.3); }
        .gp-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .gp-card-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text);
          margin: 0;
          line-height: 1.4;
        }
        .gp-badge {
          display: inline-block;
          padding: 2px 10px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .gp-meta { display: flex; flex-wrap: wrap; gap: 6px; }
        .gp-tag {
          display: inline-block;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 3px 8px;
          font-size: 12px;
          color: var(--text-dim);
        }
        .gp-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 2px;
        }
        .gp-card-date { font-size: 12px; color: var(--text-muted); }
        .gp-actions { display: flex; gap: 8px; }
      `}</style>

      <div className="gp-filter-bar">
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`gp-filter-btn${filter === f.key ? ' active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            <span className="gp-filter-count">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎮</div>
          <div className="empty-state-text">
            {games.length === 0
              ? 'Noch keine Spiele generiert. Nutze den + Spiel generieren Button im Admin-Dashboard.'
              : `Keine Games mit Status „${STATUS_LABEL[filter]}".`}
          </div>
        </div>
      ) : (
        <div className="gp-grid">
          {filtered.map(game => (
            <div key={game.id} className="gp-card">
              <div className="gp-card-header">
                <h3 className="gp-card-title">{game.title}</h3>
                <span className="gp-badge" style={statusBadgeStyle(game.status)}>
                  {game.status}
                </span>
              </div>

              <div className="gp-meta">
                {game.format && <span className="gp-tag">{game.format}</span>}
                {game.difficulty && <span className="gp-tag">{game.difficulty}</span>}
                {game.topic && <span className="gp-tag">{game.topic}</span>}
                {game.target_role && <span className="gp-tag">👤 {game.target_role}</span>}
              </div>

              <div className="gp-card-footer">
                <span className="gp-card-date">
                  {new Date(game.created_at).toLocaleString('de-DE', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
                <div className="gp-actions">
                  <button className="btn btn-ghost" onClick={() => setPreviewGame(game)}>
                    Vorschau
                  </button>
                  <button className="btn btn-primary" onClick={() => setReviewGame(game)}>
                    Review
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <GamePreviewModal
        key={previewGame?.id ?? 'preview-none'}
        game={previewGame}
        onClose={() => setPreviewGame(null)}
      />
      <GameReviewModal
        key={reviewGame?.id ?? 'review-none'}
        game={reviewGame}
        onClose={() => setReviewGame(null)}
        onStatusChange={handleStatusChange}
      />
    </>
  )
}
