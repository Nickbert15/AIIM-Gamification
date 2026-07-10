'use client'

import { Award, LucideIcon } from 'lucide-react'

interface Props {
  label: string
  icon?: LucideIcon
}

export default function Badge({ label, icon: Icon = Award }: Props) {
  return (
    <>
      <style>{badgeStyles}</style>
      <span className="game-badge">
        <Icon size={14} strokeWidth={2.25} aria-hidden="true" />
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
    border-radius: var(--radius-pill);
    background: var(--lh-yellow-soft);
    border: none;
    color: var(--lh-yellow-ink);
    font-size: 13px;
    font-weight: 700;
  }
`
