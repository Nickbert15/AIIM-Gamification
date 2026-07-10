'use client'

import GamePopup from './GamePopup'

interface StepItem {
  icon: string
  text: string
}

interface Props {
  open: boolean
  title: string
  termExplanation?: string
  steps: StepItem[]
  onDismiss: () => void
}

// First-run onboarding overlay. Shown once per game session before any
// gameplay happens, so a player with zero AI background sees the core term
// explained and the steps laid out before being asked to do anything.
export default function HowToPlay({ open, title, termExplanation, steps, onDismiss }: Props) {
  return (
    <GamePopup open={open} title={title} onClose={onDismiss}>
      <style>{htpStyles}</style>
      {termExplanation && <p className="htp-term">{termExplanation}</p>}
      <ol className="htp-steps">
        {steps.map((s, i) => (
          <li key={i} className="htp-step">
            <span className="htp-step-icon" aria-hidden="true">{s.icon}</span>
            <span className="htp-step-text">{s.text}</span>
          </li>
        ))}
      </ol>
      <div className="htp-actions">
        <button className="btn btn-primary" onClick={onDismiss} autoFocus>
          Verstanden, los geht's!
        </button>
      </div>
    </GamePopup>
  )
}

const htpStyles = `
  .htp-term {
    font-size: 13px;
    color: var(--text-dim);
    line-height: 1.6;
    background: rgba(255,173,0,0.05);
    border: 1px solid rgba(255,173,0,0.2);
    border-radius: var(--radius);
    padding: 12px 14px;
    margin: 0;
  }
  .htp-steps {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .htp-step {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    font-size: 13px;
    color: var(--text);
    line-height: 1.5;
  }
  .htp-step-icon {
    flex-shrink: 0;
    font-size: 20px;
    width: 28px;
    text-align: center;
  }
  .htp-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 4px;
  }
`
