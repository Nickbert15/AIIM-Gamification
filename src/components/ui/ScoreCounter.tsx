'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  value: number
  suffix?: string
  durationMs?: number
  className?: string
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
}

// Counts up from 0 to `value` once on mount/value-change. Jumps straight to
// the final number under reduced-motion instead of animating.
export default function ScoreCounter({ value, suffix = '', durationMs = 900, className }: Props) {
  const [display, setDisplay] = useState(prefersReducedMotion() ? value : 0)
  const rafRef = useRef(0)

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplay(value)
      return
    }
    const start = performance.now()
    const from = 0
    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(1, elapsed / durationMs)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (value - from) * eased))
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, durationMs])

  return (
    <span className={className}>
      {display}
      {suffix}
    </span>
  )
}
