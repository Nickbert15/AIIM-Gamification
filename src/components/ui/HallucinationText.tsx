'use client'

import { useState } from 'react'

export interface HalluTextSentence {
  id: number
  text: string
  isHallucination: boolean
  explanation: string
}

interface Props {
  sentences: HalluTextSentence[]
  markedIds: Set<number>
  onToggle: (id: number) => void
  revealMode?: boolean
}

// Renders a continuous, flowing text as individually interactive sentences.
// Pre-reveal: hover highlights the sentence under the cursor, click/Enter/
// Space toggles a "marked as made up" state (color + icon, never color
// alone, so it still reads for colorblind players). Post-reveal: sentences
// switch to correct/missed/incorrect coloring and each gets a "Warum?"
// popover explaining the verdict in plain language.
export default function HallucinationText({ sentences, markedIds, onToggle, revealMode }: Props) {
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [openExplanationId, setOpenExplanationId] = useState<number | null>(null)

  function stateFor(s: HalluTextSentence): 'correct' | 'incorrect' | 'missed' | null {
    if (!revealMode) return null
    const isMarked = markedIds.has(s.id)
    if (isMarked && s.isHallucination) return 'correct'
    if (isMarked && !s.isHallucination) return 'incorrect'
    if (!isMarked && s.isHallucination) return 'missed'
    return null
  }

  function handleActivate(s: HalluTextSentence) {
    if (revealMode) {
      setOpenExplanationId(prev => (prev === s.id ? null : s.id))
    } else {
      onToggle(s.id)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, s: HalluTextSentence) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleActivate(s)
    }
  }

  return (
    <>
      <style>{htStyles}</style>
      <div className="ht-passage">
        {sentences.map(s => {
          const isMarked = markedIds.has(s.id)
          const state = stateFor(s)
          const classes = ['ht-sentence']
          if (!revealMode && isMarked) classes.push('ht-marked')
          if (!revealMode && hoveredId === s.id) classes.push('ht-hovered')
          if (state) classes.push(`ht-state-${state}`)

          return (
            <span key={s.id} className="ht-sentence-wrap">
              <span
                role="button"
                tabIndex={0}
                className={classes.join(' ')}
                onMouseEnter={() => setHoveredId(s.id)}
                onMouseLeave={() => setHoveredId(prev => (prev === s.id ? null : prev))}
                onClick={() => handleActivate(s)}
                onKeyDown={(e) => handleKeyDown(e, s)}
                aria-pressed={!revealMode ? isMarked : undefined}
                aria-label={
                  revealMode
                    ? `${s.text} — ${state === 'correct' ? 'richtig erkannt' : state === 'incorrect' ? 'fälschlich markiert' : state === 'missed' ? 'übersehen' : 'korrekt, nicht markiert'}. Warum-Erklärung öffnen.`
                    : `${s.text} — als erfunden markieren`
                }
              >
                {s.text}
                {!revealMode && isMarked && <span className="ht-icon" aria-hidden="true">✎</span>}
                {state === 'correct' && <span className="ht-icon" aria-hidden="true"> ✓</span>}
                {state === 'incorrect' && <span className="ht-icon" aria-hidden="true"> ✗</span>}
                {state === 'missed' && <span className="ht-icon" aria-hidden="true"> ⚠</span>}
              </span>{' '}
              {revealMode && openExplanationId === s.id && (
                <span className="ht-popover" role="note">
                  {s.explanation}
                </span>
              )}
            </span>
          )
        })}
      </div>
      {revealMode && (
        <div className="ht-legend">
          <span className="ht-legend-item"><span className="ht-dot ht-state-correct" /> Richtig erkannt</span>
          <span className="ht-legend-item"><span className="ht-dot ht-state-incorrect" /> Fälschlich markiert</span>
          <span className="ht-legend-item"><span className="ht-dot ht-state-missed" /> Übersehen</span>
          <span className="ht-legend-hint">Klicke einen Satz für die Erklärung ("Warum?").</span>
        </div>
      )}
    </>
  )
}

const htStyles = `
  .ht-passage {
    font-size: 14px;
    line-height: 1.9;
    color: var(--text);
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px 20px;
  }
  .ht-sentence-wrap { display: inline; }
  .ht-sentence {
    cursor: pointer;
    border-radius: 4px;
    padding: 1px 2px;
    transition: background-color 0.12s ease, box-shadow 0.12s ease;
    outline-offset: 2px;
  }
  .ht-sentence:hover, .ht-sentence.ht-hovered {
    background: rgba(14,165,233,0.12);
  }
  .ht-sentence:focus-visible {
    outline: 2px solid var(--accent);
  }
  .ht-sentence.ht-marked {
    background: rgba(245,158,11,0.18);
    box-shadow: inset 0 -2px 0 #f59e0b;
  }
  .ht-icon {
    font-weight: 800;
    font-size: 12px;
  }
  .ht-sentence.ht-marked .ht-icon { color: #f59e0b; }
  .ht-sentence.ht-state-correct {
    background: rgba(16,185,129,0.16);
    box-shadow: inset 0 -2px 0 var(--success);
  }
  .ht-sentence.ht-state-correct .ht-icon { color: var(--success); }
  .ht-sentence.ht-state-incorrect {
    background: rgba(239,68,68,0.14);
    box-shadow: inset 0 -2px 0 var(--danger);
  }
  .ht-sentence.ht-state-incorrect .ht-icon { color: var(--danger); }
  .ht-sentence.ht-state-missed {
    background: rgba(245,158,11,0.12);
    box-shadow: inset 0 -2px 0 #f59e0b;
    border-bottom: 1px dashed #f59e0b;
  }
  .ht-sentence.ht-state-missed .ht-icon { color: #f59e0b; }
  .ht-popover {
    display: inline-block;
    font-size: 12px;
    color: var(--text-dim);
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 12px;
    margin: 4px 0;
    line-height: 1.5;
  }
  .ht-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    margin-top: 10px;
    font-size: 12px;
    color: var(--text-muted);
    align-items: center;
  }
  .ht-legend-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .ht-legend-hint {
    font-style: italic;
  }
  .ht-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    display: inline-block;
  }
  .ht-dot.ht-state-correct { background: var(--success); }
  .ht-dot.ht-state-incorrect { background: var(--danger); }
  .ht-dot.ht-state-missed { background: #f59e0b; }
  @media (prefers-reduced-motion: reduce) {
    .ht-sentence { transition: none; }
  }
`
