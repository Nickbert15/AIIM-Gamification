'use client'

// Sibling to ConfettiBurst, but a distinct motion language: instead of
// falling rectangles, this radiates outward from a fixed point - expanding
// rings plus a handful of twinkling sparkle dots - which reads as "shine
// around a medal" rather than "confetti falling from above". Used for
// Prompt Arena's final screen so it doesn't feel like a re-skinned copy of
// Hallucination Spotter's result popup.
export default function SparkleBurst() {
  return (
    <>
      <style>{sparkleStyles}</style>
      <div className="sparkle-burst" aria-hidden="true">
        <span className="sparkle-ring sparkle-ring-1" />
        <span className="sparkle-ring sparkle-ring-2" />
        <span className="sparkle-ring sparkle-ring-3" />
        {SPARKLE_POSITIONS.map((pos, i) => (
          <span
            key={i}
            className="sparkle-dot"
            style={{ left: pos.left, top: pos.top, animationDelay: `${pos.delay}s` }}
          />
        ))}
      </div>
    </>
  )
}

const SPARKLE_POSITIONS = [
  { left: '18%', top: '20%', delay: 0 },
  { left: '82%', top: '15%', delay: 0.25 },
  { left: '12%', top: '65%', delay: 0.5 },
  { left: '88%', top: '60%', delay: 0.15 },
  { left: '50%', top: '8%', delay: 0.4 },
  { left: '30%', top: '85%', delay: 0.6 },
  { left: '70%', top: '88%', delay: 0.3 },
]

const sparkleStyles = `
  .sparkle-burst {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
    z-index: 0;
  }
  .sparkle-ring {
    position: absolute;
    left: 50%;
    top: 38%;
    width: 60px;
    height: 60px;
    margin: -30px 0 0 -30px;
    border-radius: 50%;
    border: 2px solid var(--lh-yellow);
    opacity: 0;
    animation: sparkle-ring-expand 1.6s ease-out both;
  }
  .sparkle-ring-2 { animation-delay: 0.25s; border-color: var(--accent); }
  .sparkle-ring-3 { animation-delay: 0.5s; }
  @keyframes sparkle-ring-expand {
    0% { transform: scale(0.3); opacity: 0.6; }
    100% { transform: scale(3.2); opacity: 0; }
  }
  .sparkle-dot {
    position: absolute;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--lh-yellow);
    box-shadow: 0 0 6px 1px rgba(255,184,28,.7);
    opacity: 0;
    animation: sparkle-twinkle 1.8s ease-in-out infinite;
  }
  @keyframes sparkle-twinkle {
    0%, 100% { opacity: 0; transform: scale(0.4) translateY(0); }
    30% { opacity: 1; transform: scale(1.1) translateY(-4px); }
    60% { opacity: 0.4; transform: scale(0.8) translateY(-8px); }
  }
  @media (prefers-reduced-motion: reduce) {
    .sparkle-ring, .sparkle-dot { animation: none; opacity: 0; }
  }
`
