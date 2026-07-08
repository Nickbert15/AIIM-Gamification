'use client'

import { useState } from 'react'
import { Game } from '@/types/game'
import GamePreviewModal from '@/components/GamePreviewModal'
import GameReviewModal from '@/components/GameReviewModal'

interface Props {
  games: Game[]
}

// Demo-Spiele zum lokalen Testen ohne echte Supabase-Anbindung.
// Vor dem Merge nach main wieder entfernen.
const DEMO_HALLUCINATION_V2_GAME: Game = {
  id: 'demo-hallucination-spotter-v2',
  title: '[Demo] Hallucination Spotter v2 — Kostenabweichung',
  format: 'hallucination_spotter_v2',
  library_type: null,
  target_role: 'Financial Analyst',
  difficulty: 'intermediate',
  language: 'de',
  topic: 'Kostenabweichung',
  persona_key: null,
  learning_objective: 'Der Lernende kann einen guten Prompt von einem schwachen unterscheiden und erkennt, welche Teile einer KI-Antwort erfunden sind.',
  game_json: {
    format: 'hallucination_spotter_v2',
    contextIntro: 'Situation: Ein Kollege aus dem Controlling möchte für den Monatsbericht wissen, warum es bei den Vertriebskosten eine Abweichung zum Budget gibt — und schickt dafür einen Prompt an die KI.',
    promptOptions: [
      { id: 1, text: 'Erkläre die Kostenabweichung.', isRecommended: false, critique: 'Zu vage — keine Angabe, welche Kosten, welcher Zeitraum oder welches Detailniveau erwartet wird. Lädt die KI förmlich dazu ein, Lücken mit Vermutungen zu füllen.' },
      { id: 2, text: 'Warum liegen die Reisekosten der Vertriebsabteilung im Juni 12% über Budget? Nenne die drei wichtigsten Treiber mit Zahlen, basierend auf den bekannten Fakten — keine Spekulation.', isRecommended: true, critique: 'Konkret, zeitlich eingegrenzt, fordert Zahlen und schließt Spekulation explizit aus — reduziert das Risiko einer Halluzination deutlich.' },
      { id: 3, text: 'Schreib mir irgendwas zu Kostenabweichungen im Vertrieb, klingt professionell.', isRecommended: false, critique: 'Fordert explizit "irgendwas" statt Fakten — praktisch eine Einladung zur Halluzination, nur mit professionellem Anstrich.' },
    ],
    outputVariants: [
      {
        promptOptionId: 1,
        lines: [
          { id: 1, text: 'Die Kosten sind im Juni allgemein gestiegen, das liegt an der aktuellen Wirtschaftslage.', isHallucination: true, explanation: 'Halluzination — inhaltsleere Pauschalaussage ohne belegbare Grundlage, keine echte Erklärung.' },
          { id: 2, text: 'Genauere Details würden eine Analyse der Kostenstellen erfordern.', isHallucination: false, explanation: 'Korrekt — sachlich richtiger Hinweis, dass ohne mehr Kontext keine präzise Aussage möglich ist.' },
          { id: 3, text: 'Im Schnitt liegen Kostenabweichungen bei Konzernen dieser Größe bei etwa 15-20% pro Quartal.', isHallucination: true, explanation: 'Halluzination — frei erfundene Branchenkennzahl ohne Quelle, die wie ein Fakt klingt.' },
        ],
      },
      {
        promptOptionId: 2,
        lines: [
          { id: 1, text: 'Die Reisekosten der Vertriebsabteilung liegen im Juni bei 134 Tsd. EUR gegenüber einem Budget von 120 Tsd. EUR (+12%).', isHallucination: false, explanation: 'Korrekt — deckt sich mit der Kostenstellenauswertung.' },
          { id: 2, text: 'Haupttreiber: eine Kundenoffensive mit zusätzlichen Vor-Ort-Terminen in der DACH-Region (+9 Tsd. EUR).', isHallucination: false, explanation: 'Korrekt — dokumentiert im Reisekostenbericht Q2.' },
          { id: 3, text: 'Zusätzlich wurden im Juni pauschal 15% Preissteigerung bei allen Flugtickets durch eine neue EU-Kerosinsteuer verzeichnet.', isHallucination: true, explanation: 'Halluzination — es gibt keine solche EU-weite Kerosinsteuer-Regelung, die Zahl ist frei erfunden.' },
          { id: 4, text: 'Der Rest der Abweichung (ca. 5 Tsd. EUR) entfällt auf höhere Hotelpreise durch eine Messe in München im Juni.', isHallucination: false, explanation: 'Korrekt — die Messe ist im Reisekalender verzeichnet, Hotelpreise dort saisonal höher.' },
        ],
      },
      {
        promptOptionId: 3,
        lines: [
          { id: 1, text: 'Kostenabweichungen im Vertrieb sind ein spannendes Thema mit vielen Facetten.', isHallucination: true, explanation: 'Halluzination im weiteren Sinne — keine falsche Zahl, aber inhaltsleeres Füllmaterial, das keinerlei verwertbare Information liefert.' },
          { id: 2, text: 'Laut interner Analyse vom 3. Juni wurde beschlossen, das Reisebudget rückwirkend um 20% zu erhöhen.', isHallucination: true, explanation: 'Halluzination — es gibt kein Protokoll oder Beschluss zu diesem Datum, komplett erfunden.' },
          { id: 3, text: 'Eine detaillierte Aufschlüsselung würde zusätzliche Datenquellen erfordern.', isHallucination: false, explanation: 'Korrekt — nachvollziehbare, vorsichtige Aussage ohne Erfindung.' },
        ],
      },
    ],
    scoring: { maxPoints: 3, passingScore: 2 },
  },
  status: 'draft',
  source_attribution: null,
  created_at: '2026-07-01T12:00:00.000Z',
}

const DEMO_PROMPT_ARENA_GAME: Game = {
  id: 'demo-prompt-arena',
  title: '[Demo] Prompt Arena — Liquiditätsplanung',
  format: 'prompt_arena',
  library_type: null,
  target_role: 'Financial Analyst',
  difficulty: 'intermediate',
  language: 'de',
  topic: 'Liquiditätsplanung',
  persona_key: null,
  learning_objective: 'Der Lernende kann einen zielgerichteten Prompt für einen Finance-KI-Assistenten schreiben und die Qualität der Antwort im Vergleich zu Referenzantworten einschätzen.',
  game_json: {
    format: 'prompt_arena',
    arenaRounds: [
      {
        id: 1,
        taskDescription: 'Ein Kollege aus dem Treasury fragt dich: "Ist die Liquiditätsreserve aktuell ausreichend für unser Q3-Ziel von 5 Mio. EUR?"',
        systemContext: 'Du bist ein KI-Assistent für Finance & Controlling bei der Lufthansa Group. Du hast Zugriff auf folgende Fakten: Aktuelle Liquiditätsreserve 5,8 Mio. EUR. Im Juli steht eine Jahresbonizahlung von ca. 1,2 Mio. EUR an, die in der Reserve bereits berücksichtigt ist. Q3-Ziel: 5 Mio. EUR.',
        referenceOutputs: [
          {
            id: 1,
            text: 'Ja, mit 5,8 Mio. EUR liegt die Reserve über dem Q3-Ziel von 5 Mio. EUR. Zu beachten: Die Jahresbonizahlung im Juli (ca. 1,2 Mio. EUR) ist darin bereits eingerechnet — ohne Gegenmaßnahmen sinkt der Puffer über dem Ziel entsprechend.',
            qualityRank: 1,
            note: 'Nennt die konkrete Zahl, das Ziel UND den wichtigen Kontextfaktor (Bonizahlung), der die Reserve real schmälert — genau das, was für eine fundierte Einschätzung nötig ist.',
          },
          {
            id: 2,
            text: 'Ja, die Liquidität sieht insgesamt gut aus und es gibt aktuell keine Probleme in Sicht.',
            qualityRank: 2,
            note: 'Pauschale Aussage ohne Zahlen oder Kontext — für eine Finance-Entscheidung nicht verwertbar und potenziell irreführend ("keine Probleme" ignoriert die Bonizahlung).',
          },
        ],
      },
      {
        id: 2,
        taskDescription: 'Deine Abteilungsleiterin fragt dich: "Warum sind die Materialkosten im Juni um 8% gestiegen?"',
        systemContext: 'Du bist ein KI-Assistent für Finance & Controlling bei der Lufthansa Group. Fakten: Materialkosten Juni +8% ggü. Vormonat. Ursache 1: Rohstoffpreis Aluminium +12% ggü. Vormonat. Ursache 2: einmaliger Sondereffekt aus Neubewertung des Lagerbestands zum Quartalsende.',
        referenceOutputs: [
          {
            id: 1,
            text: 'Die Materialkosten sind um 8% gestiegen, primär durch den Rohstoffpreis-Anstieg bei Aluminium (+12% ggü. Vormonat) sowie einen einmaligen Sondereffekt aus der Neubewertung des Lagerbestands zum Quartalsende.',
            qualityRank: 1,
            note: 'Konkrete, prüfbare Treiber mit Zahlen, unterscheidet klar zwischen strukturellem und einmaligem Effekt.',
          },
          {
            id: 2,
            text: 'Die Materialkosten sind gestiegen, weil generell die Preise steigen und sich die Wirtschaft verändert.',
            qualityRank: 2,
            note: 'Inhaltsleerer Allgemeinplatz ohne konkrete, prüfbare Ursache — für einen Finance-Report unbrauchbar.',
          },
        ],
      },
    ],
    scoring: { maxPoints: 2, passingScore: 2 },
  },
  status: 'draft',
  source_attribution: null,
  created_at: '2026-07-01T12:00:00.000Z',
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
  const [games, setGames] = useState<Game[]>([...initialGames, DEMO_HALLUCINATION_V2_GAME, DEMO_PROMPT_ARENA_GAME])
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
