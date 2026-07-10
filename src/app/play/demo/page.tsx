'use client'

import BranchingGamePlayer from '@/components/BranchingGamePlayer'
import { promptNavigatorDemoGame } from '@/content/promptNavigatorDemo'

// Lokale, von Supabase/LLM entkoppelte Version des Prompt-Navigators ("Der CFO
// wartet"). Rendert BranchingGamePlayer direkt mit einem im Code gepflegten
// Beispiel-Datensatz (src/content/promptNavigatorDemo.ts) — ideal zum Testen,
// ohne echte Spiele-Datensätze in Supabase anzulegen.
export default function LocalDemoPage() {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px 0' }}>
          <div className="card-title">{promptNavigatorDemoGame.title}</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Prompt-Navigator · lokale Testversion mit Beispieldaten, nicht an Supabase angebunden
          </p>
        </div>
        <BranchingGamePlayer game={promptNavigatorDemoGame} onComplete={() => {}} />
      </div>
    </div>
  )
}
