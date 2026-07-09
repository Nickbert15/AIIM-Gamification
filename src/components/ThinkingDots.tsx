'use client'

interface Props {
  label: string
}

export default function ThinkingDots({ label }: Props) {
  return (
    <>
      <style>{dotsStyles}</style>
      <div className="td-row">
        <span>{label}</span>
        <span className="td-dots" aria-hidden="true"><span /><span /><span /></span>
      </div>
    </>
  )
}

const dotsStyles = `
  .td-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: var(--text-muted);
    font-size: 13px;
  }
  .td-dots {
    display: inline-flex;
    gap: 3px;
  }
  .td-dots span {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--accent);
    animation: td-dot-pulse 1.1s infinite ease-in-out;
  }
  .td-dots span:nth-child(2) { animation-delay: 0.15s; }
  .td-dots span:nth-child(3) { animation-delay: 0.3s; }
  @keyframes td-dot-pulse {
    0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
    40% { opacity: 1; transform: scale(1); }
  }
  @media (prefers-reduced-motion: reduce) {
    .td-dots span { animation: none; opacity: 0.7; }
  }
`
