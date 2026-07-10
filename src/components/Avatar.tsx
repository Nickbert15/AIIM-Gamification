// A small curated set of on-brand duotone gradients (navy, slate, gold,
// forest, wine, steel) instead of a full 360° hue rotation — keeps every
// avatar distinguishable while staying inside the Lufthansa palette family
// rather than landing on arbitrary saturated rainbow colors.
const PALETTE: [string, string][] = [
  ['#0B2E7A', '#05164D'],
  ['#55617A', '#323B4D'],
  ['#C77700', '#8A5300'],
  ['#1E7A46', '#145E36'],
  ['#7A2B4A', '#4D1B30'],
  ['#3B4A63', '#232C3D'],
  ['#1D6E8C', '#134A5C'],
  ['#8A6D1E', '#5C4813'],
]

// FNV-1a-style mix: small edit-distance names (e.g. "Player One" vs
// "Player Two") still land on different buckets, unlike a plain
// polynomial hash where similar strings can collide.
function paletteIndexFromName(name: string) {
  let h = 2166136261
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h) % PALETTE.length
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? '?'
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

export default function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const [c1, c2] = PALETTE[paletteIndexFromName(name || '?')]
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
      }}
      aria-hidden
    >
      {initials(name || '?')}
    </div>
  )
}
