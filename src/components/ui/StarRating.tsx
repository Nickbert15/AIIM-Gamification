'use client'

import { Star } from 'lucide-react'

interface Props {
  stars: number
  max?: number
  label?: string
}

export default function StarRating({ stars, max = 3, label }: Props) {
  return (
    <>
      <style>{starStyles}</style>
      <div className="star-rating" role="img" aria-label={label ?? `${stars} von ${max} Sternen`}>
        {Array.from({ length: max }, (_, i) => (
          <Star
            key={i}
            size={24}
            strokeWidth={1.75}
            className={i < stars ? 'star-filled' : 'star-empty'}
            fill={i < stars ? 'currentColor' : 'none'}
            aria-hidden="true"
          />
        ))}
      </div>
    </>
  )
}

const starStyles = `
  .star-rating {
    display: inline-flex;
    gap: 4px;
    line-height: 1;
  }
  .star-filled { color: var(--lh-yellow); }
  .star-empty { color: var(--border-strong); }
`
