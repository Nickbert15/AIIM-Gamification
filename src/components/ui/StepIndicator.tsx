'use client'

import { Check } from 'lucide-react'

interface Props {
  steps: string[]
  currentIndex: number
}

export default function StepIndicator({ steps, currentIndex }: Props) {
  return (
    <>
      <style>{stepStyles}</style>
      <div className="step-indicator" role="list" aria-label={`Schritt ${currentIndex + 1} von ${steps.length}`}>
        {steps.map((label, i) => {
          const state = i === currentIndex ? 'active' : i < currentIndex ? 'done' : 'upcoming'
          return (
            <span key={label} className="step-indicator-item" role="listitem">
              <span className="step-indicator-group">
                <span className={`step-circle step-circle-${state}`}>
                  {state === 'done' ? <Check size={14} strokeWidth={3} /> : i + 1}
                </span>
                <span className={`step-label step-label-${state}`}>{label}</span>
              </span>
              {i < steps.length - 1 && <span className="step-connector" aria-hidden="true" />}
            </span>
          )
        })}
      </div>
    </>
  )
}

const stepStyles = `
  .step-indicator {
    display: flex;
    align-items: center;
    font-size: 12px;
    flex-wrap: wrap;
  }
  .step-indicator-item {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
  }
  .step-indicator-group {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    flex-shrink: 0;
  }
  .step-circle {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-pill);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-head);
    font-weight: 700;
    font-size: 13px;
    flex-shrink: 0;
    transition: background-color 0.2s ease-out, color 0.2s ease-out;
  }
  .step-circle-active { background: var(--accent); color: #fff; }
  .step-circle-done { background: var(--success); color: #fff; }
  .step-circle-upcoming { background: var(--surface-sunken); color: var(--text-muted); }
  .step-label { font-size: 14px; white-space: nowrap; }
  .step-label-active { font-weight: 600; color: var(--text); }
  .step-label-done { font-weight: 600; color: var(--text); }
  .step-label-upcoming { font-weight: 500; color: var(--text-muted); }
  .step-connector {
    flex: 1;
    height: 2px;
    background: var(--border);
    margin: 0 16px;
    max-width: 80px;
  }
  @media (prefers-reduced-motion: reduce) {
    .step-circle { transition: none; }
  }
`
