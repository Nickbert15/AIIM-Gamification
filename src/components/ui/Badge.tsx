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
    background: rgba(245,158,11,0.12);
    border: 1px solid rgba(245,158,11,0.35);
    color: #f59e0b;
    font-size: 13px;
    font-weight: 700;
  }
`
