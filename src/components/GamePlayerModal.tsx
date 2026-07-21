'use client'

import { useCallback, useState } from 'react'
import { Game, Question } from '@/types/game'
import ExcelGamePlayer from './ExcelGamePlayer'
import HallucinationSpotterPlayerV2 from './HallucinationSpotterPlayerV2'
import PromptArenaPlayer from './PromptArenaPlayer'
import BranchingGamePlayer from './BranchingGamePlayer'
import { X, CheckCircle2, XCircle, AlertTriangle, Construction, Frown, Meh, Smile, Send } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

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
  const { t } = useI18n()
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  // Sobald ein Durchlauf beendet ist, wird beim nächsten Schließen einmalig nach
  // Feedback gefragt. `phase` schaltet den Modal-Body von Spiel auf Feedback um.
  const [completed, setCompleted] = useState(false)
  const [feedbackDone, setFeedbackDone] = useState(false)
  const [phase, setPhase] = useState<'playing' | 'feedback'>('playing')

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

  // Spielende für Quiz/Hallu/Arena/Branching: Score speichern + als beendet markieren.
  const finishGame = useCallback((score: number) => {
    setCompleted(true)
    saveScore(score)
  }, [saveScore])

  // Schließen fängt einen beendeten Durchlauf ab und zeigt zuerst den Feedback-Schritt.
  // In der Feedback-Phase zählt Schließen als "Überspringen".
  const handleRequestClose = useCallback(() => {
    if (completed && !feedbackDone && phase !== 'feedback') {
      setPhase('feedback')
    } else {
      onClose()
    }
  }, [completed, feedbackDone, phase, onClose])

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
      <div className="gpl-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleRequestClose() }}>
        <div className="gpl-card" style={{ maxWidth: phase === 'feedback' ? 520 : cardWidth }}>
          <div className="gpl-header">
            <div>
              <h2 className="gpl-title">{game.title}</h2>
              <div className="gpl-subtitle">
                {[modeLabel, game.difficulty, game.topic].filter(Boolean).join(' · ')}
              </div>
            </div>
            <button className="gpl-close" onClick={handleRequestClose} aria-label={t('common.close')}>
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {phase === 'feedback' ? (
            <FeedbackStep
              game={game}
              onDone={() => { setFeedbackDone(true); onClose() }}
            />
          ) : (
          <>
          {saveState !== 'idle' && (
            <div className={`gpl-savebar gpl-save-${saveState}`}>
              {saveState === 'saving' && t('gpl.saving')}
              {saveState === 'saved' && (
                <><CheckCircle2 size={14} strokeWidth={2.25} className="gpl-savebar-icon" /> {t('gpl.saved')}</>
              )}
              {saveState === 'error' && (
                <><AlertTriangle size={14} strokeWidth={2.25} className="gpl-savebar-icon" /> {t('gpl.saveError')}</>
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
              onComplete={() => { setSaveState('saved'); setCompleted(true); onSaved() }}
              onClose={handleRequestClose}
            />
          )}
          {mode === 'hallu' && (
            <HallucinationSpotterPlayerV2 game={game} onComplete={(result) => finishGame(result.score)} />
          )}
          {mode === 'arena' && <PromptArenaPlayer game={game} onComplete={finishGame} />}
          {mode === 'branching' && <BranchingGamePlayer game={game} onComplete={finishGame} />}
          {mode === 'quiz' && <QuizPlayer game={game} onComplete={finishGame} onClose={handleRequestClose} />}
          {mode === 'unsupported' && (
            <div className="gpl-body">
              <div className="empty-state" style={{ padding: '32px 20px' }}>
                <div className="empty-state-icon"><Construction size={26} strokeWidth={1.5} /></div>
                <div className="empty-state-text">
                  {t('gpl.unsupported')}
                </div>
              </div>
              <div className="gpl-next-row">
                <button className="btn btn-primary" onClick={handleRequestClose}>{t('common.close')}</button>
              </div>
            </div>
          )}
          </>
          )}
        </div>
      </div>
    </>
  )
}

function QuizPlayer({ game, onComplete, onClose }: { game: Game; onComplete: (score: number) => void; onClose: () => void }) {
  const { t } = useI18n()
  const questions = (game.game_json.questions ?? []) as Question[]
  const total = questions.length
  const maxPoints = questions.reduce((s, q) => s + (q.points ?? QUIZ_POINTS_PER_CORRECT), 0)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  if (total === 0) {
    return <div className="gpl-body"><div className="empty-state-text">{t('gpl.noQuestions')}</div></div>
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
          <div className="gpl-score-label">{t('gpl.pointsReached')} · {pct}%</div>
          <div style={{ marginTop: 24 }}>
            <button className="btn btn-primary" onClick={onClose}>{t('common.done')}</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="gpl-body">
      <div className="gpl-progress">
        <span>{t('gpl.questionOf', { current: currentIndex + 1, total })}</span>
        <div className="gpl-progress-bar">
          <div className="gpl-progress-fill" style={{ width: `${((currentIndex + 1) / total) * 100}%` }} />
        </div>
        <span style={{ whiteSpace: 'nowrap' }}>{score} {t('common.points_short')}</span>
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
            <span>{isCorrect ? t('gpl.correct') : t('gpl.wrong')}{current.explanation}</span>
          </div>
          <div className="gpl-next-row">
            <button className="btn btn-primary" onClick={handleNext}>
              {currentIndex + 1 >= total ? t('gpl.showResult') : t('gpl.nextQuestion')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

const RATING_OPTIONS = [
  { value: 1, labelKey: 'gpl.fbR1', Icon: Frown, cls: 'fb-r1' },
  { value: 2, labelKey: 'gpl.fbR2', Icon: Meh, cls: 'fb-r2' },
  { value: 3, labelKey: 'gpl.fbR3', Icon: Smile, cls: 'fb-r3' },
] as const

function FeedbackStep({ game, onDone }: { game: Game; onDone: () => void }) {
  const { t } = useI18n()
  const [rating, setRating] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(false)

  async function submit() {
    if (rating === null || sending) return
    setSending(true)
    setError(false)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: game.id, game_title: game.title, rating, comment }),
      })
      if (!res.ok) throw new Error()
      onDone()
    } catch {
      setError(true)
      setSending(false)
    }
  }

  return (
    <div className="gpl-body gpl-fb-step">
      <div>
        <h3 className="gpl-fb-title">{t('gpl.fbTitle')}</h3>
        <p className="gpl-fb-sub">{t('gpl.fbSub')}</p>
      </div>

      <div className="gpl-fb-ratings" role="radiogroup" aria-label={t('gpl.fbRatingLabel')}>
        {RATING_OPTIONS.map(({ value, labelKey, Icon, cls }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            className={`gpl-fb-rating ${cls} ${rating === value ? 'is-selected' : ''}`}
            onClick={() => setRating(value)}
          >
            <Icon size={30} strokeWidth={1.75} />
            <span>{t(labelKey)}</span>
          </button>
        ))}
      </div>

      <div className="gpl-fb-comment">
        <label htmlFor="gpl-fb-comment">{t('gpl.fbComment')} <span>{t('gpl.fbOptional')}</span></label>
        <textarea
          id="gpl-fb-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder={t('gpl.fbPlaceholder')}
        />
      </div>

      {error && (
        <div className="gpl-fb-error">
          <AlertTriangle size={14} strokeWidth={2.25} /> {t('gpl.fbError')}
        </div>
      )}

      <div className="gpl-fb-actions">
        <button className="btn btn-ghost" onClick={onDone} disabled={sending}>{t('gpl.fbSkip')}</button>
        <button className="btn btn-primary" onClick={submit} disabled={rating === null || sending}>
          {!sending && <Send size={15} strokeWidth={2} />}
          {sending ? t('gpl.fbSending') : t('gpl.fbSend')}
        </button>
      </div>
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
  .gpl-fb-step { gap: 22px; }
  .gpl-fb-title { font-size: 17px; font-weight: 700; font-family: var(--font-head); color: var(--text); margin: 0 0 4px; }
  .gpl-fb-sub { font-size: 13px; color: var(--text-muted); margin: 0; line-height: 1.5; }
  .gpl-fb-ratings { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .gpl-fb-rating {
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    padding: 16px 8px; border-radius: var(--radius); border: 1px solid var(--border);
    background: var(--bg-card); color: var(--text-muted); cursor: pointer;
    font-size: 13px; font-weight: 600; font-family: inherit;
    transition: border-color var(--duration) var(--ease), background-color var(--duration) var(--ease), color var(--duration) var(--ease), transform var(--duration) var(--ease);
  }
  .gpl-fb-rating:hover { border-color: var(--border-strong); color: var(--text); }
  .gpl-fb-rating.is-selected { border-width: 2px; color: var(--text); transform: translateY(-1px); box-shadow: var(--shadow-sm); }
  .gpl-fb-rating.fb-r1.is-selected { border-color: var(--danger); background: var(--danger-soft); color: var(--danger); }
  .gpl-fb-rating.fb-r2.is-selected { border-color: var(--accent); background: var(--bg-card-hover); color: var(--accent); }
  .gpl-fb-rating.fb-r3.is-selected { border-color: var(--success); background: var(--success-soft); color: var(--success-ink); }
  .gpl-fb-comment { display: flex; flex-direction: column; gap: 6px; }
  .gpl-fb-comment label { font-size: 12px; font-weight: 600; color: var(--text); }
  .gpl-fb-comment label span { color: var(--text-muted); font-weight: 400; }
  .gpl-fb-comment textarea {
    width: 100%; resize: vertical; padding: 10px 12px; font: inherit; font-size: 14px;
    border-radius: var(--radius); border: 1px solid var(--border); background: var(--bg-card);
    color: var(--text); line-height: 1.5;
  }
  .gpl-fb-comment textarea:focus { outline: none; border-color: var(--accent); }
  .gpl-fb-error { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--danger); }
  .gpl-fb-actions { display: flex; justify-content: flex-end; gap: 10px; }
  @media (prefers-reduced-motion: reduce) {
    .gpl-progress-fill { transition: none; }
    .gpl-fb-rating { transition: none; }
  }
`
