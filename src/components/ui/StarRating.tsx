'use client'

interface Props {
  stars: 0 | 1 | 2 | 3
  max?: number
  label?: string
}

export default function StarRating({ stars, max = 3, label }: Props) {
  return (
    <>
      <style>{starStyles}</style>
      <div className="star-rating" role="img" aria-label={label ?? `${stars} von ${max} Sternen`}>
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={`star ${i < stars ? 'star-filled' : 'star-empty'}`} aria-hidden="true">
            ★
          </span>
        ))}
      </div>
    </>
  )
}

const starStyles = `
  .star-rating {
    display: inline-flex;
    gap: 4px;
    font-size: 24px;
    line-height: 1;
  }
  .star-filled { color: #f59e0b; }
  .star-empty { color: var(--border); }
`
