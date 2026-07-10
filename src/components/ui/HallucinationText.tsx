'use client'

import { useState } from 'react'
import { Flag, Check, Info, AlertTriangle } from 'lucide-react'

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
                {!revealMode && isMarked && <Flag className="ht-icon" size={12} strokeWidth={2.5} fill="currentColor" aria-hidden="true" />}
                {state === 'correct' && <Check className="ht-icon" size={13} strokeWidth={2.75} aria-hidden="true" />}
                {state === 'incorrect' && <Info className="ht-icon" size={13} strokeWidth={2.5} aria-hidden="true" />}
                {state === 'missed' && <AlertTriangle className="ht-icon" size={13} strokeWidth={2.5} aria-hidden="true" />}
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
      {revealMode ? (
        <div className="ht-legend">
          <span className="ht-legend-item"><span className="ht-dot ht-state-correct" /> Richtig erkannt</span>
          <span className="ht-legend-item"><span className="ht-dot ht-state-incorrect" /> Fälschlich markiert</span>
          <span className="ht-legend-item"><span className="ht-dot ht-state-missed" /> Übersehen</span>
          <span className="ht-legend-hint">Klicke einen Satz für die Erklärung ("Warum?").</span>
        </div>
      ) : (
        <div className="ht-legend">
          <span className="ht-legend-swatch-item"><span className="ht-swatch ht-swatch-marked" /> markiert</span>
          <span className="ht-legend-swatch-item"><span className="ht-swatch ht-swatch-hovered" /> hervorgehoben</span>
        </div>
      )}
    </>
  )
}

const htStyles = `
  .ht-passage {
    font-size: 18px;
    line-height: 1.85;
    color: var(--text);
    background: var(--bg-card);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-sm);
    border-radius: var(--radius);
    padding: 34px 38px;
    max-width: 66ch;
  }
  .ht-sentence-wrap { display: inline; }
  .ht-sentence {
    cursor: pointer;
    border-radius: 4px;
    padding: 1px 2px;
    transition: background-color 0.2s ease-out, box-shadow 0.2s ease-out;
    outline-offset: 2px;
  }
  .ht-sentence:hover, .ht-sentence.ht-hovered {
    background: var(--lh-yellow-soft);
    box-shadow: inset 0 0 0 1px var(--lh-yellow);
  }
  .ht-sentence:focus-visible {
    outline: none;
    box-shadow: var(--focus-ring);
  }
  .ht-sentence.ht-marked {
    background: var(--accent-soft);
    box-shadow: inset 0 -2px 0 var(--accent);
  }
  .ht-icon {
    display: inline-block;
    vertical-align: -1px;
    margin-left: 4px;
  }
  .ht-sentence.ht-marked .ht-icon { color: var(--accent-ink); }
  /* Caught: a suspected sentence that really was made up. */
  .ht-sentence.ht-state-correct {
    background: var(--success-soft);
    box-shadow: inset 0 -2px 0 var(--success);
  }
  .ht-sentence.ht-state-correct .ht-icon { color: var(--success-ink); }
  /* False flag: marked, but the sentence was actually true. Deliberately
     neutral/muted, not red — this is a learning game, not an error state. */
  .ht-sentence.ht-state-incorrect {
    background: none;
    box-shadow: none;
    text-decoration: underline;
    text-decoration-color: var(--text-muted);
    text-decoration-style: dotted;
    text-underline-offset: 4px;
  }
  .ht-sentence.ht-state-incorrect .ht-icon {
    color: var(--text-muted);
    display: inline-flex;
    width: 16px;
    height: 16px;
    border-radius: var(--radius-pill);
    background: var(--surface-sunken);
    align-items: center;
    justify-content: center;
    vertical-align: -3px;
    padding: 2px;
  }
  /* Missed: an actual hallucination the player didn't flag. Amber, distinct
     from Crane Yellow, and not red — a missed answer isn't an "error". */
  .ht-sentence.ht-state-missed {
    background: none;
    box-shadow: none;
    text-decoration: underline;
    text-decoration-color: var(--attention);
    text-decoration-style: dotted;
    text-underline-offset: 4px;
  }
  .ht-sentence.ht-state-missed .ht-icon { color: var(--attention-ink); }
  .ht-popover {
    display: inline-block;
    font-size: 15px;
    color: var(--text-dim);
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-top: 3px solid var(--lh-yellow);
    border-radius: var(--radius);
    box-shadow: var(--shadow-md);
    padding: 12px 16px;
    margin: 6px 0;
    line-height: 1.6;
  }
  .ht-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 20px;
    font-size: 14px;
    color: var(--text-dim);
    align-items: center;
  }
  .ht-legend-item {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border-radius: var(--radius-pill);
    background: var(--surface-sunken);
  }
  .ht-legend-item:nth-child(1) { background: var(--success-soft); color: var(--success-ink); }
  .ht-legend-item:nth-child(2) { background: var(--surface-sunken); color: var(--text-dim); }
  .ht-legend-item:nth-child(3) { background: var(--attention-soft); color: var(--attention-ink); }
  .ht-legend-hint {
    font-style: italic;
    color: var(--text-muted);
  }
  .ht-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    display: inline-block;
  }
  .ht-dot.ht-state-correct { background: var(--success); }
  .ht-dot.ht-state-incorrect { background: var(--text-muted); }
  .ht-dot.ht-state-missed { background: var(--attention); }
  .ht-legend-swatch-item {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 14px;
    color: var(--text-muted);
  }
  .ht-swatch {
    width: 16px;
    height: 16px;
    border-radius: 4px;
    display: inline-block;
  }
  .ht-swatch-marked { background: var(--accent-soft); box-shadow: inset 0 -2px 0 var(--accent); }
  .ht-swatch-hovered { background: var(--lh-yellow-soft); box-shadow: inset 0 0 0 1px var(--lh-yellow); }
  @media (prefers-reduced-motion: reduce) {
    .ht-sentence { transition: none; }
  }
`
