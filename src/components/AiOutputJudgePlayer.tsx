'use client'

import { useState } from 'react'
import { Game, JudgeCase } from '@/types/game'

interface Props {
  game: Game
  onComplete: (score: number) => void
}

type Choice = 'A' | 'B'

export default function AiOutputJudgePlayer({ game, onComplete }: Props) {
  const cases = (game.game_json.cases ?? []) as JudgeCase[]
  const maxPoints = game.game_json.scoring?.maxPoints ?? cases.length

  const [currentIndex, setCurrentIndex] = useState(0)
  const [choice, setChoice] = useState<Choice | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  const current = cases[currentIndex]
  const total = cases.length
  const answered = choice !== null
  const isCorrect = choice === current?.betterResponse

  function handleChoice(c: Choice) {
    if (answered) return
    setChoice(c)
    if (c === current.betterResponse) setScore(s => s + 1)
  }

  function handleNext() {
    if (currentIndex + 1 >= total) {
      setDone(true)
      onComplete(score)
    } else {
      setCurrentIndex(i => i + 1)
      setChoice(null)
    }
  }

  if (done) {
    const pct = Math.round((score / maxPoints) * 100)
    return (
      <>
        <style>{aojStyles}</style>
        <div className="aoj-score-screen">
          <div className="aoj-score-number">
            {score}
            <span style={{ fontSize: '0.45em', color: 'var(--text-muted)', fontWeight: 400 }}>
              /{maxPoints}
            </span>
          </div>
          <div className="aoj-score-label">Richtig bewertete Antworten</div>
          <div className="aoj-score-pct">{pct}%</div>
          <div className="aoj-score-msg">
            {pct >= 80
              ? 'Ausgezeichnet! Du erkennst zuverlässig die stärkere KI-Antwort.'
              : pct >= 60
              ? 'Gut gemacht! Achte weiter genau auf die Bewertungskriterien.'
              : 'Weiter üben — KI-Outputs immer gegen konkrete Kriterien prüfen, nicht nur gegen den Bauch.'}
          </div>
        </div>
      </>
    )
  }

  if (!current) return null

  return (
    <>
      <style>{aojStyles}</style>
      <div className="aoj-container">
        {currentIndex === 0 && game.game_json.contextIntro && (
          <div className="aoj-intro">{game.game_json.contextIntro}</div>
        )}

        <div className="aoj-progress">
          <span>Fall {currentIndex + 1} von {total}</span>
          <div className="aoj-progress-bar">
            <div
              className="aoj-progress-fill"
              style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
            />
          </div>
          <span style={{ whiteSpace: 'nowrap' }}>{score} Pkt.</span>
        </div>

        <p className="aoj-prompt">{current.prompt}</p>

        {current.criteria?.length > 0 && (
          <div className="aoj-criteria">
            <span className="aoj-criteria-label">Bewertungskriterien</span>
            <ul>
              {current.criteria.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>
        )}

        <div className="aoj-response-row">
          <button
            className={`aoj-response ${answered && current.betterResponse === 'A' ? 'opt-correct' : ''} ${answered && choice === 'A' && !isCorrect ? 'opt-wrong' : ''}`}
            onClick={() => handleChoice('A')}
            disabled={answered}
          >
            <span className="aoj-response-label">Antwort A</span>
            <span className="aoj-response-text">{current.responseA}</span>
          </button>
          <button
            className={`aoj-response ${answered && current.betterResponse === 'B' ? 'opt-correct' : ''} ${answered && choice === 'B' && !isCorrect ? 'opt-wrong' : ''}`}
            onClick={() => handleChoice('B')}
            disabled={answered}
          >
            <span className="aoj-response-label">Antwort B</span>
            <span className="aoj-response-text">{current.responseB}</span>
          </button>
        </div>

        {answered && (
          <>
            <div className={`aoj-feedback ${isCorrect ? 'fb-correct' : 'fb-wrong'}`}>
              {isCorrect ? '✓ Richtig! ' : '✗ Nicht ganz. '}
              {current.explanation}
            </div>
            <div className="aoj-next-row">
              <button className="btn btn-primary" onClick={handleNext}>
                {currentIndex + 1 >= total ? 'Ergebnis anzeigen' : 'Nächster Fall →'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

const aojStyles = `
  .aoj-container {
    padding: 20px 24px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .aoj-intro {
    background: rgba(14,165,233,0.05);
    border: 1px solid rgba(14,165,233,0.2);
    border-radius: var(--radius);
    padding: 14px 16px;
    font-size: 13px;
    color: var(--text-dim);
    line-height: 1.5;
  }
  .aoj-progress {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: var(--text-muted);
  }
  .aoj-progress-bar {
    flex: 1;
    height: 4px;
    background: var(--border);
    border-radius: 9999px;
    overflow: hidden;
  }
  .aoj-progress-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 9999px;
    transition: width 0.3s ease;
  }
  .aoj-prompt {
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
  .aoj-criteria {
    font-size: 12px;
    color: var(--text-dim);
  }
  .aoj-criteria-label {
    display: block;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
    margin-bottom: 4px;
  }
  .aoj-criteria ul {
    margin: 0;
    padding-left: 18px;
    line-height: 1.6;
  }
  .aoj-response-row {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
  .aoj-response {
    flex: 1;
    min-width: 220px;
    text-align: left;
    padding: 14px 16px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    cursor: pointer;
    font-family: inherit;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: border-color 0.15s, background 0.15s;
  }
  .aoj-response:hover:not(:disabled) {
    border-color: var(--accent);
    background: rgba(14,165,233,0.06);
  }
  .aoj-response:disabled { cursor: default; }
  .aoj-response.opt-correct {
    border-color: var(--success);
    background: rgba(16,185,129,0.1);
  }
  .aoj-response.opt-wrong {
    border-color: var(--danger);
    background: rgba(239,68,68,0.08);
  }
  .aoj-response-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--accent);
  }
  .aoj-response-text {
    font-size: 13px;
    line-height: 1.5;
    color: var(--text);
  }
  .aoj-feedback {
    padding: 12px 16px;
    border-radius: var(--radius);
    font-size: 14px;
    line-height: 1.5;
  }
  .aoj-feedback.fb-correct {
    background: rgba(16,185,129,0.1);
    border: 1px solid rgba(16,185,129,0.3);
    color: var(--success);
  }
  .aoj-feedback.fb-wrong {
    background: rgba(239,68,68,0.08);
    border: 1px solid rgba(239,68,68,0.25);
    color: var(--danger);
  }
  .aoj-next-row { display: flex; justify-content: flex-end; }
  .aoj-score-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 36px 24px 32px;
    gap: 8px;
    text-align: center;
  }
  .aoj-score-number {
    font-size: 52px;
    font-weight: 800;
    color: var(--accent);
    line-height: 1;
  }
  .aoj-score-label { font-size: 14px; color: var(--text-muted); }
  .aoj-score-pct { font-size: 26px; font-weight: 700; color: var(--text); margin-top: 4px; }
  .aoj-score-msg {
    font-size: 14px;
    color: var(--text-dim);
    max-width: 380px;
    line-height: 1.5;
    margin-top: 8px;
  }
`
