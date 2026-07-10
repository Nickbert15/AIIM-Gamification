'use client'

interface Props {
  label: string
  icon?: string
}

export default function Badge({ label, icon = '🏅' }: Props) {
  return (
    <>
      <style>{badgeStyles}</style>
      <span className="game-badge">
        <span aria-hidden="true">{icon}</span>
        {label}
      </span>
    </>
  )
}

const badgeStyles = `
  .game-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 9999px;
    background: rgba(255,173,0,0.12);
    border: 1px solid rgba(255,173,0,0.35);
    color: var(--accent-text);
    font-size: 13px;
    font-weight: 700;
  }
`
