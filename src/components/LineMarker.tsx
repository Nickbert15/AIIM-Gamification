'use client'

// Unused since HallucinationSpotterPlayerV2 switched to the flowing-text
// HallucinationText component (src/components/ui/HallucinationText.tsx).
// Kept around rather than deleted in case a future numbered-line game format
// wants it back.

interface Line {
  id: number
  text: string
}

interface Props {
  lines: Line[]
  markedIds: Set<number>
  onToggle: (id: number) => void
  disabled?: boolean
  revealCorrect?: Set<number>
}

export default function LineMarker({ lines, markedIds, onToggle, disabled, revealCorrect }: Props) {
  const revealed = revealCorrect !== undefined

  function stateFor(id: number): 'correct' | 'incorrect' | 'missed' | 'neutral' | null {
    if (!revealed) return null
    const isMarked = markedIds.has(id)
    const isActuallyTrue = revealCorrect!.has(id)
    if (isMarked && isActuallyTrue) return 'correct'
    if (isMarked && !isActuallyTrue) return 'incorrect'
    if (!isMarked && isActuallyTrue) return 'missed'
    return 'neutral'
  }

  return (
    <>
      <style>{lmStyles}</style>
      <div className="lm-list">
        {lines.map((line, i) => {
          const isMarked = markedIds.has(line.id)
          const state = stateFor(line.id)
          const classes = ['lm-line']
          if (isMarked) classes.push('lm-marked')
          if (disabled || revealed) classes.push('lm-static')
          if (state) classes.push(`lm-state-${state}`)

          return (
            <button
              key={line.id}
              type="button"
              className={classes.join(' ')}
              onClick={() => !disabled && !revealed && onToggle(line.id)}
              disabled={disabled || revealed}
            >
              <span className="lm-index">{i + 1}</span>
              <span className="lm-text">{line.text}</span>
              <span className="lm-marker-icon" aria-hidden="true">
                {state === 'correct' && '✓'}
                {state === 'incorrect' && '✗'}
                {state === 'missed' && '⚠'}
                {!state && isMarked && '✎'}
              </span>
            </button>
          )
        })}
      </div>
      {revealed && (
        <div className="lm-legend">
          <span className="lm-legend-item"><span className="lm-dot lm-state-correct" /> Richtig erkannt</span>
          <span className="lm-legend-item"><span className="lm-dot lm-state-incorrect" /> Falsch markiert</span>
          <span className="lm-legend-item"><span className="lm-dot lm-state-missed" /> Übersehen</span>
        </div>
      )}
    </>
  )
}

const lmStyles = `
  .lm-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .lm-line {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    width: 100%;
    text-align: left;
    padding: 12px 14px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    cursor: pointer;
    font-size: 14px;
    font-family: inherit;
    line-height: 1.55;
    transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.1s ease;
  }
  .lm-line:hover:not(.lm-static) {
    border-color: var(--accent);
    background: rgba(14,165,233,0.06);
  }
  .lm-line:active:not(.lm-static) {
    transform: scale(0.997);
  }
  .lm-line.lm-static {
    cursor: default;
  }
  .lm-index {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--border);
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 1px;
    transition: background-color 0.15s ease, color 0.15s ease;
  }
  .lm-text {
    flex: 1;
  }
  .lm-marker-icon {
    flex-shrink: 0;
    width: 18px;
    font-size: 13px;
    font-weight: 700;
    text-align: center;
    margin-top: 1px;
  }
  .lm-line.lm-marked {
    border-color: #f59e0b;
    background: rgba(245,158,11,0.08);
  }
  .lm-line.lm-marked .lm-index {
    background: #f59e0b;
    color: #fff;
  }
  .lm-line.lm-marked .lm-marker-icon {
    color: #f59e0b;
  }
  .lm-line.lm-state-correct {
    border-color: var(--success);
    background: rgba(16,185,129,0.1);
    animation: lm-pulse-correct 0.9s ease;
  }
  .lm-line.lm-state-correct .lm-marker-icon { color: var(--success); }
  .lm-line.lm-state-incorrect {
    border-color: var(--danger);
    background: rgba(239,68,68,0.08);
    animation: lm-pulse-incorrect 0.9s ease;
  }
  .lm-line.lm-state-incorrect .lm-marker-icon { color: var(--danger); }
  .lm-line.lm-state-missed {
    border-color: #f59e0b;
    background: rgba(245,158,11,0.06);
    border-style: dashed;
    animation: lm-pulse-missed 0.9s ease;
  }
  .lm-line.lm-state-missed .lm-marker-icon { color: #f59e0b; }
  @keyframes lm-pulse-correct {
    0% { background: rgba(16,185,129,0.5); }
    100% { background: rgba(16,185,129,0.1); }
  }
  @keyframes lm-pulse-incorrect {
    0% { background: rgba(239,68,68,0.4); }
    100% { background: rgba(239,68,68,0.08); }
  }
  @keyframes lm-pulse-missed {
    0% { background: rgba(245,158,11,0.35); }
    100% { background: rgba(245,158,11,0.06); }
  }
  @media (prefers-reduced-motion: reduce) {
    .lm-line.lm-state-correct, .lm-line.lm-state-incorrect, .lm-line.lm-state-missed {
      animation: none;
    }
  }
  .lm-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    margin-top: 10px;
    font-size: 12px;
    color: var(--text-muted);
  }
  .lm-legend-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .lm-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    display: inline-block;
  }
  .lm-dot.lm-state-correct { background: var(--success); }
  .lm-dot.lm-state-incorrect { background: var(--danger); }
  .lm-dot.lm-state-missed { background: #f59e0b; }
`
