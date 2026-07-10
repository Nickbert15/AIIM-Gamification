'use client'

import { useCallback, useState } from 'react'
import { Game, Question } from '@/types/game'
import ExcelGamePlayer from './ExcelGamePlayer'
import HallucinationSpotterPlayerV2 from './HallucinationSpotterPlayerV2'
import PromptArenaPlayer from './PromptArenaPlayer'

interface Props {
  game: Game
  /** Eingeloggter Spieler — der Excel-Player braucht ihn für seine eigenen API-Calls. */
  playerId: string
  onClose: () => void
  /** Called once a completed run has been persisted, so the dashboard can refresh. */
  onSaved: () => void
}

const QUIZ_POINTS_PER_CORRECT = 10

export default function GamePlayerModal({ game, playerId, onClose, onSaved }: Props) {
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const saveScore = useCallback(async (score: number) => {
    setSaveState('saving')
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: game.id, score }),
      })
      if (!res.ok) throw new Error()
      setSaveState('saved')
      onSaved()
    } catch {
      setSaveState('error')
    }
  }, [game.id, onSaved])

  // Format-Erkennung deckungsgleich mit GamePreviewModal, damit Admin-Vorschau und
  // Spieler-Ansicht nie auseinanderlaufen (dort spielbar => hier spielbar).
  const isExcel = game.format === 'excel_challenge' && Boolean(game.game_json?.task) && Boolean(game.game_json?.initialData)
  const isHallu = game.game_json?.format === 'hallucination_spotter_v2' && Boolean(game.game_json?.halluRound)
  const isArena = game.game_json?.format === 'prompt_arena' && (game.game_json?.arenaRounds?.length ?? 0) > 0
  const isQuiz = (game.game_json?.questions?.length ?? 0) > 0
  const mode: 'excel' | 'hallu' | 'arena' | 'quiz' | 'unsupported' =
    isExcel ? 'excel' : isHallu ? 'hallu' : isArena ? 'arena' : isQuiz ? 'quiz' : 'unsupported'

  const modeLabel =
    mode === 'excel' ? 'Excel Challenge'
    : mode === 'hallu' ? 'Hallucination Spotter'
    : mode === 'arena' ? 'Prompt Arena'
    : mode === 'quiz' ? 'Quiz'
    : game.format
  const cardWidth = mode === 'excel' ? '96vw' : mode === 'hallu' || mode === 'arena' ? 680 : 620

  return (
    <>
      <style>{gplStyles}</style>
      <div className="gpl-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <div className="gpl-card" style={{ maxWidth: cardWidth }}>
          <div className="gpl-header">
            <div>
              <h2 className="gpl-title">{game.title}</h2>
              <div className="gpl-subtitle">
                {[modeLabel, game.difficulty, game.topic].filter(Boolean).join(' · ')}
              </div>
            </div>
            <button className="gpl-close" onClick={onClose}>×</button>
          </div>

          {saveState !== 'idle' && (
            <div className={`gpl-savebar gpl-save-${saveState}`}>
              {saveState === 'saving' && 'Speichere dein Ergebnis…'}
              {saveState === 'saved' && '✓ Ergebnis gespeichert — es zählt jetzt fürs Leaderboard.'}
              {saveState === 'error' && '⚠ Ergebnis konnte nicht gespeichert werden.'}
            </div>
          )}

          {mode === 'excel' && (
            <ExcelGamePlayer
              gameId={game.id}
              task={game.game_json.task ?? ''}
              initialData={game.game_json.initialData!}
              maxAttempts={game.game_json.maxAttempts ?? 3}
              playerId={playerId}
              // /api/excel/finish hat das Ergebnis bereits persistiert (scores +
              // Gamification) — hier nur noch Status zeigen, kein zweiter Insert.
              onComplete={() => { setSaveState('saved'); onSaved() }}
              onClose={onClose}
            />
          )}
          {mode === 'hallu' && (
            <HallucinationSpotterPlayerV2 game={game} onComplete={(result) => saveScore(result.score)} />
          )}
          {mode === 'arena' && <PromptArenaPlayer game={game} onComplete={saveScore} />}
          {mode === 'quiz' && <QuizPlayer game={game} onComplete={saveScore} onClose={onClose} />}
          {mode === 'unsupported' && (
            <div className="gpl-body">
              <div className="empty-state" style={{ padding: '32px 20px' }}>
                <div className="empty-state-icon">🚧</div>
                <div className="empty-state-text">
                  Dieses Spielformat kann hier noch nicht gespielt werden.
                </div>
              </div>
              <div className="gpl-next-row">
                <button className="btn btn-primary" onClick={onClose}>Schließen</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function QuizPlayer({ game, onComplete, onClose }: { game: Game; onComplete: (score: number) => void; onClose: () => void }) {
  const questions = (game.game_json.questions ?? []) as Question[]
  const total = questions.length
  const maxPoints = questions.reduce((s, q) => s + (q.points ?? QUIZ_POINTS_PER_CORRECT), 0)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  if (total === 0) {
    return <div className="gpl-body"><div className="empty-state-text">Dieses Spiel enthält keine Fragen.</div></div>
  }

  const current = questions[currentIndex]
  const answered = selectedAnswer !== null
  const isCorrect = selectedAnswer === current.correctAnswer

  function handleSelect(optionId: string) {
    if (answered) return
    setSelectedAnswer(optionId)
    if (optionId === current.correctAnswer) setScore(s => s + (current.points ?? QUIZ_POINTS_PER_CORRECT))
  }

  function handleNext() {
    if (currentIndex + 1 >= total) {
      setDone(true)
      onComplete(score)
    } else {
      setCurrentIndex(i => i + 1)
      setSelectedAnswer(null)
    }
  }

  if (done) {
    const pct = maxPoints ? Math.round((score / maxPoints) * 100) : 0
    return (
      <div className="gpl-body">
        <div className="gpl-score">
          <div className="gpl-score-number">
            {score}
            <span style={{ fontSize: '0.45em', color: 'var(--text-muted)', fontWeight: 400 }}>/{maxPoints}</span>
          </div>
          <div className="gpl-score-label">Punkte erreicht · {pct}%</div>
          <div style={{ marginTop: 24 }}>
            <button className="btn btn-primary" onClick={onClose}>Fertig</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="gpl-body">
      <div className="gpl-progress">
        <span>Frage {currentIndex + 1} von {total}</span>
        <div className="gpl-progress-bar">
          <div className="gpl-progress-fill" style={{ width: `${((currentIndex + 1) / total) * 100}%` }} />
        </div>
        <span style={{ whiteSpace: 'nowrap' }}>{score} Pkt.</span>
      </div>

      <p className="gpl-question">{current.question}</p>

      <div className="gpl-options">
        {current.options.map(opt => {
          let cls = 'gpl-option'
          if (answered) {
            if (opt.id === current.correctAnswer) cls += ' opt-correct'
            else if (opt.id === selectedAnswer) cls += ' opt-wrong'
          }
          return (
            <button key={opt.id} className={cls} onClick={() => handleSelect(opt.id)} disabled={answered}>
              <strong>{opt.id.toUpperCase()}.</strong> {opt.text}
            </button>
          )
        })}
      </div>

      {answered && (
        <>
          <div className={`gpl-feedback ${isCorrect ? 'fb-correct' : 'fb-wrong'}`}>
            {isCorrect ? '✓ Richtig! ' : '✗ Falsch. '}
            {current.explanation}
          </div>
          <div className="gpl-next-row">
            <button className="btn btn-primary" onClick={handleNext}>
              {currentIndex + 1 >= total ? 'Ergebnis anzeigen' : 'Nächste Frage →'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

const gplStyles = `
  .gpl-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.8);
    backdrop-filter: blur(4px); display: flex;
    align-items: center; justify-content: center;
    z-index: 1000; padding: 16px;
  }
  .gpl-card {
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: var(--radius); width: 100%;
    max-height: 90vh; overflow-y: auto; display: flex; flex-direction: column;
  }
  .gpl-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 16px; padding: 20px 24px 16px; border-bottom: 1px solid var(--border);
    position: sticky; top: 0; background: var(--bg-card); z-index: 1;
  }
  .gpl-title { font-size: 16px; font-weight: 700; color: var(--text); margin: 0; line-height: 1.4; }
  .gpl-subtitle { font-size: 12px; color: var(--text-muted); margin-top: 3px; }
  .gpl-close {
    background: none; border: 1px solid var(--border); border-radius: 6px;
    color: var(--text-muted); cursor: pointer; font-size: 18px; line-height: 1;
    padding: 4px 10px; flex-shrink: 0; font-family: inherit;
  }
  .gpl-close:hover { color: var(--text); border-color: var(--accent); }
  .gpl-savebar { padding: 10px 24px; font-size: 13px; border-bottom: 1px solid var(--border); }
  .gpl-save-saving { color: var(--text-muted); }
  .gpl-save-saved { color: var(--success); background: rgba(16,185,129,0.08); }
  .gpl-save-error { color: var(--danger); background: rgba(239,68,68,0.08); }
  .gpl-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; flex: 1; }
  .gpl-progress { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--text-muted); }
  .gpl-progress-bar { flex: 1; height: 4px; background: var(--border); border-radius: 9999px; overflow: hidden; }
  .gpl-progress-fill { height: 100%; background: var(--accent); border-radius: 9999px; transition: width 0.3s ease; }
  .gpl-question { font-size: 15px; font-weight: 600; color: var(--text); line-height: 1.5; margin: 0; }
  .gpl-options { display: flex; flex-direction: column; gap: 8px; }
  .gpl-option {
    display: block; width: 100%; text-align: left; padding: 12px 16px;
    border-radius: var(--radius); border: 1px solid var(--border);
    background: var(--bg); color: var(--text); cursor: pointer;
    font-size: 14px; font-family: inherit; transition: border-color 0.15s, background 0.15s;
  }
  .gpl-option:hover:not(:disabled) { border-color: var(--accent); background: rgba(14,165,233,0.06); }
  .gpl-option:disabled { cursor: default; }
  .gpl-option.opt-correct { border-color: var(--success); background: rgba(16,185,129,0.1); color: var(--success); }
  .gpl-option.opt-wrong { border-color: var(--danger); background: rgba(239,68,68,0.08); color: var(--danger); }
  .gpl-feedback { padding: 12px 16px; border-radius: var(--radius); font-size: 14px; line-height: 1.5; }
  .gpl-feedback.fb-correct { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); color: var(--success); }
  .gpl-feedback.fb-wrong { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25); color: var(--danger); }
  .gpl-next-row { display: flex; justify-content: flex-end; }
  .gpl-score { display: flex; flex-direction: column; align-items: center; padding: 32px 0 16px; gap: 8px; }
  .gpl-score-number { font-size: 52px; font-weight: 800; color: var(--accent); line-height: 1; }
  .gpl-score-label { font-size: 15px; color: var(--text-muted); }
`
