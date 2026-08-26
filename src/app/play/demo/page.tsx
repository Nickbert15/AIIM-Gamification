'use client'

import BranchingGamePlayer from '@/components/BranchingGamePlayer'
import { promptNavigatorDemoGame } from '@/content/promptNavigatorDemo'

// Local version of the Prompt Navigator ("Der CFO wartet") decoupled from
// Supabase/LLM. Renders BranchingGamePlayer directly with a sample dataset
// maintained in code (src/content/promptNavigatorDemo.ts) — ideal for testing
// without creating real game records in Supabase.
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
