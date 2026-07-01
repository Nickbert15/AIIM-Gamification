'use client'

import { useState } from 'react'
import { Game, HallucinationStatement } from '@/types/game'

interface Props {
  game: Game
  onComplete: (score: number) => void
}

type Verdict = 'fact' | 'hallucination'

export default function HallucinationSpotterPlayer({ game, onComplete }: Props) {
  const statements = (game.game_json.statements ?? []) as HallucinationStatement[]
  const maxPoints = game.game_json.scoring?.maxPoints ?? statements.length

  const [currentIndex, setCurrentIndex] = useState(0)
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  const current = statements[currentIndex]
  const total = statements.length
  const answered = verdict !== null
  const correctVerdict: Verdict = current?.isHallucination ? 'hallucination' : 'fact'
  const isCorrect = verdict === correctVerdict

  function handleVerdict(v: Verdict) {
    if (answered) return
    setVerdict(v)
    if (v === correctVerdict) setScore(s => s + 1)
  }

  function handleNext() {
    if (currentIndex + 1 >= total) {
      setDone(true)
      onComplete(score)
    } else {
      setCurrentIndex(i => i + 1)
      setVerdict(null)
    }
  }

  if (done) {
    const pct = Math.round((score / maxPoints) * 100)
    return (
      <>
        <style>{hspStyles}</style>
        <div className="hsp-score-screen">
          <div className="hsp-score-number">
            {score}
            <span style={{ fontSize: '0.45em', color: 'var(--text-muted)', fontWeight: 400 }}>
              /{maxPoints}
            </span>
          </div>
          <div className="hsp-score-label">Aussagen richtig erkannt</div>
          <div className="hsp-score-pct">{pct}%</div>
          <div className="hsp-score-msg">
            {pct >= 80
              ? 'Ausgezeichnet! Du erkennst KI-Halluzinationen zuverlässig.'
              : pct >= 60
              ? 'Gut gemacht! Ein geschulter Blick, aber noch Luft nach oben.'
              : 'Weiter üben — KI-generierte Inhalte immer gegen die Quelle prüfen.'}
          </div>
        </div>
      </>
    )
  }

  if (!current) return null

  return (
    <>
      <style>{hspStyles}</style>
      <div className="hsp-container">
        {currentIndex === 0 && game.game_json.contextIntro && (
          <div className="hsp-intro">{game.game_json.contextIntro}</div>
        )}

        <div className="hsp-progress">
          <span>Aussage {currentIndex + 1} von {total}</span>
          <div className="hsp-progress-bar">
            <div
              className="hsp-progress-fill"
              style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
            />
          </div>
          <span style={{ whiteSpace: 'nowrap' }}>{score} Pkt.</span>
        </div>

        <p className="hsp-statement">{current.text}</p>

        <div className="hsp-verdict-row">
          <button
            className={`hsp-verdict-btn ${answered && correctVerdict === 'fact' ? 'opt-correct' : ''} ${answered && verdict === 'fact' && !isCorrect ? 'opt-wrong' : ''}`}
            onClick={() => handleVerdict('fact')}
            disabled={answered}
          >
            ✓ Fakt
          </button>
          <button
            className={`hsp-verdict-btn ${answered && correctVerdict === 'hallucination' ? 'opt-correct' : ''} ${answered && verdict === 'hallucination' && !isCorrect ? 'opt-wrong' : ''}`}
            onClick={() => handleVerdict('hallucination')}
            disabled={answered}
          >
            ⚠ Halluzination
          </button>
        </div>

        {answered && (
          <>
            <div className={`hsp-feedback ${isCorrect ? 'fb-correct' : 'fb-wrong'}`}>
              {isCorrect ? '✓ Richtig! ' : '✗ Falsch. '}
              {current.explanation}
            </div>
            <div className="hsp-next-row">
              <button className="btn btn-primary" onClick={handleNext}>
                {currentIndex + 1 >= total ? 'Ergebnis anzeigen' : 'Nächste Aussage →'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

const hspStyles = `
  .hsp-container {
    padding: 20px 24px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .hsp-intro {
    background: rgba(14,165,233,0.05);
    border: 1px solid rgba(14,165,233,0.2);
    border-radius: var(--radius);
    padding: 14px 16px;
    font-size: 13px;
    color: var(--text-dim);
    line-height: 1.5;
  }
  .hsp-progress {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: var(--text-muted);
  }
  .hsp-progress-bar {
    flex: 1;
    height: 4px;
    background: var(--border);
    border-radius: 9999px;
    overflow: hidden;
  }
  .hsp-progress-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 9999px;
    transition: width 0.3s ease;
  }
  .hsp-statement {
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
    line-height: 1.5;
    margin: 0;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
  }
  .hsp-verdict-row {
    display: flex;
    gap: 10px;
  }
  .hsp-verdict-btn {
    flex: 1;
    padding: 14px 16px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    transition: border-color 0.15s, background 0.15s;
  }
  .hsp-verdict-btn:hover:not(:disabled) {
    border-color: var(--accent);
    background: rgba(14,165,233,0.06);
  }
  .hsp-verdict-btn:disabled { cursor: default; }
  .hsp-verdict-btn.opt-correct {
    border-color: var(--success);
    background: rgba(16,185,129,0.1);
    color: var(--success);
  }
  .hsp-verdict-btn.opt-wrong {
    border-color: var(--danger);
    background: rgba(239,68,68,0.08);
    color: var(--danger);
  }
  .hsp-feedback {
    padding: 12px 16px;
    border-radius: var(--radius);
    font-size: 14px;
    line-height: 1.5;
  }
  .hsp-feedback.fb-correct {
    background: rgba(16,185,129,0.1);
    border: 1px solid rgba(16,185,129,0.3);
    color: var(--success);
  }
  .hsp-feedback.fb-wrong {
    background: rgba(239,68,68,0.08);
    border: 1px solid rgba(239,68,68,0.25);
    color: var(--danger);
  }
  .hsp-next-row { display: flex; justify-content: flex-end; }
  .hsp-score-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 36px 24px 32px;
    gap: 8px;
    text-align: center;
  }
  .hsp-score-number {
    font-size: 52px;
    font-weight: 800;
    color: var(--accent);
    line-height: 1;
  }
  .hsp-score-label { font-size: 14px; color: var(--text-muted); }
  .hsp-score-pct { font-size: 26px; font-weight: 700; color: var(--text); margin-top: 4px; }
  .hsp-score-msg {
    font-size: 14px;
    color: var(--text-dim);
    max-width: 360px;
    line-height: 1.5;
    margin-top: 8px;
  }
`
