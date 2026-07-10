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
  { left: '14%', top: '18%', delay: 0 },
  { left: '86%', top: '14%', delay: 0.3 },
  { left: '8%', top: '62%', delay: 0.6 },
  { left: '92%', top: '58%', delay: 0.15 },
  { left: '50%', top: '4%', delay: 0.45 },
  { left: '24%', top: '86%', delay: 0.75 },
  { left: '76%', top: '90%', delay: 0.3 },
  { left: '38%', top: '30%', delay: 0.9 },
  { left: '64%', top: '34%', delay: 1.05 },
]

const sparkleStyles = `
  .sparkle-burst {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }
  .sparkle-ring {
    position: absolute;
    left: 50%;
    top: 38%;
    width: 90px;
    height: 90px;
    margin: -45px 0 0 -45px;
    border-radius: 50%;
    border: 3px solid var(--lh-yellow);
    opacity: 0;
    animation: sparkle-ring-expand 1.8s ease-out 2;
  }
  .sparkle-ring-2 { animation-delay: 0.3s; border-color: var(--accent); }
  .sparkle-ring-3 { animation-delay: 0.6s; }
  @keyframes sparkle-ring-expand {
    0% { transform: scale(0.3); opacity: 0.9; }
    100% { transform: scale(3.6); opacity: 0; }
  }
  .sparkle-dot {
    position: absolute;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--lh-yellow);
    box-shadow: 0 0 10px 2px rgba(255,184,28,.8);
    opacity: 0;
    animation: sparkle-twinkle 2s ease-in-out infinite;
  }
  @keyframes sparkle-twinkle {
    0%, 100% { opacity: 0; transform: scale(0.4) translateY(0); }
    35% { opacity: 1; transform: scale(1.3) translateY(-6px); }
    65% { opacity: 0.5; transform: scale(0.9) translateY(-12px); }
  }
  @media (prefers-reduced-motion: reduce) {
    .sparkle-ring, .sparkle-dot { animation: none; opacity: 0; }
  }
`
