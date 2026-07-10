'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { ArenaEvaluation, ArenaRound, Game } from '@/types/game'
import ThinkingDots from './ThinkingDots'
import GamePopup from './ui/GamePopup'
import ConfettiBurst from './ui/ConfettiBurst'
import SparkleBurst from './ui/SparkleBurst'
import ScoreCounter from './ui/ScoreCounter'
import Badge from './ui/Badge'
import { Target, ArrowUp, ArrowDown, CheckCircle2, AlertCircle, Trophy } from 'lucide-react'
import HowToPlay from './ui/HowToPlay'

interface Props {
  game: Game
  onComplete: (score: number) => void
}

type Phase = 'prompt-input' | 'loading' | 'ranking' | 'revealed'

interface ArenaCard {
  key: string
  text: string
  kind: 'own' | 'reference'
  refId?: number
}

function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
}

// Client-side ranking-accuracy proxy used when the LLM evaluation call
// fails, so the celebratory popup never has to be skipped just because
// kiconnect is unavailable (e.g. placeholder credentials in a demo).
function fallbackScorePercent(roundCorrect: boolean): number {
  return roundCorrect ? 65 : 35
}

export default function PromptArenaPlayer({ game, onComplete }: Props) {
  const rounds = (game.game_json.arenaRounds ?? []) as ArenaRound[]
  const maxPoints = game.game_json.scoring?.maxPoints ?? rounds.length

  const [howToPlayOpen, setHowToPlayOpen] = useState(true)
  const [roundIndex, setRoundIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('prompt-input')
  const [userPrompt, setUserPrompt] = useState('')
  const [ownAnswerText, setOwnAnswerText] = useState('')
  const [generationError, setGenerationError] = useState('')
  const [order, setOrder] = useState<ArenaCard[]>([])
  const [draggedKey, setDraggedKey] = useState<string | null>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)
  // Mirrors draggedKey for reads inside onDrop: if drop fires before React
  // re-renders after dragstart (possible with very fast pointer input), the
  // draggedKey *state* read in the closure can still be stale. The ref is
  // always current regardless of render timing.
  const draggedKeyRef = useRef<string | null>(null)
  const [roundCorrect, setRoundCorrect] = useState(false)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  const [evaluationOpen, setEvaluationOpen] = useState(false)
  const [evaluation, setEvaluation] = useState<ArenaEvaluation | null>(null)
  const [evaluationStatus, setEvaluationStatus] = useState<'loading' | 'done' | 'fallback'>('loading')

  // FLIP animation for card reordering: measure each card's position before
  // the reorder commits, then after, apply the inverse transform and release
  // it into a transition so the card visibly glides to its new slot instead
  // of snapping.
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const prevRectsRef = useRef<Map<string, DOMRect>>(new Map())

  useLayoutEffect(() => {
    const newRects = new Map<string, DOMRect>()
    cardRefs.current.forEach((el, key) => newRects.set(key, el.getBoundingClientRect()))

    if (prevRectsRef.current.size > 0 && !prefersReducedMotion()) {
      cardRefs.current.forEach((el, key) => {
        const oldRect = prevRectsRef.current.get(key)
        const newRect = newRects.get(key)
        if (!oldRect || !newRect) return
        const deltaY = oldRect.top - newRect.top
        if (Math.abs(deltaY) > 0.5) {
          el.style.transition = 'none'
          el.style.transform = `translateY(${deltaY}px)`
          requestAnimationFrame(() => {
            el.style.transition = 'transform 0.35s ease'
            el.style.transform = ''
          })
        }
      })
    }
    prevRectsRef.current = newRects
  }, [order])

  const round = rounds[roundIndex]
  const isLast = roundIndex + 1 >= rounds.length

  function buildCards(ownText: string) {
    const refs: ArenaCard[] = round.referenceOutputs.map(r => ({
      key: `ref-${r.id}`,
      text: r.text,
      kind: 'reference',
      refId: r.id,
    }))
    prevRectsRef.current = new Map()
    setOrder(shuffled([{ key: 'own', text: ownText, kind: 'own' }, ...refs]))
  }

  async function submitPrompt() {
    if (!userPrompt.trim() || phase === 'loading') return
    setPhase('loading')
    setGenerationError('')
    try {
      const res = await fetch('/api/prompt-arena/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskDescription: round.taskDescription,
          systemContext: round.systemContext,
          userPrompt: userPrompt.trim(),
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setOwnAnswerText(data.response)
      buildCards(data.response)
      setPhase('ranking')
    } catch {
      setGenerationError('Die KI-Antwort auf deinen Prompt konnte gerade nicht generiert werden.')
      setPhase('prompt-input')
    }
  }

  function continueWithPlaceholder() {
    const placeholder = '(Antwort konnte nicht generiert werden — trotzdem geht die Runde mit den zwei Referenzantworten weiter.)'
    setOwnAnswerText(placeholder)
    buildCards(placeholder)
    setGenerationError('')
    setPhase('ranking')
  }

  function moveCard(fromKey: string, toKey: string) {
    if (fromKey === toKey) return
    setOrder(prev => {
      const fromIdx = prev.findIndex(c => c.key === fromKey)
      const toIdx = prev.findIndex(c => c.key === toKey)
      if (fromIdx === -1 || toIdx === -1) return prev
      const next = [...prev]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      return next
    })
  }

  function moveUp(index: number) {
    if (index === 0) return
    setOrder(prev => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }

  function moveDown(index: number) {
    setOrder(prev => {
      if (index >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[index + 1], next[index]] = [next[index], next[index + 1]]
      return next
    })
  }

  async function handleConfirmOrder() {
    const rank1 = round.referenceOutputs.find(r => r.qualityRank === 1)
    const rank2 = round.referenceOutputs.find(r => r.qualityRank === 2)
    const idx1 = order.findIndex(c => c.key === `ref-${rank1?.id}`)
    const idx2 = order.findIndex(c => c.key === `ref-${rank2?.id}`)
    const correct = idx1 < idx2
    setRoundCorrect(correct)
    if (correct) setScore(s => s + 1)
    setPhase('revealed')
    setEvaluationOpen(true)
    setEvaluationStatus('loading')
    setEvaluation(null)

    try {
      const res = await fetch('/api/prompt-arena/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskDescription: round.taskDescription,
          systemContext: round.systemContext,
          userPrompt: userPrompt.trim(),
          ownAnswerText,
          bestReferenceText: rank1?.text ?? '',
          bestReferenceNote: rank1?.note ?? '',
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setEvaluation(data as ArenaEvaluation)
      setEvaluationStatus('done')
    } catch {
      setEvaluation({
        scorePercent: fallbackScorePercent(correct),
        explanation: 'Ausführliches KI-Feedback ist gerade nicht verfügbar.',
        whatWasGood: '',
        improvement: '',
        comparison: '',
      })
      setEvaluationStatus('fallback')
    }
  }

  function closeEvaluation() {
    setEvaluationOpen(false)
  }

  function handleNextRound() {
    if (isLast) {
      setDone(true)
      onComplete(score)
    } else {
      setRoundIndex(i => i + 1)
      setPhase('prompt-input')
      setUserPrompt('')
      setOwnAnswerText('')
      setGenerationError('')
      setOrder([])
      setEvaluation(null)
      setEvaluationOpen(false)
    }
  }

  if (done) {
    const pct = Math.round((score / maxPoints) * 100)
    return (
      <>
        <style>{paStyles}</style>
        <div className="pa-score-screen">
          <SparkleBurst />
          <span className="pa-score-trophy" aria-hidden="true"><Trophy size={28} strokeWidth={2.25} /></span>
          <div className="pa-score-number">
            {score}
            <span style={{ fontSize: '0.45em', color: 'var(--text-muted)', fontWeight: 400 }}>/{maxPoints}</span>
          </div>
          <div className="pa-score-label">Runden richtig geordnet</div>
          <div className="pa-score-msg">
            {pct >= 80
              ? 'Stark! Du erkennst zuverlässig, welche Antworten wirklich überzeugen.'
              : pct >= 50
              ? 'Guter Ansatz — schau dir die Erklärungen nochmal an, um noch treffsicherer zu werden.'
              : 'Weiter üben — Qualität von KI-Antworten einzuschätzen ist eine trainierbare Fähigkeit.'}
          </div>
        </div>
      </>
    )
  }

  if (!round) return null

  const rank1Id = round.referenceOutputs.find(r => r.qualityRank === 1)?.id
  const showConfetti = evaluationOpen && evaluationStatus !== 'loading' && (evaluation?.scorePercent ?? 0) >= 70

  return (
    <>
      <style>{paStyles}</style>

      <HowToPlay
        open={howToPlayOpen}
        title="So funktioniert Prompt Arena"
        termExplanation={
          'Ein „Prompt" ist die Anfrage, die du an eine KI schickst. Je genauer dein Prompt, ' +
          'desto besser und zuverlässiger fällt meist die Antwort der KI aus.'
        }
        steps={[
          { text: 'Du liest eine Finance-Situation und schreibst deinen eigenen Prompt dazu.' },
          { text: 'Die KI antwortet live auf deinen Prompt. Du siehst drei Antworten — deine und zwei Referenzantworten, aber nicht, welche welche ist.' },
          { text: 'Du sortierst alle drei von der besten zur schwächsten. Danach bekommst du eine Auswertung inklusive Feedback zu deinem Prompt.' },
        ]}
        onDismiss={() => setHowToPlayOpen(false)}
      />

      <div className="pa-container">
        <div className="pa-progress">
          <span>Runde {roundIndex + 1} von {rounds.length}</span>
          <div className="pa-progress-bar">
            <div className="pa-progress-fill" style={{ width: `${((roundIndex + 1) / rounds.length) * 100}%` }} />
          </div>
          <span style={{ whiteSpace: 'nowrap' }}>{score} Pkt.</span>
        </div>

        {phase === 'prompt-input' && (
          <>
            <span className="pa-label">Situation</span>
            <div className="pa-task">{round.taskDescription}</div>
            <p className="pa-instruction">
              Schreibe einen Prompt, den du einer KI schicken würdest, um zu dieser Situation
              eine möglichst gute, faktenbasierte Antwort zu bekommen.
            </p>
            <textarea
              className="pa-textarea"
              placeholder="Dein Prompt an die KI…"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
            />
            <div className="pa-submit-row">
              <button className="btn btn-primary" onClick={submitPrompt} disabled={!userPrompt.trim()}>
                Prompt absenden
              </button>
            </div>
            {generationError && (
              <div className="pa-error">
                <div>{generationError}</div>
                <div className="pa-error-actions">
                  <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={submitPrompt}>
                    Erneut versuchen
                  </button>
                  <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={continueWithPlaceholder}>
                    Trotzdem fortfahren
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {phase === 'loading' && (
          <div className="pa-loading">
            <ThinkingDots label="KI generiert eine Antwort auf deinen Prompt" />
          </div>
        )}

        {(phase === 'ranking' || phase === 'revealed') && (
          <>
            <p className="pa-instruction">
              Hier sind drei KI-Antworten auf dieselbe Situation — eine davon basiert auf
              deinem Prompt, die anderen zwei sind Referenzantworten. Du siehst nicht, welche
              welche ist. Ordne sie per Ziehen (oder mit den Pfeilen) von der besten (oben)
              zur schwächsten (unten) Antwort.
            </p>
            <div className="pa-card-list">
              {order.map((card, i) => (
                <div
                  key={card.key}
                  ref={el => { if (el) cardRefs.current.set(card.key, el); else cardRefs.current.delete(card.key) }}
                  className={`pa-card pa-card-enter ${draggedKey === card.key ? 'dragging' : ''} ${dragOverKey === card.key ? 'drag-over' : ''}`}
                  style={{ animationDelay: `${i * 70}ms` }}
                  draggable={phase === 'ranking'}
                  onDragStart={() => { draggedKeyRef.current = card.key; setDraggedKey(card.key) }}
                  onDragOver={(e) => { e.preventDefault(); if (draggedKeyRef.current) setDragOverKey(card.key) }}
                  onDragLeave={() => setDragOverKey(prev => (prev === card.key ? null : prev))}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (draggedKeyRef.current) moveCard(draggedKeyRef.current, card.key)
                    draggedKeyRef.current = null
                    setDraggedKey(null)
                    setDragOverKey(null)
                  }}
                  onDragEnd={() => { draggedKeyRef.current = null; setDraggedKey(null); setDragOverKey(null) }}
                >
                  <span className={`pa-rank-badge pa-rank-${i}`}>{i + 1}</span>
                  <span className="pa-card-text">{card.text}</span>
                  {phase === 'ranking' && (
                    <div className="pa-move-buttons">
                      <button className="pa-move-btn" onClick={() => moveUp(i)} disabled={i === 0} aria-label="nach oben">
                        <ArrowUp size={16} strokeWidth={2.25} />
                      </button>
                      <button className="pa-move-btn" onClick={() => moveDown(i)} disabled={i === order.length - 1} aria-label="nach unten">
                        <ArrowDown size={16} strokeWidth={2.25} />
                      </button>
                    </div>
                  )}
                  {phase === 'revealed' && (
                    <span className={`pa-reveal-tag ${card.kind === 'own' ? 'tag-own' : card.refId === rank1Id ? 'tag-strong' : 'tag-weak'}`}>
                      {card.kind === 'own' ? 'Deine Antwort' : card.refId === rank1Id ? 'Stärkere Referenz' : 'Schwächere Referenz'}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <p className="pa-hint">Ziehen oder mit den Pfeil-Buttons sortieren.</p>

            {phase === 'ranking' && (
              <div className="pa-submit-row">
                <button className="btn btn-primary" onClick={handleConfirmOrder}>
                  Reihenfolge bestätigen
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <GamePopup open={evaluationOpen} title="Deine Auswertung" onClose={closeEvaluation} variant="celebratory">
        {showConfetti && <ConfettiBurst />}
        {evaluationStatus === 'loading' && (
          <div className="pa-eval-loading">
            <ThinkingDots label="KI bewertet deine Antwort" />
          </div>
        )}
        {evaluation && evaluationStatus !== 'loading' && (
          <>
            <div className="pa-eval-score-card">
              <ScoreCounter value={evaluation.scorePercent} suffix="%" className="pa-eval-percent" />
              <div className="pa-eval-percent-label">so gut wie die beste Vergleichsantwort</div>
              {evaluation.scorePercent >= 70 && <Badge label="Prompt-Profi" icon={Target} />}
            </div>
            {evaluationStatus === 'done' && <p className="pa-eval-text">{evaluation.explanation}</p>}

            <div className={`pa-result ${roundCorrect ? 'result-correct' : 'result-wrong'}`}>
              {roundCorrect ? <CheckCircle2 size={16} strokeWidth={2} /> : <AlertCircle size={16} strokeWidth={2} />}
              {roundCorrect
                ? 'Richtig! Du hast die stärkere Referenzantwort vor die schwächere einsortiert.'
                : 'Nicht ganz — die schwächere Referenzantwort stand bei dir vor der stärkeren.'}
            </div>

            <div className="pa-notes">
              {round.referenceOutputs
                .slice()
                .sort((a, b) => a.qualityRank - b.qualityRank)
                .map(r => (
                  <div key={r.id} className="pa-note-item">
                    <strong>{r.qualityRank === 1 ? 'Stärkere Referenz:' : 'Schwächere Referenz:'}</strong> {r.note}
                  </div>
                ))}
              {evaluationStatus === 'done' && evaluation.comparison && (
                <div className="pa-note-item">{evaluation.comparison}</div>
              )}
            </div>

            <div className="pa-feedback-card">
              <span className="pa-feedback-header">
                <span className="pa-feedback-icon" aria-hidden="true" />
                KI-Feedback zu deinem Prompt
              </span>
              {evaluationStatus === 'done' ? (
                <div className="pa-feedback-text">
                  {evaluation.whatWasGood} {evaluation.improvement}
                </div>
              ) : (
                <div className="pa-feedback-text">Feedback zu deinem Prompt konnte gerade nicht geladen werden.</div>
              )}
            </div>

            <div className="pa-lesson">Merke: Je genauer dein Prompt, desto besser die Antwort.</div>

            <div className="pa-next-row">
              <button className="btn btn-primary" onClick={handleNextRound}>
                {isLast ? 'Ergebnis anzeigen' : 'Nächste Runde →'}
              </button>
            </div>
          </>
        )}
      </GamePopup>
    </>
  )
}

const paStyles = `
  .pa-container {
    padding: 20px 24px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .pa-progress {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: var(--text-muted);
  }
  .pa-progress-bar {
    flex: 1;
    height: 4px;
    background: var(--border);
    border-radius: 9999px;
    overflow: hidden;
  }
  .pa-progress-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 9999px;
    transition: width 0.3s ease;
  }
  .pa-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    margin-bottom: -6px;
  }
  .pa-task {
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
    line-height: 1.5;
    background: var(--bg-card);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-sm);
    border-radius: var(--radius);
    padding: 16px;
  }
  .pa-instruction { font-size: 13px; color: var(--text-dim); margin: 0; }
  .pa-hint { font-size: 11px; color: var(--text-muted); margin: -6px 0 0; font-style: italic; }
  .pa-textarea {
    background: var(--surface-sunken);
    box-shadow: inset 0 1px 2px rgba(5,22,77,.08);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    font-size: 14px;
    padding: 12px 14px;
    resize: vertical;
    min-height: 80px;
    font-family: inherit;
    outline: none;
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.2s ease-out, box-shadow 0.2s ease-out;
  }
  .pa-textarea:focus { border-color: var(--accent); box-shadow: var(--focus-ring); }
  .pa-submit-row { display: flex; justify-content: flex-end; }
  .pa-error {
    background: var(--danger-soft);
    border: 1px solid var(--danger);
    border-radius: var(--radius);
    padding: 12px 16px;
    font-size: 13px;
    color: var(--danger);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .pa-error-actions { display: flex; gap: 8px; }
  .pa-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 0;
  }
  .pa-eval-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 0;
  }
  .pa-card-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .pa-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: var(--bg-card);
    box-shadow: var(--shadow-sm);
    cursor: grab;
    transition: border-color 0.2s ease-out, background-color 0.2s ease-out, box-shadow 0.2s ease-out, transform 0.2s ease-out, opacity 0.2s ease-out;
  }
  .pa-card-enter { animation: pa-card-fade-in 0.35s ease both; }
  @keyframes pa-card-fade-in {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .pa-card:active { cursor: grabbing; }
  .pa-card:hover { box-shadow: var(--shadow-md); background: var(--bg-card-hover); }
  .pa-card.dragging {
    opacity: 0.5;
    border: 1px solid var(--accent);
    border-left: 3px solid var(--lh-yellow);
  }
  .pa-card.drag-over {
    border-color: var(--accent);
    background: var(--accent-soft);
    box-shadow: var(--shadow-lg);
  }
  .pa-rank-badge {
    flex-shrink: 0;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 800;
    font-family: var(--font-head);
    color: #fff;
    background: var(--text-muted);
  }
  .pa-rank-badge.pa-rank-0 { background: var(--accent); }
  .pa-rank-badge.pa-rank-1 { background: var(--text-dim); }
  .pa-rank-badge.pa-rank-2 { background: var(--text-muted); }
  .pa-card-text {
    flex: 1;
    font-size: 13px;
    line-height: 1.5;
    color: var(--text);
  }
  .pa-move-buttons {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex-shrink: 0;
  }
  .pa-move-btn {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg-card);
    color: var(--text-muted);
    cursor: pointer;
    line-height: 1;
    font-family: inherit;
  }
  .pa-move-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent-ink); }
  .pa-move-btn:disabled { opacity: 0.3; cursor: default; }
  .pa-move-btn:focus-visible { outline: none; box-shadow: var(--focus-ring); }
  .pa-reveal-tag {
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 4px 8px;
    border-radius: 6px;
    white-space: nowrap;
  }
  .pa-reveal-tag.tag-own { background: var(--accent-soft); color: var(--accent-ink); }
  .pa-reveal-tag.tag-strong { background: var(--success-soft); color: var(--success-ink); }
  .pa-reveal-tag.tag-weak { background: var(--surface-sunken); color: var(--text-dim); }
  .pa-result {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 12px 16px;
    border-radius: var(--radius);
    font-size: 14px;
    line-height: 1.5;
  }
  .pa-result svg { flex-shrink: 0; margin-top: 2px; }
  .pa-result.result-correct {
    background: var(--success-soft);
    border: 1px solid var(--success);
    color: var(--success-ink);
  }
  .pa-result.result-wrong {
    background: var(--attention-soft);
    border: 1px solid var(--attention);
    color: var(--attention-ink);
  }
  .pa-notes {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 12px;
    color: var(--text-dim);
    background: var(--surface-sunken);
    border: none;
    border-radius: var(--radius);
    padding: 12px 14px;
  }
  .pa-note-item { line-height: 1.5; }
  .pa-eval-score-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 4px 0;
  }
  .pa-eval-percent {
    font-size: 56px;
    font-weight: 800;
    font-family: var(--font-head);
    color: var(--accent);
    line-height: 1;
  }
  .pa-eval-percent-label {
    font-size: 12px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .pa-eval-text {
    font-size: 15px;
    color: var(--text-dim);
    line-height: 1.6;
    text-align: center;
    margin: 0;
  }
  .pa-feedback-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: var(--accent-soft);
    border: none;
    border-radius: var(--radius);
    padding: 14px 16px;
  }
  .pa-feedback-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--accent-ink);
    font-family: var(--font-head);
  }
  .pa-feedback-icon {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--lh-yellow);
    flex-shrink: 0;
  }
  .pa-feedback-text {
    font-size: 13px;
    color: var(--text);
    line-height: 1.5;
  }
  .pa-lesson {
    font-size: 13px;
    font-weight: 600;
    color: var(--accent-ink);
    background: var(--accent-soft);
    border: none;
    border-radius: var(--radius);
    padding: 12px 14px;
    text-align: center;
  }
  .pa-next-row { display: flex; justify-content: flex-end; }
  .pa-score-screen {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 36px 24px 32px;
    gap: 8px;
    text-align: center;
  }
  .pa-score-trophy {
    position: relative;
    z-index: 1;
    width: 52px;
    height: 52px;
    border-radius: var(--radius-pill);
    background: var(--accent);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-md);
    margin-bottom: 4px;
    animation: pa-trophy-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }
  @keyframes pa-trophy-pop {
    0% { transform: scale(0.3) rotate(-10deg); opacity: 0; }
    60% { transform: scale(1.15) rotate(4deg); opacity: 1; }
    100% { transform: scale(1) rotate(0deg); }
  }
  .pa-score-number {
    position: relative;
    z-index: 1;
    font-size: 52px;
    font-weight: 800;
    font-family: var(--font-head);
    color: var(--accent);
    line-height: 1;
  }
  .pa-score-label { position: relative; z-index: 1; font-size: 14px; color: var(--text-muted); }
  .pa-score-msg {
    position: relative;
    z-index: 1;
    font-size: 14px;
    color: var(--text-dim);
    max-width: 380px;
    line-height: 1.5;
    margin-top: 8px;
  }
  @media (prefers-reduced-motion: reduce) {
    .pa-card-enter { animation: none; }
    .pa-score-trophy { animation: none; }
  }
`
