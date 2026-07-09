'use client'

import { useRef } from 'react'

export const CONFIDENCE_LEVELS = [
  { emoji: '😟', label: 'Sehr unsicher' },
  { emoji: '🙁', label: 'Unsicher' },
  { emoji: '😐', label: 'Eher unsicher' },
  { emoji: '🙂', label: 'Eher sicher' },
  { emoji: '😀', label: 'Sicher' },
  { emoji: '🤩', label: 'Sehr sicher' },
] as const

interface Props {
  value: number // 0..5
  onChange: (value: number) => void
  question?: string
}

// Discrete 6-step slider. Built as a styled native range input so keyboard
// (arrow keys, Home/End, Page Up/Down) and touch drag work for free, with
// role/aria-valuetext layered on for screen readers announcing the label
// instead of a bare number.
export default function ConfidenceSlider({ value, onChange, question }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const current = CONFIDENCE_LEVELS[value]

  return (
    <>
      <style>{sliderStyles}</style>
      <div className="conf-slider-wrap">
        {question && <div className="conf-slider-question">{question}</div>}
        <div className="conf-slider-current">
          <span className="conf-slider-emoji" aria-hidden="true">{current.emoji}</span>
          <span className="conf-slider-label">{current.label}</span>
        </div>
        <div ref={trackRef} className="conf-slider-track">
          <input
            type="range"
            className="conf-slider-input"
            min={0}
            max={CONFIDENCE_LEVELS.length - 1}
            step={1}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={CONFIDENCE_LEVELS.length - 1}
            aria-valuenow={value}
            aria-valuetext={current.label}
            aria-label={question ?? 'Wie sicher bist du dir?'}
          />
        </div>
        <div className="conf-slider-ticks" aria-hidden="true">
          {CONFIDENCE_LEVELS.map((lvl, i) => (
            <span key={lvl.label} className={`conf-slider-tick ${i === value ? 'active' : ''}`}>
              {lvl.emoji}
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
    gap: 10px;
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
  .conf-slider-track {
    position: relative;
    padding: 4px 0;
  }
  .conf-slider-input {
    width: 100%;
    accent-color: var(--accent);
    height: 44px;
    cursor: pointer;
  }
  .conf-slider-ticks {
    display: flex;
    justify-content: space-between;
    font-size: 15px;
    padding: 0 6px;
  }
  .conf-slider-tick { opacity: 0.35; transition: opacity 0.15s ease; }
  .conf-slider-tick.active { opacity: 1; }
  @media (prefers-reduced-motion: reduce) {
    .conf-slider-tick { transition: none; }
  }
`
