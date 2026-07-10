'use client'

import { useEffect, useRef } from 'react'

interface Props {
  intensity?: 'low' | 'high'
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
}

const COLORS = ['#FFAD00', '#FBBB04', '#0A1D3D', '#DCDCDC', '#3B5C8F']

// Self-built canvas confetti (no npm package): a one-shot burst of falling,
// rotating rectangles that fades out on its own. Skipped entirely under
// prefers-reduced-motion instead of running a static/neutered version, since
// there is no "reduced" form of confetti that still serves its purpose.
export default function ConfettiBurst({ intensity = 'high' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (prefersReducedMotion()) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    const count = intensity === 'high' ? 70 : 30
    const pieces = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: -20 - Math.random() * height * 0.4,
      w: 5 + Math.random() * 5,
      h: 8 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      speedY: 2 + Math.random() * 2.5,
      speedX: (Math.random() - 0.5) * 2,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
    }))

    let frame = 0
    const maxFrames = 130
    let raf = 0

    function tick() {
      if (!ctx) return
      frame += 1
      ctx.clearRect(0, 0, width, height)
      const fadeStart = 90
      const opacity = frame > fadeStart ? Math.max(0, 1 - (frame - fadeStart) / (maxFrames - fadeStart)) : 1

      for (const p of pieces) {
        p.y += p.speedY
        p.x += p.speedX
        p.rotation += p.rotationSpeed
        ctx.save()
        ctx.globalAlpha = opacity
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      }

      if (frame < maxFrames) {
        raf = requestAnimationFrame(tick)
      } else {
        ctx.clearRect(0, 0, width, height)
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [intensity])

  if (prefersReducedMotion()) return null

  return (
    <>
      <style>{confettiStyles}</style>
      <canvas ref={canvasRef} aria-hidden="true" className="confetti-burst-canvas" />
    </>
  )
}

const confettiStyles = `
  .confetti-burst-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 5;
  }
`
