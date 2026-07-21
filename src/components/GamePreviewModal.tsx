'use client'

import { useState, type ReactNode } from 'react'
import { Game } from '@/types/game'
import ExcelGamePlayer from './ExcelGamePlayer'
import HallucinationSpotterPlayerV2 from './HallucinationSpotterPlayerV2'
import PromptArenaPlayer from './PromptArenaPlayer'
import BranchingGamePlayer from './BranchingGamePlayer'
import { X, CheckCircle2, XCircle } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

interface Props {
  game: Game | null
  onClose: () => void
}

type PreviewQuestion = {
  id: string
  question: string
  correctAnswer: string
  options: Array<{ id: string; text?: string; label?: string }>
  explanation?: string
}

const styles = `
  .gpm-overlay {
    position: fixed;
    inset: 0;
    background: rgba(5,22,77,.38);
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
    box-shadow: var(--shadow-lg);
    width: 100%;
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
    font-family: var(--font-head);
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
    border: 1px solid var(--border-strong);
    border-radius: 6px;
    color: var(--text-dim);
    cursor: pointer;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    flex-shrink: 0;
    font-family: inherit;
  }
  .gpm-close:hover { color: var(--text); border-color: var(--accent); }
  .gpm-body {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
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
    background: var(--bg-card-hover);
  }
  .gpm-option:disabled { cursor: default; }
  .gpm-option.opt-correct { border-color: var(--success); background: var(--success-soft); }
  .gpm-option.opt-wrong { border-color: var(--attention); background: var(--attention-soft); }
  .gpm-option.opt-chosen { box-shadow: inset 0 0 0 1px var(--accent); }
  .gpm-option-label { display: block; font-weight: 600; }
  .gpm-feedback {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    border-left: 3px solid var(--accent);
    background: var(--accent-soft);
    padding: 12px 14px;
    border-radius: 8px;
    color: var(--text);
    font-size: 13px;
    line-height: 1.5;
  }
  .gpm-feedback-icon { flex-shrink: 0; margin-top: 1px; }
  .gpm-feedback-body { flex: 1; }
  .gpm-feedback-label {
    display: block;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--accent-ink);
    margin-bottom: 4px;
  }
  .gpm-next-row {
    display: flex;
    justify-content: flex-end;
  }
  .gpm-summary {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .gpm-summary-score {
    font-size: 42px;
    font-weight: 800;
    color: var(--text);
    line-height: 1;
  }
  .gpm-summary-note {
    color: var(--text-muted);
    font-size: 14px;
    line-height: 1.5;
  }
`

function PreviewShell({
  game,
  onClose,
  subtitle,
  maxWidth,
  children,
}: {
  game: Game
  onClose: () => void
  subtitle: string
  maxWidth: number | string
  children: ReactNode
}) {
  const { t } = useI18n()
  return (
    <>
      <style>{styles}</style>
      <div className="gpm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <div className="gpm-card" style={{ maxWidth }}>
          <div className="gpm-header">
            <div>
              <h2 className="gpm-title">{game.title}</h2>
              <div className="gpm-subtitle">{subtitle}</div>
            </div>
            <button className="gpm-close" onClick={onClose} aria-label={t('common.close')}><X size={16} strokeWidth={2} /></button>
          </div>
          {children}
        </div>
      </div>
    </>
  )
}

function QuestionPreview({
  game,
  questions,
  onClose,
}: {
  game: Game
  questions: PreviewQuestion[]
  onClose: () => void
}) {
  const { t } = useI18n()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  const current = questions[currentIndex]

  function handleSelect(optionId: string) {
    if (selectedAnswer || done) return
    setSelectedAnswer(optionId)
    if (optionId === current.correctAnswer) setScore((s) => s + 1)
  }

  function handleNext() {
    if (currentIndex + 1 >= questions.length) {
      setDone(true)
      return
    }
    setCurrentIndex((i) => i + 1)
    setSelectedAnswer(null)
  }

  if (done) {
    return (
      <PreviewShell game={game} onClose={onClose} subtitle={t('gpm.quizPreview')} maxWidth={620}>
        <div className="gpm-summary">
          <div className="gpm-summary-score">{score}/{questions.length}</div>
          <div className="gpm-summary-note">{t('gpm.previewDone')}</div>
          <button className="btn btn-ghost" onClick={onClose}>{t('common.close')}</button>
        </div>
      </PreviewShell>
    )
  }

  const answered = selectedAnswer !== null
  const isCorrect = selectedAnswer === current.correctAnswer

  return (
    <PreviewShell game={game} onClose={onClose} subtitle={t('gpm.quizPreview')} maxWidth={620}>
      <div className="gpm-body">
        <div className="gpm-progress">
          <span>{t('gpm.questionOf', { n: currentIndex + 1, total: questions.length })}</span>
          <div className="gpm-progress-bar">
            <div
              className="gpm-progress-fill"
              style={{ width: `${Math.min((currentIndex / questions.length) * 100, 100)}%` }}
            />
          </div>
          <span style={{ whiteSpace: 'nowrap' }}>{score} {t('common.points_short')}</span>
        </div>

        <p className="gpm-question">{current.question}</p>

        <div className="gpm-options">
          {current.options.map((option) => {
            const isChosen = selectedAnswer === option.id
            const optionClass = answered
              ? option.id === current.correctAnswer
                ? 'opt-correct'
                : isChosen
                  ? 'opt-wrong'
                  : ''
              : isChosen
                ? 'opt-chosen'
                : ''

            return (
              <button
                key={option.id}
                className={`gpm-option ${optionClass}`}
                onClick={() => handleSelect(option.id)}
                disabled={answered}
              >
                <span className="gpm-option-label">{option.label ?? option.text ?? option.id}</span>
              </button>
            )
          })}
        </div>

        {answered && (
          <div className="gpm-feedback">
            <span className="gpm-feedback-icon">
              {isCorrect ? <CheckCircle2 size={16} strokeWidth={2} /> : <XCircle size={16} strokeWidth={2} />}
            </span>
            <span className="gpm-feedback-body">
              <span className="gpm-feedback-label">{isCorrect ? t('gpm.correct') : t('gpm.wrong')}</span>
              {current.explanation ?? (isCorrect ? t('gpm.goodChoice') : t('gpm.checkSource'))}
            </span>
          </div>
        )}

        {answered && (
          <div className="gpm-next-row">
            <button className="btn btn-primary" onClick={handleNext}>{t('gpm.next')}</button>
          </div>
        )}
      </div>
    </PreviewShell>
  )
}

function PreviewMessage({
  game,
  onClose,
  subtitle,
  message,
}: {
  game: Game
  onClose: () => void
  subtitle: string
  message: string
}) {
  const { t } = useI18n()
  return (
    <PreviewShell game={game} onClose={onClose} subtitle={subtitle} maxWidth={480}>
      <div className="gpm-summary">
        <div className="gpm-summary-note">{message}</div>
        <button className="btn btn-ghost" onClick={onClose}>{t('common.close')}</button>
      </div>
    </PreviewShell>
  )
}

export default function GamePreviewModal({ game, onClose }: Props) {
  const { t } = useI18n()
  if (!game) return null

  if (game.format === 'excel_challenge' && game.game_json.task && game.game_json.initialData) {
    return (
      <PreviewShell game={game} onClose={onClose} subtitle={`Excel Challenge · ${game.difficulty}`} maxWidth="96vw">
        <ExcelGamePlayer
          gameId={game.id}
          task={game.game_json.task ?? ''}
          initialData={game.game_json.initialData}
          maxAttempts={game.game_json.maxAttempts ?? 3}
          playerId={null}
          onComplete={(result) => console.log('preview result:', result)}
          onClose={onClose}
        />
      </PreviewShell>
    )
  }

  if (game.game_json.format === 'hallucination_spotter_v2') {
    return (
      <PreviewShell game={game} onClose={onClose} subtitle={`Hallucination Spotter v2 · ${game.difficulty}`} maxWidth={680}>
        <HallucinationSpotterPlayerV2 game={game} onComplete={(score) => console.log('preview score:', score)} />
      </PreviewShell>
    )
  }

  if (game.game_json.format === 'prompt_arena') {
    return (
      <PreviewShell game={game} onClose={onClose} subtitle={`Prompt Arena · ${game.difficulty}`} maxWidth={680}>
        <PromptArenaPlayer game={game} onComplete={(score) => console.log('preview score:', score)} />
      </PreviewShell>
    )
  }

  if (game.game_json.format === 'prompt_branching' && game.game_json.branching) {
    return (
      <PreviewShell game={game} onClose={onClose} subtitle={`Prompt-Navigator · ${game.difficulty}`} maxWidth={680}>
        <BranchingGamePlayer game={game} onComplete={(score) => console.log('preview score:', score)} />
      </PreviewShell>
    )
  }

  const questions = (game.game_json.questions ?? []) as PreviewQuestion[]
  if (questions.length > 0) {
    return <QuestionPreview game={game} questions={questions} onClose={onClose} />
  }

  return (
    <PreviewMessage
      game={game}
      onClose={onClose}
      subtitle={[game.format || '—', game.difficulty].filter(Boolean).join(' · ')}
      message={game.format ? t('gpm.unavailableFormat', { format: game.format }) : t('gpm.unavailablePlain')}
    />
  )
}