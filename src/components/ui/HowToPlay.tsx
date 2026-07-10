'use client'

import GamePopup from './GamePopup'

interface StepItem {
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
            <span className="htp-step-number" aria-hidden="true">{i + 1}</span>
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
    background: var(--accent-soft);
    border: none;
    border-radius: var(--radius);
    padding: 12px 14px;
    margin: 0;
  }
  .htp-steps {
    display: flex;
    flex-direction: column;
    gap: 14px;
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
  .htp-step-number {
    flex-shrink: 0;
    width: 26px;
    height: 26px;
    border-radius: var(--radius-pill);
    background: var(--accent);
    color: #fff;
    font-family: var(--font-head);
    font-weight: 700;
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .htp-step-text { padding-top: 3px; }
  .htp-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 4px;
  }
`
