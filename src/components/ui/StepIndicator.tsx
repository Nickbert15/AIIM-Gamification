'use client'

interface Props {
  steps: string[]
  currentIndex: number
}

export default function StepIndicator({ steps, currentIndex }: Props) {
  return (
    <>
      <style>{stepStyles}</style>
      <div className="step-indicator" role="list" aria-label={`Schritt ${currentIndex + 1} von ${steps.length}`}>
        {steps.map((label, i) => (
          <span key={label} className="step-indicator-item" role="listitem">
            <span
              className={`step-pill ${i === currentIndex ? 'active' : i < currentIndex ? 'done' : ''}`}
            >
              {i + 1}. {label}
            </span>
            {i < steps.length - 1 && <span className="step-arrow" aria-hidden="true">→</span>}
          </span>
        ))}
      </div>
    </>
  )
}

const stepStyles = `
  .step-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    flex-wrap: wrap;
  }
  .step-indicator-item {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .step-pill {
    padding: 5px 12px;
    border-radius: 9999px;
    border: 1px solid var(--border);
    color: var(--text-muted);
    font-weight: 600;
    transition: border-color 0.2s ease, color 0.2s ease, background-color 0.2s ease;
  }
  .step-pill.active {
    border-color: var(--accent);
    color: var(--accent);
    background: rgba(14,165,233,0.08);
  }
  .step-pill.done {
    border-color: var(--success);
    color: var(--success);
  }
  .step-arrow { color: var(--border); }
  @media (prefers-reduced-motion: reduce) {
    .step-pill { transition: none; }
  }
`
