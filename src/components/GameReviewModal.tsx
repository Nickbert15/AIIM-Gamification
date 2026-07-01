'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Game } from '@/types/game'

interface Props {
  game: Game | null
  onClose: () => void
  onStatusChange: (id: string, status: string) => void
}

export default function GameReviewModal({ game, onClose, onStatusChange }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!game) return null

  async function handleStatus(status: 'approved' | 'rejected') {
    if (!game) return
    setLoading(true)
    setError(null)
    try {
      const { error: dbError } = await supabase
        .from('games')
        .update({ status })
        .eq('id', game.id)
      if (dbError) throw dbError
      onStatusChange(game.id, status)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        .grm-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }
        .grm-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          width: 100%;
          max-width: 680px;
          max-height: 90vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .grm-header {
          padding: 20px 24px 16px;
          border-bottom: 1px solid var(--border);
          position: sticky;
          top: 0;
          background: var(--bg-card);
          z-index: 1;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .grm-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
          margin: 0;
          line-height: 1.4;
        }
        .grm-close {
          background: none;
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
          padding: 4px 10px;
          flex-shrink: 0;
          font-family: inherit;
        }
        .grm-close:hover { color: var(--text); border-color: var(--accent); }
        .grm-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 22px;
          flex: 1;
        }
        .grm-section-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--text-muted);
          margin: 0 0 10px;
        }
        .grm-objective {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 14px 16px;
          font-size: 14px;
          color: var(--text);
          line-height: 1.6;
        }
        .grm-meta-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 8px;
        }
        .grm-meta-item {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 10px 12px;
        }
        .grm-meta-label {
          font-size: 11px;
          color: var(--text-muted);
          margin-bottom: 3px;
        }
        .grm-meta-value {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
        }
        .grm-question-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .grm-question-item {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 14px 16px;
        }
        .grm-q-text {
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 8px;
          line-height: 1.4;
        }
        .grm-q-answer {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          font-size: 13px;
          color: var(--success);
          margin-bottom: 6px;
        }
        .grm-q-explanation {
          font-size: 13px;
          color: var(--text-dim);
          line-height: 1.5;
        }
        .grm-attribution {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 12px 16px;
          font-size: 12px;
          color: var(--text-muted);
          font-family: monospace;
          white-space: pre-wrap;
          word-break: break-all;
        }
        .grm-footer {
          padding: 16px 24px;
          border-top: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          position: sticky;
          bottom: 0;
          background: var(--bg-card);
        }
        .grm-error {
          font-size: 13px;
          color: var(--danger);
          margin-right: auto;
        }
      `}</style>

      <div
        className="grm-overlay"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="grm-card">
          <div className="grm-header">
            <h2 className="grm-title">Review: {game.title}</h2>
            <button className="grm-close" onClick={onClose}>×</button>
          </div>

          <div className="grm-body">
            {game.learning_objective && (
              <div>
                <p className="grm-section-title">Lernziel</p>
                <div className="grm-objective">{game.learning_objective}</div>
              </div>
            )}

            <div>
              <p className="grm-section-title">Metadaten</p>
              <div className="grm-meta-grid">
                {([
                  { label: 'Thema', value: game.topic },
                  { label: 'Zielrolle', value: game.target_role },
                  { label: 'Schwierigkeit', value: game.difficulty },
                  { label: 'Persona', value: game.persona_key },
                  { label: 'Format', value: game.format },
                  { label: 'Sprache', value: game.language },
                ] as { label: string; value: string | null }[])
                  .filter(m => m.value)
                  .map(m => (
                    <div key={m.label} className="grm-meta-item">
                      <div className="grm-meta-label">{m.label}</div>
                      <div className="grm-meta-value">{m.value}</div>
                    </div>
                  ))}
              </div>
            </div>

            {game.game_json.questions && (
              <div>
                <p className="grm-section-title">Fragen ({game.game_json.questions.length})</p>
                <div className="grm-question-list">
                  {game.game_json.questions.map((q, i) => {
                    const correctOption = q.options.find(o => o.id === q.correctAnswer)
                    return (
                      <div key={q.id} className="grm-question-item">
                        <div className="grm-q-text">{i + 1}. {q.question}</div>
                        <div className="grm-q-answer">
                          <span>✓</span>
                          <span>{correctOption?.text ?? q.correctAnswer}</span>
                        </div>
                        {q.explanation && (
                          <div className="grm-q-explanation">{q.explanation}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {game.game_json.statements && (
              <div>
                <p className="grm-section-title">Aussagen ({game.game_json.statements.length})</p>
                <div className="grm-question-list">
                  {game.game_json.statements.map((s, i) => (
                    <div key={s.id} className="grm-question-item">
                      <div className="grm-q-text">{i + 1}. {s.text}</div>
                      <div className="grm-q-answer" style={{ color: s.isHallucination ? 'var(--danger)' : 'var(--success)' }}>
                        <span>{s.isHallucination ? '⚠' : '✓'}</span>
                        <span>{s.isHallucination ? 'Halluzination' : 'Fakt'}</span>
                      </div>
                      {s.explanation && (
                        <div className="grm-q-explanation">{s.explanation}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {game.game_json.cases && (
              <div>
                <p className="grm-section-title">Fälle ({game.game_json.cases.length})</p>
                <div className="grm-question-list">
                  {game.game_json.cases.map((c, i) => (
                    <div key={c.id} className="grm-question-item">
                      <div className="grm-q-text">{i + 1}. {c.prompt}</div>
                      <div className="grm-q-answer">
                        <span>✓</span>
                        <span>Bessere Antwort: {c.betterResponse}</span>
                      </div>
                      {c.explanation && (
                        <div className="grm-q-explanation">{c.explanation}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {game.source_attribution && (
              <div>
                <p className="grm-section-title">Quellennachweis</p>
                <div className="grm-attribution">
                  {JSON.stringify(game.source_attribution, null, 2)}
                </div>
              </div>
            )}
          </div>

          <div className="grm-footer">
            {error && <span className="grm-error">{error}</span>}
            <button className="btn btn-ghost" onClick={onClose} disabled={loading}>
              Abbrechen
            </button>
            <button
              className="btn btn-danger"
              onClick={() => handleStatus('rejected')}
              disabled={loading}
            >
              {loading ? '…' : '✗ Ablehnen'}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => handleStatus('approved')}
              disabled={loading}
            >
              {loading ? '…' : '✓ Freigeben'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
