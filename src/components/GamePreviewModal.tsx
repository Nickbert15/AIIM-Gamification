'use client'

import { useState } from 'react'
import { Game, Question } from '@/types/game'
import ChatGamePlayer from './ChatGamePlayer'
import HallucinationSpotterPlayer from './HallucinationSpotterPlayer'

interface Props {
  game: Game | null
  onClose: () => void
}

export default function GamePreviewModal({ game, onClose }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  if (!game) return null

  if (game.game_json.format === 'chat_challenge') {
    return (
      <>
        <style>{`
          .gpm-overlay {
            position: fixed; inset: 0; background: rgba(0,0,0,0.8);
            backdrop-filter: blur(4px); display: flex;
            align-items: center; justify-content: center;
            z-index: 1000; padding: 16px;
          }
          .gpm-card {
            background: var(--bg-card); border: 1px solid var(--border);
            border-radius: var(--radius); width: 100%;
            max-height: 90vh; overflow-y: auto; display: flex; flex-direction: column;
          }
          .gpm-header {
            display: flex; align-items: flex-start; justify-content: space-between;
            gap: 16px; padding: 20px 24px 16px; border-bottom: 1px solid var(--border);
            position: sticky; top: 0; background: var(--bg-card); z-index: 1;
          }
          .gpm-title { font-size: 16px; font-weight: 700; color: var(--text); margin: 0; line-height: 1.4; }
          .gpm-subtitle { font-size: 12px; color: var(--text-muted); margin-top: 3px; }
          .gpm-close {
            background: none; border: 1px solid var(--border); border-radius: 6px;
            color: var(--text-muted); cursor: pointer; font-size: 18px; line-height: 1;
            padding: 4px 10px; flex-shrink: 0; font-family: inherit;
          }
          .gpm-close:hover { color: var(--text); border-color: var(--accent); }
        `}</style>
        <div className="gpm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
          <div className="gpm-card" style={{ maxWidth: 720 }}>
            <div className="gpm-header">
              <div>
                <h2 className="gpm-title">{game.title}</h2>
                <div className="gpm-subtitle">Prompt-Challenge · {game.difficulty}</div>
              </div>
              <button className="gpm-close" onClick={onClose}>×</button>
            </div>
            <ChatGamePlayer game={game} onComplete={(s) => console.log('preview score:', s)} />
          </div>
        </div>
      </>
    )
  }

  if (game.game_json.format === 'hallucination_spotter') {
    return (
      <>
        <style>{`
          .gpm-overlay {
            position: fixed; inset: 0; background: rgba(0,0,0,0.8);
            backdrop-filter: blur(4px); display: flex;
            align-items: center; justify-content: center;
            z-index: 1000; padding: 16px;
          }
          .gpm-card {
            background: var(--bg-card); border: 1px solid var(--border);
            border-radius: var(--radius); width: 100%;
            max-height: 90vh; overflow-y: auto; display: flex; flex-direction: column;
          }
          .gpm-header {
            display: flex; align-items: flex-start; justify-content: space-between;
            gap: 16px; padding: 20px 24px 16px; border-bottom: 1px solid var(--border);
            position: sticky; top: 0; background: var(--bg-card); z-index: 1;
          }
          .gpm-title { font-size: 16px; font-weight: 700; color: var(--text); margin: 0; line-height: 1.4; }
          .gpm-subtitle { font-size: 12px; color: var(--text-muted); margin-top: 3px; }
          .gpm-close {
            background: none; border: 1px solid var(--border); border-radius: 6px;
            color: var(--text-muted); cursor: pointer; font-size: 18px; line-height: 1;
            padding: 4px 10px; flex-shrink: 0; font-family: inherit;
          }
          .gpm-close:hover { color: var(--text); border-color: var(--accent); }
        `}</style>
        <div className="gpm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
          <div className="gpm-card" style={{ maxWidth: 640 }}>
            <div className="gpm-header">
              <div>
                <h2 className="gpm-title">{game.title}</h2>
                <div className="gpm-subtitle">Hallucination Spotter · {game.difficulty}</div>
              </div>
              <button className="gpm-close" onClick={onClose}>×</button>
            </div>
            <HallucinationSpotterPlayer game={game} onComplete={(s) => console.log('preview score:', s)} />
          </div>
        </div>
      </>
    )
  }

  const questions = (game.game_json.questions ?? []) as Question[]
  const total = questions.length
  const current: Question = questions[currentIndex]
  const answered = selectedAnswer !== null
  const isCorrect = selectedAnswer === current.correctAnswer

  function handleSelect(optionId: string) {
    if (answered) return
    setSelectedAnswer(optionId)
    if (optionId === current.correctAnswer) setScore(s => s + 1)
  }

  function handleNext() {
    if (currentIndex + 1 >= total) {
      setDone(true)
    } else {
      setCurrentIndex(i => i + 1)
      setSelectedAnswer(null)
    }
  }

  return (
    <>
      <style>{`
        .gpm-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }
        .gpm-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          width: 100%;
          max-width: 620px;
          max-height: 90vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .gpm-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 20px 24px 16px;
          border-bottom: 1px solid var(--border);
          position: sticky;
          top: 0;
          background: var(--bg-card);
          z-index: 1;
        }
        .gpm-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
          margin: 0;
          line-height: 1.4;
        }
        .gpm-subtitle {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 3px;
        }
        .gpm-close {
          background: none;
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
          padding: 4px 10px;
          flex-shrink: 0;
          font-family: inherit;
        }
        .gpm-close:hover { color: var(--text); border-color: var(--accent); }
        .gpm-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          flex: 1;
        }
        .gpm-progress {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          color: var(--text-muted);
        }
        .gpm-progress-bar {
          flex: 1;
          height: 4px;
          background: var(--border);
          border-radius: 9999px;
          overflow: hidden;
        }
        .gpm-progress-fill {
          height: 100%;
          background: var(--accent);
          border-radius: 9999px;
          transition: width 0.3s ease;
        }
        .gpm-question {
          font-size: 15px;
          font-weight: 600;
          color: var(--text);
          line-height: 1.5;
          margin: 0;
        }
        .gpm-options {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .gpm-option {
          display: block;
          width: 100%;
          text-align: left;
          padding: 12px 16px;
          border-radius: var(--radius);
          border: 1px solid var(--border);
          background: var(--bg);
          color: var(--text);
          cursor: pointer;
          font-size: 14px;
          font-family: inherit;
          transition: border-color 0.15s, background 0.15s;
        }
        .gpm-option:hover:not(:disabled) {
          border-color: var(--accent);
          background: rgba(14,165,233,0.06);
        }
        .gpm-option:disabled { cursor: default; }
        .gpm-option.opt-correct {
          border-color: var(--success);
          background: rgba(16,185,129,0.1);
          color: var(--success);
        }
        .gpm-option.opt-wrong {
          border-color: var(--danger);
          background: rgba(239,68,68,0.08);
          color: var(--danger);
        }
        .gpm-feedback {
          padding: 12px 16px;
          border-radius: var(--radius);
          font-size: 14px;
          line-height: 1.5;
        }
        .gpm-feedback.fb-correct {
          background: rgba(16,185,129,0.1);
          border: 1px solid rgba(16,185,129,0.3);
          color: var(--success);
        }
        .gpm-feedback.fb-wrong {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.25);
          color: var(--danger);
        }
        .gpm-next-row {
          display: flex;
          justify-content: flex-end;
        }
        .gpm-score {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 32px 0 16px;
          gap: 8px;
        }
        .gpm-score-number {
          font-size: 52px;
          font-weight: 800;
          color: var(--accent);
          line-height: 1;
        }
        .gpm-score-label {
          font-size: 15px;
          color: var(--text-muted);
        }
      `}</style>

      <div
        className="gpm-overlay"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="gpm-card">
          <div className="gpm-header">
            <div>
              <h2 className="gpm-title">{game.title}</h2>
              <div className="gpm-subtitle">
                {[game.format, game.difficulty, game.persona_key].filter(Boolean).join(' · ')}
              </div>
            </div>
            <button className="gpm-close" onClick={onClose}>×</button>
          </div>

          <div className="gpm-body">
            {done ? (
              <div className="gpm-score">
                <div className="gpm-score-number">{score}/{total}</div>
                <div className="gpm-score-label">Richtige Antworten</div>
                <div style={{ marginTop: 24 }}>
                  <button className="btn btn-primary" onClick={onClose}>Schließen</button>
                </div>
              </div>
            ) : (
              <>
                <div className="gpm-progress">
                  <span>Frage {currentIndex + 1} von {total}</span>
                  <div className="gpm-progress-bar">
                    <div
                      className="gpm-progress-fill"
                      style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
                    />
                  </div>
                </div>

                <p className="gpm-question">{current.question}</p>

                <div className="gpm-options">
                  {current.options.map(opt => {
                    let cls = 'gpm-option'
                    if (answered) {
                      if (opt.id === current.correctAnswer) cls += ' opt-correct'
                      else if (opt.id === selectedAnswer) cls += ' opt-wrong'
                    }
                    return (
                      <button
                        key={opt.id}
                        className={cls}
                        onClick={() => handleSelect(opt.id)}
                        disabled={answered}
                      >
                        <strong>{opt.id.toUpperCase()}.</strong> {opt.text}
                      </button>
                    )
                  })}
                </div>

                {answered && (
                  <>
                    <div className={`gpm-feedback ${isCorrect ? 'fb-correct' : 'fb-wrong'}`}>
                      {isCorrect ? '✓ Richtig! ' : '✗ Falsch. '}
                      {current.explanation}
                    </div>
                    <div className="gpm-next-row">
                      <button className="btn btn-primary" onClick={handleNext}>
                        {currentIndex + 1 >= total ? 'Ergebnis anzeigen' : 'Nächste Frage →'}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
