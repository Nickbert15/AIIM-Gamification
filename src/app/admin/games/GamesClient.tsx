'use client'

import { useState } from 'react'
import { Game } from '@/types/game'
import GamePreviewModal from '@/components/GamePreviewModal'
import GameReviewModal from '@/components/GameReviewModal'

interface Props {
  games: Game[]
}

// Demo-Spiel, damit der neue Spieltyp getestet werden kann, solange die n8n-Pipeline
// noch keine echten ai_output_judge-Games generiert.
const DEMO_JUDGE_GAME: Game = {
  id: 'demo-ai-output-judge',
  title: '[Demo] Welche KI-Antwort ist besser?',
  format: 'ai_output_judge',
  library_type: null,
  target_role: 'Financial Analyst',
  difficulty: 'intermediate',
  language: 'de',
  topic: 'Variance-Analyse',
  persona_key: null,
  learning_objective: 'Der Lernende kann zwei KI-generierte Antworten auf dieselbe Finance-Frage anhand fachlicher Kriterien vergleichen und die stärkere Antwort begründet auswählen.',
  game_json: {
    format: 'ai_output_judge',
    contextIntro: 'Zwei KI-Assistenten haben dieselbe Frage zur Monatsauswertung beantwortet. Wähle die fachlich bessere Antwort.',
    cases: [
      {
        id: 1,
        prompt: 'Warum sind die Materialkosten im Juni um 8% gestiegen?',
        responseA: 'Die Materialkosten sind gestiegen, weil generell die Preise steigen und die Wirtschaft sich verändert.',
        responseB: 'Die Materialkosten sind um 8% gestiegen, primär durch den Rohstoffpreis-Anstieg bei Aluminium (+12% ggü. Vormonat) sowie einen einmaligen Sondereffekt aus der Neubewertung des Lagerbestands zum Quartalsende.',
        betterResponse: 'B',
        criteria: ['Konkrete, nachvollziehbare Ursachen statt Allgemeinplätze', 'Quantifizierung der Treiber', 'Unterscheidung zwischen strukturellem und einmaligem Effekt'],
        explanation: 'Antwort B benennt konkrete, prüfbare Treiber mit Zahlen. Antwort A ist inhaltsleer und für einen Finance-Report nicht verwertbar.',
      },
      {
        id: 2,
        prompt: 'Ist die Liquiditätsreserve aktuell ausreichend für das Q3-Ziel von 5 Mio. EUR?',
        responseA: 'Aktuell liegt die Liquiditätsreserve bei 5,8 Mio. EUR und damit über dem Q3-Ziel von 5 Mio. EUR. Zu beachten: die Jahresbonizahlung im Juli (ca. 1,2 Mio. EUR) ist in diesem Wert bereits berücksichtigt.',
        responseB: 'Ja, die Liquidität ist mehr als ausreichend und es gibt keinerlei Risiken für Q3.',
        betterResponse: 'A',
        criteria: ['Konkrete Zahlen statt pauschaler Aussagen', 'Nennung relevanter Risiken/Sondereffekte', 'Fachliche Zurückhaltung statt Übergeneralisierung'],
        explanation: 'Antwort A liefert die Zahl und einen wichtigen Kontextfaktor (Bonizahlung). Antwort B behauptet pauschal "keinerlei Risiken" — das ist in der Finanzplanung eine gefährliche Übertreibung.',
      },
      {
        id: 3,
        prompt: 'Fasse die Abweichung im Vertriebskosten-Budget für den Bereichsleiter in zwei Sätzen zusammen.',
        responseA: 'Die Vertriebskosten liegen 4% über Budget (+180 Tsd. EUR), hauptsächlich durch höhere Reisekosten im Rahmen der Kundenoffensive Q2. Ohne Gegenmaßnahmen ist bei gleichem Trend eine Jahresabweichung von ca. 700 Tsd. EUR zu erwarten.',
        responseB: 'Die Vertriebskosten sind etwas höher als geplant. Das könnte an verschiedenen Faktoren liegen, unter anderem an Reisekosten, aber genaueres lässt sich ohne weitere Daten nicht sagen.',
        betterResponse: 'A',
        criteria: ['Konkrete Zahlen für Entscheidungsträger', 'Hochrechnung/Ausblick statt nur Ist-Stand', 'Prägnanz (zwei Sätze wie gefordert)'],
        explanation: 'Antwort A liefert genau das, was ein Bereichsleiter braucht: Zahl, Ursache, Ausblick — in der geforderten Kürze. Antwort B ist vage und liefert keine Entscheidungsgrundlage.',
      },
    ],
    scoring: { maxPoints: 3, passingScore: 2 },
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
  const [games, setGames] = useState<Game[]>([...initialGames, DEMO_JUDGE_GAME])
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
