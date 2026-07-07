function hueFromName(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360
  return h
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? '?'
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

export default function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const h = hueFromName(name || '?')
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        background: `linear-gradient(135deg, hsl(${h} 60% 48%), hsl(${(h + 45) % 360} 60% 34%))`,
      }}
      aria-hidden
    >
      {initials(name || '?')}
    </div>
  )
}
