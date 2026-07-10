'use client'

import { useCallback, useState } from 'react'
import { Game, Question } from '@/types/game'
import ExcelGamePlayer from './ExcelGamePlayer'
import HallucinationSpotterPlayerV2 from './HallucinationSpotterPlayerV2'
import PromptArenaPlayer from './PromptArenaPlayer'
import BranchingGamePlayer from './BranchingGamePlayer'
import { X, CheckCircle2, XCircle, AlertTriangle, Construction } from 'lucide-react'

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
  const isBranching = game.game_json?.format === 'prompt_branching' && Boolean(game.game_json?.branching)
  const isQuiz = (game.game_json?.questions?.length ?? 0) > 0
  const mode: 'excel' | 'hallu' | 'arena' | 'branching' | 'quiz' | 'unsupported' =
    isExcel ? 'excel' : isHallu ? 'hallu' : isArena ? 'arena' : isBranching ? 'branching' : isQuiz ? 'quiz' : 'unsupported'

  const modeLabel =
    mode === 'excel' ? 'Excel Challenge'
    : mode === 'hallu' ? 'Hallucination Spotter'
    : mode === 'arena' ? 'Prompt Arena'
    : mode === 'branching' ? 'Prompt-Navigator'
    : mode === 'quiz' ? 'Quiz'
    : game.format
  const cardWidth = mode === 'excel' ? '96vw' : mode === 'hallu' || mode === 'arena' || mode === 'branching' ? 680 : 620

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
            <button className="gpl-close" onClick={onClose} aria-label="Schließen">
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {saveState !== 'idle' && (
            <div className={`gpl-savebar gpl-save-${saveState}`}>
              {saveState === 'saving' && 'Speichere dein Ergebnis…'}
              {saveState === 'saved' && (
                <><CheckCircle2 size={14} strokeWidth={2.25} className="gpl-savebar-icon" /> Ergebnis gespeichert — es zählt jetzt fürs Leaderboard.</>
              )}
              {saveState === 'error' && (
                <><AlertTriangle size={14} strokeWidth={2.25} className="gpl-savebar-icon" /> Ergebnis konnte nicht gespeichert werden.</>
              )}
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
          {mode === 'branching' && <BranchingGamePlayer game={game} onComplete={saveScore} />}
          {mode === 'quiz' && <QuizPlayer game={game} onComplete={saveScore} onClose={onClose} />}
          {mode === 'unsupported' && (
            <div className="gpl-body">
              <div className="empty-state" style={{ padding: '32px 20px' }}>
                <div className="empty-state-icon"><Construction size={26} strokeWidth={1.5} /></div>
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
            {isCorrect
              ? <CheckCircle2 size={16} strokeWidth={2} className="gpl-feedback-icon" />
              : <XCircle size={16} strokeWidth={2} className="gpl-feedback-icon" />}
            <span>{isCorrect ? 'Richtig! ' : 'Falsch. '}{current.explanation}</span>
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
    position: fixed; inset: 0; background: rgba(5,22,77,.42);
    backdrop-filter: blur(4px); display: flex;
    align-items: center; justify-content: center;
    z-index: 1000; padding: 16px;
  }
  .gpl-card {
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: var(--radius-lg); width: 100%; box-shadow: var(--shadow-lg);
    max-height: 90vh; overflow-y: auto; display: flex; flex-direction: column;
  }
  .gpl-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 16px; padding: 20px 24px 16px; border-bottom: 1px solid var(--border);
    position: sticky; top: 0; background: var(--bg-card); z-index: 1;
  }
  .gpl-title { font-size: 16px; font-weight: 700; font-family: var(--font-head); color: var(--text); margin: 0; line-height: 1.4; }
  .gpl-subtitle { font-size: 12px; color: var(--text-muted); margin-top: 3px; }
  .gpl-close {
    background: var(--bg-card); border: 1px solid var(--border-strong); border-radius: var(--radius-sm);
    color: var(--text-dim); cursor: pointer; line-height: 1;
    width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; font-family: inherit;
    transition: border-color var(--duration) var(--ease), color var(--duration) var(--ease);
  }
  .gpl-close:hover { color: var(--text); border-color: var(--accent); }
  .gpl-savebar { display: flex; align-items: center; gap: 8px; padding: 10px 24px; font-size: 13px; border-bottom: 1px solid var(--border); }
  .gpl-savebar-icon { flex-shrink: 0; }
  .gpl-save-saving { color: var(--text-muted); }
  .gpl-save-saved { color: var(--success-ink); background: var(--success-soft); }
  .gpl-save-error { color: var(--danger); background: var(--danger-soft); }
  .gpl-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; flex: 1; }
  .gpl-progress { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--text-muted); }
  .gpl-progress-bar { flex: 1; height: 4px; background: var(--border); border-radius: 9999px; overflow: hidden; }
  .gpl-progress-fill { height: 100%; background: var(--accent); border-radius: 9999px; transition: width 0.4s var(--ease); }
  .gpl-question { font-size: 15px; font-weight: 600; color: var(--text); line-height: 1.5; margin: 0; }
  .gpl-options { display: flex; flex-direction: column; gap: 8px; }
  .gpl-option {
    display: block; width: 100%; text-align: left; padding: 12px 16px;
    border-radius: var(--radius); border: 1px solid var(--border);
    background: var(--bg-card); color: var(--text); cursor: pointer;
    font-size: 14px; font-family: inherit;
    transition: border-color var(--duration) var(--ease), background-color var(--duration) var(--ease), box-shadow var(--duration) var(--ease);
  }
  .gpl-option:hover:not(:disabled) { border-color: var(--accent); background: var(--bg-card-hover); box-shadow: var(--shadow-sm); }
  .gpl-option:disabled { cursor: default; }
  .gpl-option.opt-correct { border-color: var(--success); background: var(--success-soft); color: var(--success-ink); }
  .gpl-option.opt-wrong { border-color: var(--danger); background: var(--danger-soft); color: var(--danger); }
  .gpl-feedback { display: flex; align-items: flex-start; gap: 8px; padding: 12px 16px; border-radius: var(--radius); font-size: 14px; line-height: 1.5; }
  .gpl-feedback-icon { flex-shrink: 0; margin-top: 2px; }
  .gpl-feedback.fb-correct { background: var(--success-soft); border: 1px solid var(--success); color: var(--success-ink); }
  .gpl-feedback.fb-wrong { background: var(--danger-soft); border: 1px solid var(--danger); color: var(--danger); }
  .gpl-next-row { display: flex; justify-content: flex-end; }
  .gpl-score { display: flex; flex-direction: column; align-items: center; padding: 32px 0 16px; gap: 8px; }
  .gpl-score-number { font-size: 52px; font-weight: 800; font-family: var(--font-head); font-variant-numeric: tabular-nums; letter-spacing: -0.02em; color: var(--accent); line-height: 1; }
  .gpl-score-label { font-size: 15px; color: var(--text-muted); }
  @media (prefers-reduced-motion: reduce) {
    .gpl-progress-fill { transition: none; }
  }
`
