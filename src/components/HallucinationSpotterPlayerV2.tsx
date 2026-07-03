'use client'

import { useState } from 'react'
import { Game, HallucinationPromptOption, HallucinationOutputVariant } from '@/types/game'
import LineMarker from './LineMarker'

interface Props {
  game: Game
  onComplete: (score: number) => void
}

type Step = 'choose' | 'marking' | 'revealed'

export default function HallucinationSpotterPlayerV2({ game, onComplete }: Props) {
  const promptOptions = (game.game_json.promptOptions ?? []) as HallucinationPromptOption[]
  const outputVariants = (game.game_json.outputVariants ?? []) as HallucinationOutputVariant[]

  const [step, setStep] = useState<Step>('choose')
  const [chosenId, setChosenId] = useState<number | null>(null)
  const [markedIds, setMarkedIds] = useState<Set<number>>(new Set())

  const chosen = promptOptions.find(p => p.id === chosenId) ?? null
  const variant = outputVariants.find(v => v.promptOptionId === chosenId) ?? null
  const lines = variant?.lines ?? []

  const promptBonus = chosen?.isRecommended ? 1 : 0
  const correctIds = new Set(lines.filter(l => l.isHallucination).map(l => l.id))
  const correctMarks = Array.from(markedIds).filter(id => correctIds.has(id)).length
  const incorrectMarks = Array.from(markedIds).filter(id => !correctIds.has(id)).length
  const markingScore = Math.max(0, correctMarks - incorrectMarks)
  const totalScore = promptBonus + markingScore
  const maxPoints = game.game_json.scoring?.maxPoints ?? 1 + correctIds.size

  function choosePrompt(id: number) {
    if (chosenId !== null) return
    setChosenId(id)
  }

  function toggleLine(id: number) {
    setMarkedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleReveal() {
    setStep('revealed')
    onComplete(totalScore)
  }

  if (!promptOptions.length) return null

  return (
    <>
      <style>{hsv2Styles}</style>
      <div className="hsv2-container">
        <div className="hsv2-steps">
          <span className={`hsv2-step-pill ${step === 'choose' ? 'active' : chosenId !== null ? 'done' : ''}`}>1. Prompt wählen</span>
          <span className="hsv2-step-arrow">→</span>
          <span className={`hsv2-step-pill ${step === 'marking' ? 'active' : step === 'revealed' ? 'done' : ''}`}>2. Halluzinationen markieren</span>
        </div>

        {step === 'choose' && (
          <>
            {game.game_json.contextIntro && <p className="hsv2-intro">{game.game_json.contextIntro}</p>}
            <p className="hsv2-instruction">
              Wähle den Prompt, mit dem du die zuverlässigste KI-Antwort erwarten würdest:
            </p>
            <div className="hsv2-prompt-list">
              {promptOptions.map(p => (
                <button
                  key={p.id}
                  className={`hsv2-prompt-card ${chosenId === p.id ? 'chosen' : ''} ${chosenId !== null && chosenId !== p.id ? 'dimmed' : ''}`}
                  onClick={() => choosePrompt(p.id)}
                  disabled={chosenId !== null}
                >
                  {p.text}
                </button>
              ))}
            </div>

            {chosen && (
              <>
                <div className={`hsv2-critique ${chosen.isRecommended ? 'fb-correct' : 'fb-wrong'}`}>
                  {chosen.isRecommended ? '✓ Guter Prompt! ' : '○ Geht auch, aber ausbaufähig. '}
                  {chosen.critique}
                </div>
                <div className="hsv2-next-row">
                  <button className="btn btn-primary" onClick={() => setStep('marking')}>
                    Weiter zur Antwort →
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {step === 'marking' && (
          <>
            <div className="hsv2-prompt-recap">Dein Prompt: „{chosen?.text}“</div>
            <p className="hsv2-instruction">
              Hier ist die KI-Antwort darauf. Klicke alle Zeilen an, die du für erfunden
              (Halluzination) hältst.
            </p>
            <LineMarker lines={lines} markedIds={markedIds} onToggle={toggleLine} />
            <div className="hsv2-next-row">
              <button className="btn btn-primary" onClick={handleReveal}>
                Auswertung anzeigen
              </button>
            </div>
          </>
        )}

        {step === 'revealed' && (
          <>
            <div className="hsv2-result-card">
              <div className="hsv2-score-number">
                {totalScore}
                <span style={{ fontSize: '0.45em', color: 'var(--text-muted)', fontWeight: 400 }}>
                  /{maxPoints}
                </span>
              </div>
              <div className="hsv2-score-label">Punkte erreicht</div>
            </div>

            <div className="hsv2-prompt-recap">Dein Prompt: „{chosen?.text}“</div>

            <p className="hsv2-instruction">Auswertung der markierten Zeilen:</p>
            <LineMarker lines={lines} markedIds={markedIds} onToggle={toggleLine} revealCorrect={correctIds} />

            <div className="hsv2-explanations">
              {lines.map((l, i) => (
                <div key={l.id} className="hsv2-explanation-item">
                  <strong>Zeile {i + 1}:</strong> {l.explanation}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}

const hsv2Styles = `
  .hsv2-container {
    padding: 20px 24px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .hsv2-steps {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
  }
  .hsv2-step-pill {
    padding: 5px 12px;
    border-radius: 9999px;
    border: 1px solid var(--border);
    color: var(--text-muted);
    font-weight: 600;
    transition: border-color 0.2s ease, color 0.2s ease, background-color 0.2s ease;
  }
  .hsv2-step-pill.active {
    border-color: var(--accent);
    color: var(--accent);
    background: rgba(14,165,233,0.08);
  }
  .hsv2-step-pill.done {
    border-color: var(--success);
    color: var(--success);
  }
  .hsv2-step-arrow { color: var(--border); }
  .hsv2-intro {
    background: rgba(14,165,233,0.05);
    border: 1px solid rgba(14,165,233,0.2);
    border-radius: var(--radius);
    padding: 14px 16px;
    font-size: 13px;
    color: var(--text-dim);
    line-height: 1.5;
    margin: 0;
  }
  .hsv2-instruction {
    font-size: 13px;
    color: var(--text-dim);
    margin: 0;
  }
  .hsv2-prompt-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .hsv2-prompt-card {
    text-align: left;
    padding: 14px 16px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    cursor: pointer;
    font-size: 14px;
    line-height: 1.5;
    font-family: inherit;
    transition: border-color 0.15s ease, background-color 0.15s ease, opacity 0.2s ease;
  }
  .hsv2-prompt-card:hover:not(:disabled) {
    border-color: var(--accent);
    background: rgba(14,165,233,0.06);
  }
  .hsv2-prompt-card.chosen {
    border-color: var(--accent);
    background: rgba(14,165,233,0.1);
  }
  .hsv2-prompt-card.dimmed {
    opacity: 0.4;
  }
  .hsv2-prompt-card:disabled { cursor: default; }
  .hsv2-critique {
    padding: 12px 16px;
    border-radius: var(--radius);
    font-size: 13px;
    line-height: 1.5;
  }
  .hsv2-critique.fb-correct {
    background: rgba(16,185,129,0.1);
    border: 1px solid rgba(16,185,129,0.3);
    color: var(--success);
  }
  .hsv2-critique.fb-wrong {
    background: rgba(245,158,11,0.08);
    border: 1px solid rgba(245,158,11,0.3);
    color: #f59e0b;
  }
  .hsv2-prompt-recap {
    font-size: 12px;
    color: var(--text-muted);
    font-style: italic;
    padding: 8px 0;
    border-bottom: 1px solid var(--border);
  }
  .hsv2-next-row { display: flex; justify-content: flex-end; }
  .hsv2-result-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 0 8px;
    gap: 4px;
  }
  .hsv2-score-number {
    font-size: 44px;
    font-weight: 800;
    color: var(--accent);
    line-height: 1;
  }
  .hsv2-score-label { font-size: 13px; color: var(--text-muted); }
  .hsv2-explanations {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 12px;
    color: var(--text-dim);
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 12px 14px;
  }
  .hsv2-explanation-item { line-height: 1.5; }
`
