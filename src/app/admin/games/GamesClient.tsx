'use client'

import { useState } from 'react'
import { Game } from '@/types/game'
import GamePreviewModal from '@/components/GamePreviewModal'
import GameReviewModal from '@/components/GameReviewModal'
import { Gamepad2, User, Star } from 'lucide-react'

interface Props {
  games: Game[]
}

type Filter = 'all' | 'draft' | 'approved' | 'rejected'

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  approved: 'Approved',
  rejected: 'Rejected',
}

function statusBadgeStyle(status: string): React.CSSProperties {
  switch (status) {
    case 'approved': return { background: 'var(--success-soft)', color: 'var(--success-ink)', border: 'none' }
    case 'rejected': return { background: 'var(--danger-soft)', color: 'var(--danger)', border: 'none' }
    default: return { background: 'var(--surface-sunken)', color: 'var(--text-dim)', border: 'none' }
  }
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'draft', label: 'Draft' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
]

export default function GamesClient({ games: initialGames }: Props) {
  const [games, setGames] = useState<Game[]>(initialGames)
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
          transition: border-color var(--duration) var(--ease), background-color var(--duration) var(--ease), color var(--duration) var(--ease);
          font-family: inherit;
        }
        .gp-filter-btn:hover { border-color: var(--accent); color: var(--text); }
        .gp-filter-btn.active { border-color: var(--accent); background: var(--accent-soft); color: var(--accent-ink); }
        .gp-filter-count {
          background: var(--surface-sunken);
          border-radius: var(--radius-pill);
          padding: 1px 7px;
          font-size: 11px;
          color: var(--text-muted);
        }
        .gp-filter-btn.active .gp-filter-count { color: var(--accent-ink); }
        .gp-grid { display: flex; flex-direction: column; gap: 12px; }
        .gp-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          box-shadow: var(--shadow-sm);
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: box-shadow var(--duration) var(--ease), border-color var(--duration) var(--ease);
        }
        .gp-card:hover { box-shadow: var(--shadow-md); border-color: var(--border-strong); }
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
          background: var(--surface-sunken);
          border: none;
          border-radius: var(--radius-sm);
          padding: 3px 8px;
          font-size: 12px;
          color: var(--text-dim);
        }
        .gp-tag-icon { display: inline-flex; align-items: center; gap: 4px; }
        .gp-tag-icon svg { color: var(--text-muted); }
        .gp-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 2px;
        }
        .gp-card-date { font-size: 12px; color: var(--text-muted); }
        .gp-actions { display: flex; gap: 8px; }
        .gp-layout {
          display: grid;
          grid-template-columns: 1.25fr 1fr;
          gap: 22px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .gp-layout { grid-template-columns: 1fr; }
        }
        .gp-htp-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
          padding: 32px 34px 34px;
          position: sticky;
          top: 84px;
        }
        @media (max-width: 900px) {
          .gp-htp-card { position: static; }
        }
        .gp-htp-icon {
          width: 56px;
          height: 56px;
          border-radius: var(--radius);
          background: var(--lh-yellow-soft);
          color: var(--lh-yellow-ink);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
        }
        .gp-htp-title {
          font-size: 22px;
          font-weight: 700;
          font-family: var(--font-head);
          color: var(--text);
          margin: 0 0 8px;
        }
        .gp-htp-intro {
          font-size: 14px;
          color: var(--text-dim);
          line-height: 1.6;
          margin: 0 0 20px;
        }
        .gp-htp-steps {
          display: flex;
          flex-direction: column;
          gap: 16px;
          list-style: none;
          margin: 0 0 24px;
          padding: 0;
        }
        .gp-htp-step {
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }
        .gp-htp-step-number {
          flex-shrink: 0;
          width: 28px;
          height: 28px;
          border-radius: var(--radius-pill);
          background: var(--accent);
          color: #fff;
          font-family: var(--font-head);
          font-weight: 700;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .gp-htp-step-title { font-size: 14px; font-weight: 600; color: var(--text); }
        .gp-htp-step-text { font-size: 13px; color: var(--text-dim); line-height: 1.5; margin-top: 2px; }
      `}</style>

      <div className="gp-layout">
        <div>
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
              <div className="empty-state-icon"><Gamepad2 size={26} strokeWidth={1.5} /></div>
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
                    {game.target_role && (
                      <span className="gp-tag gp-tag-icon">
                        <User size={12} strokeWidth={2} />
                        {game.target_role}
                      </span>
                    )}
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
        </div>

        <div className="gp-htp-card">
          <div className="gp-htp-icon"><Star size={26} strokeWidth={2} /></div>
          <h3 className="gp-htp-title">So funktionieren die Spiele</h3>
          <p className="gp-htp-intro">
            Keine KI-Erfahrung nötig. Es gibt keine Uhr, und ein falscher Klick ist Teil des Lernens.
          </p>
          <ol className="gp-htp-steps">
            <li className="gp-htp-step">
              <span className="gp-htp-step-number">1</span>
              <span>
                <div className="gp-htp-step-title">Situation lesen</div>
                <div className="gp-htp-step-text">Jedes Spiel startet mit einer kurzen Finance-Situation aus dem Arbeitsalltag.</div>
              </span>
            </li>
            <li className="gp-htp-step">
              <span className="gp-htp-step-number">2</span>
              <span>
                <div className="gp-htp-step-title">Aufgabe lösen</div>
                <div className="gp-htp-step-text">Prompt auswählen und Text prüfen, oder eigenen Prompt schreiben und Antworten sortieren.</div>
              </span>
            </li>
            <li className="gp-htp-step">
              <span className="gp-htp-step-number">3</span>
              <span>
                <div className="gp-htp-step-title">Erklärung erhalten</div>
                <div className="gp-htp-step-text">Jede Auswertung kommt mit einer Begründung in Alltagssprache.</div>
              </span>
            </li>
          </ol>
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={() => games[0] && setPreviewGame(games[0])}
          >
            Jetzt spielen
          </button>
        </div>
      </div>

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