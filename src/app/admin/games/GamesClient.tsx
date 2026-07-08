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
  title: '[Demo] Hallucination Spotter v2 — Abgeltungssteuer',
  format: 'hallucination_spotter_v2',
  library_type: null,
  target_role: 'Financial Analyst',
  difficulty: 'intermediate',
  language: 'de',
  topic: 'Abgeltungssteuer',
  persona_key: null,
  learning_objective: 'Der Lernende kann einen guten Prompt von einem schwachen unterscheiden und erkennt, welche Teile einer KI-Antwort erfunden sind.',
  game_json: {
    format: 'hallucination_spotter_v2',
    halluRound: {
      situation: 'Ein Kollege fragt dich: "Wie funktioniert die Abgeltungssteuer auf Kapitalerträge in Deutschland?"',
      promptOptions: [
        {
          id: 1,
          text: 'Schreib mir kurz und knackig alles Wichtige zur Abgeltungssteuer.',
          approach: 'vage',
          quality: 30,
          isRecommended: false,
          feedback: 'Sehr offen formuliert — die KI muss selbst entscheiden, was "wichtig" ist. Das erhöht das Risiko, dass sie Lücken mit erfundenen Details füllt, statt bei den gesicherten Fakten zu bleiben.',
        },
        {
          id: 2,
          text: 'Erkläre die Abgeltungssteuer auf Kapitalerträge in Deutschland: Steuersatz, wer sie zahlt und wie sie erhoben wird.',
          approach: 'kontext',
          quality: 65,
          isRecommended: false,
          feedback: 'Gibt einen klaren Rahmen vor (welche Aspekte gefragt sind). Das hilft der KI, präzise zu bleiben, statt frei abzuschweifen — aber es fehlt noch die Bitte, Unsicherheit zu kennzeichnen.',
        },
        {
          id: 3,
          text: 'Du bist Steuerberater. Erkläre einem Kollegen ohne Finance-Hintergrund die Abgeltungssteuer auf Kapitalerträge.',
          approach: 'rolle',
          quality: 55,
          isRecommended: false,
          feedback: 'Die Rollenvorgabe sorgt für einen passenden, verständlichen Ton. Das ersetzt aber keine Quellenangabe — die KI kann trotzdem Details erfinden, wenn sie sich bei etwas unsicher ist.',
        },
        {
          id: 4,
          text: 'Erkläre die Abgeltungssteuer und markiere jede Angabe, bei der du dir nicht zu 100% sicher bist, statt sie als Fakt darzustellen.',
          approach: 'quellen',
          quality: 90,
          isRecommended: true,
          feedback: 'Bittet die KI aktiv, Unsicherheit zu kennzeichnen, statt alles gleich selbstbewusst zu formulieren. Das ist der wirksamste Hebel gegen überzeugend klingende, aber erfundene Angaben.',
        },
        {
          id: 5,
          text: 'Die Abgeltungssteuer wurde doch letztes Jahr komplett abgeschafft, oder? Erklär mir kurz, was stattdessen gilt.',
          approach: 'suggestiv',
          quality: 15,
          isRecommended: false,
          feedback: 'Die falsche Prämisse in der Frage verleitet die KI dazu, "mitzuspielen" und Dinge zu bestätigen, die gar nicht stimmen — ein klassischer Auslöser für Halluzinationen.',
        },
      ],
      answer: {
        sentences: [
          { id: 1, text: 'Die Abgeltungssteuer ist eine Steuer auf Kapitalerträge wie Zinsen, Dividenden und Kursgewinne aus Wertpapieren.', isHallucination: false, explanation: 'Korrekt — das ist die grundlegende Definition der Abgeltungssteuer.' },
          { id: 2, text: 'Kapitalerträge in diesem Sinne sind zum Beispiel Zinsen auf Sparkonten, Dividenden aus Aktien sowie realisierte Kursgewinne beim Verkauf von Wertpapieren.', isHallucination: false, explanation: 'Korrekt — konkretisiert zutreffend, was als Kapitalertrag zählt.' },
          { id: 3, text: 'Die Abgeltungssteuer wurde in Deutschland zum 1. Januar 2009 eingeführt.', isHallucination: false, explanation: 'Korrekt — dieses Datum stimmt.' },
          { id: 4, text: 'Vor ihrer Einführung mussten Kapitalerträge mit dem individuellen, oft höheren persönlichen Einkommensteuersatz versteuert werden.', isHallucination: false, explanation: 'Korrekt — das war die Rechtslage vor 2009.' },
          { id: 5, text: 'Der Steuersatz beträgt pauschal 25 Prozent auf die Kapitalerträge, unabhängig vom persönlichen Einkommensteuersatz.', isHallucination: false, explanation: 'Korrekt — 25 % ist der gesetzliche Regelsatz.' },
          { id: 6, text: 'Zusätzlich fällt der Solidaritätszuschlag von 5,5 Prozent auf die Abgeltungssteuer selbst an, nicht auf den gesamten Kapitalertrag.', isHallucination: false, explanation: 'Korrekt — der Soli wird auf die Steuerschuld berechnet, nicht auf den Ertrag.' },
          { id: 7, text: 'Wer kirchensteuerpflichtig ist, zahlt außerdem Kirchensteuer, je nach Bundesland 8 oder 9 Prozent auf die Abgeltungssteuer.', isHallucination: false, explanation: 'Korrekt — die Kirchensteuersätze unterscheiden sich je nach Bundesland.' },
          { id: 8, text: 'Die depotführende Bank behält die Abgeltungssteuer in der Regel automatisch ein und führt sie direkt an das Finanzamt ab.', isHallucination: false, explanation: 'Korrekt — das ist der zentrale Mechanismus der Abgeltungssteuer.' },
          { id: 9, text: 'Deshalb muss ein großer Teil der Kapitalerträge gar nicht mehr gesondert in der Steuererklärung angegeben werden.', isHallucination: false, explanation: 'Korrekt — Folge des automatischen Steuerabzugs durch die Bank.' },
          { id: 10, text: 'Grundlage der Abgeltungssteuer ist das sogenannte Bundesfinanzgesetz von 2019, das die Besteuerung von Kapitalerträgen bundesweit neu geregelt hat.', isHallucination: true, explanation: 'Halluzination — ein "Bundesfinanzgesetz von 2019" existiert nicht. Die tatsächliche Rechtsgrundlage ist § 32d Einkommensteuergesetz, eingeführt durch die Unternehmensteuerreform 2008.' },
          { id: 11, text: 'Seit 2023 liegt der sogenannte Sparerpauschbetrag bei 1.000 Euro für Alleinstehende und 2.000 Euro für gemeinsam veranlagte Ehepaare.', isHallucination: false, explanation: 'Korrekt — diese Beträge gelten seit der Anhebung 2023.' },
          { id: 12, text: 'Bis zu dieser Höhe bleiben Kapitalerträge steuerfrei, wenn bei der Bank ein Freistellungsauftrag hinterlegt wurde.', isHallucination: false, explanation: 'Korrekt — der Freistellungsauftrag steuert genau das.' },
          { id: 13, text: 'Liegt der persönliche Einkommensteuersatz unter 25 Prozent, kann im Rahmen der sogenannten Günstigerprüfung eine niedrigere Besteuerung beantragt werden.', isHallucination: false, explanation: 'Korrekt — das ist ein bekanntes Wahlrecht in der Steuererklärung.' },
          { id: 14, text: 'Der Steuersatz wurde zum 1. Januar 2022 vorübergehend auf 28 Prozent angehoben, um Mehreinnahmen für den wirtschaftlichen Wiederaufbau nach der Pandemie zu erzielen, und später wieder auf 25 Prozent gesenkt.', isHallucination: true, explanation: 'Halluzination — es gab keine solche befristete Anhebung. Der Satz liegt seit Einführung 2009 unverändert bei 25 Prozent.' },
          { id: 15, text: 'Verluste aus Aktiengeschäften dürfen ausschließlich mit Gewinnen aus Aktiengeschäften verrechnet werden, nicht mit Zinserträgen oder anderen Kapitalerträgen.', isHallucination: false, explanation: 'Korrekt — diese Verrechnungsbeschränkung für Aktienverluste gilt tatsächlich.' },
          { id: 16, text: 'Wer im Jahr mehr Verluste als Gewinne hat, kann diese Verluste in das nächste Jahr vortragen, um sie später zu verrechnen.', isHallucination: false, explanation: 'Korrekt — der Verlustvortrag ist möglich.' },
          { id: 17, text: 'Für Erträge aus Kryptowährungen gilt seit 2021 automatisch derselbe Abgeltungssteuersatz von 25 Prozent, unabhängig von der Haltedauer.', isHallucination: true, explanation: 'Halluzination — Kryptowährungen fallen nicht automatisch unter die Abgeltungssteuer. Sie gelten meist als privates Veräußerungsgeschäft mit einjähriger Spekulationsfrist, nach der Gewinne sogar steuerfrei sein können.' },
          { id: 18, text: 'Auch thesaurierende, also nicht ausschüttende Investmentfonds unterliegen seit der Investmentsteuerreform 2018 einer jährlichen Vorabpauschale, die pauschal versteuert wird.', isHallucination: false, explanation: 'Korrekt — die Vorabpauschale wurde 2018 eingeführt.' },
          { id: 19, text: 'Das Bundesamt für Kapitalertragsaufsicht kontrolliert bundesweit, ob Banken die Abgeltungssteuer korrekt einbehalten und abführen.', isHallucination: true, explanation: 'Halluzination — eine Behörde mit diesem Namen gibt es nicht. Zuständig sind die Finanzämter; die Bankenaufsicht liegt bei der BaFin, aber nicht unter diesem erfundenen Namen.' },
          { id: 20, text: 'Wer keinen oder einen zu niedrigen Freistellungsauftrag erteilt hat, kann zu viel gezahlte Abgeltungssteuer über die Steuererklärung zurückerhalten.', isHallucination: false, explanation: 'Korrekt — über die Steuererklärung lässt sich das korrigieren.' },
          { id: 21, text: 'Bei Investmentfonds beträgt der sogenannte Teilfreistellungssatz einheitlich 45 Prozent, unabhängig davon, ob es sich um einen Aktien-, Misch- oder Immobilienfonds handelt.', isHallucination: true, explanation: 'Halluzination — der Teilfreistellungssatz ist nicht einheitlich: Er liegt zum Beispiel bei 30 % für Aktienfonds und 15 % für Mischfonds, bei Immobilienfonds deutlich höher.' },
          { id: 22, text: 'Für die tägliche Arbeit bedeutet das: Bei den meisten inländischen Depots ist der Steuerabzug bereits erledigt, bevor der Ertrag überhaupt auf dem Konto sichtbar wird.', isHallucination: false, explanation: 'Korrekt — praktische Konsequenz des automatischen Steuerabzugs.' },
          { id: 23, text: 'Insgesamt sorgt die Abgeltungssteuer für eine einheitliche und vergleichsweise einfache Besteuerung von Kapitalerträgen in Deutschland.', isHallucination: false, explanation: 'Korrekt — zusammenfassende, zutreffende Einordnung.' },
        ],
      },
    },
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
