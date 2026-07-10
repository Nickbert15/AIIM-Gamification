'use client'

// Reduced from 6 to 3 categories to match the reference slider's
// three-label layout (Not sure / Fairly sure / Certain) - fewer, clearer
// steps read better on a visual track than six cramped ticks did.
export const CONFIDENCE_LEVELS = [
  { emoji: '😟', label: 'Unsicher' },
  { emoji: '😐', label: 'Mittel' },
  { emoji: '🤩', label: 'Sicher' },
] as const

interface Props {
  value: number // 0..2
  onChange: (value: number) => void
  question?: string
}

// Custom-look slider: a real <input type="range"> handles keyboard, drag and
// screen-reader semantics, but is rendered invisible and overlaid on top of a
// styled track (filled portion + floating ring thumb) drawn from plain divs,
// since cross-browser ::-webkit/::-moz thumb pseudo-elements are unreliable
// to keep in sync with each other.
export default function ConfidenceSlider({ value, onChange, question }: Props) {
  const max = CONFIDENCE_LEVELS.length - 1
  const current = CONFIDENCE_LEVELS[value]
  const pct = (value / max) * 100

  return (
    <>
      <style>{sliderStyles}</style>
      <div className="conf-slider-wrap">
        {question && <div className="conf-slider-question">{question}</div>}
        <div className="conf-slider-current">
          <span className="conf-slider-emoji" aria-hidden="true">{current.emoji}</span>
          <span className="conf-slider-label">{current.label}</span>
        </div>
        <div className="conf-slider-track-wrap">
          <div className="conf-slider-track-bg" aria-hidden="true" />
          <div className="conf-slider-fill" style={{ width: `${pct}%` }} aria-hidden="true" />
          <div className="conf-slider-thumb" style={{ left: `${pct}%` }} aria-hidden="true" />
          <input
            type="range"
            className="conf-slider-input"
            min={0}
            max={max}
            step={1}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            aria-valuetext={current.label}
            aria-label={question ?? 'Wie sicher bist du dir?'}
          />
        </div>
        <div className="conf-slider-labels" aria-hidden="true">
          {CONFIDENCE_LEVELS.map((lvl, i) => (
            <span key={lvl.label} className={`conf-slider-label-item ${i === 1 ? 'mid' : ''}`}>
              <span>{lvl.emoji}</span> {lvl.label}
            </span>
          ))}
        </div>
      </div>
    </>
  )
}

const sliderStyles = `
  .conf-slider-wrap {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .conf-slider-question {
    font-size: 13px;
    color: var(--text-dim);
    line-height: 1.5;
  }
  .conf-slider-current {
    display: flex;
    align-items: center;
    gap: 10px;
    justify-content: center;
  }
  .conf-slider-emoji { font-size: 32px; }
  .conf-slider-label {
    font-size: 16px;
    font-weight: 700;
    color: var(--text);
  }
  .conf-slider-track-wrap {
    position: relative;
    height: 44px;
    display: flex;
    align-items: center;
  }
  .conf-slider-track-bg {
    position: absolute;
    left: 0;
    right: 0;
    height: 10px;
    border-radius: var(--radius-pill);
    background: var(--surface-sunken);
  }
  .conf-slider-fill {
    position: absolute;
    left: 0;
    height: 10px;
    border-radius: var(--radius-pill);
    background: var(--accent-soft);
    transition: width 0.15s ease-out;
  }
  .conf-slider-thumb {
    position: absolute;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: var(--shadow-sm), 0 0 0 4px var(--bg-card);
    transform: translateX(-50%);
    transition: left 0.15s ease-out;
  }
  .conf-slider-input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }
  .conf-slider-input:focus-visible ~ .conf-slider-thumb {
    box-shadow: var(--shadow-sm), 0 0 0 4px var(--bg-card), var(--focus-ring);
  }
  .conf-slider-labels {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: var(--text-muted);
  }
  .conf-slider-label-item { display: inline-flex; align-items: center; gap: 5px; }
  .conf-slider-label-item.mid { font-weight: 600; color: var(--text); }
  @media (prefers-reduced-motion: reduce) {
    .conf-slider-fill, .conf-slider-thumb { transition: none; }
  }
`
