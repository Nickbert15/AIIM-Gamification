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

            {game.game_json.halluRound && (
              <div>
                <p className="grm-section-title">
                  Prompt-Varianten ({game.game_json.halluRound.promptOptions.length})
                </p>
                <div className="grm-q-text" style={{ marginBottom: 8 }}>{game.game_json.halluRound.situation}</div>
                <div className="grm-question-list">
                  {game.game_json.halluRound.promptOptions.map((p, i) => (
                    <div key={p.id} className="grm-question-item">
                      <div className="grm-q-text">{i + 1}. {p.text}</div>
                      <div className="grm-q-answer" style={{ color: p.isRecommended ? 'var(--success)' : 'var(--text-muted)' }}>
                        <span>{p.isRecommended ? '★' : '○'}</span>
                        <span>{p.isRecommended ? `Empfohlen · ${p.approach}` : `Alternative · ${p.approach}`}</span>
                      </div>
                      {p.feedback && <div className="grm-q-explanation">{p.feedback}</div>}
                    </div>
                  ))}
                </div>
                <div className="grm-q-explanation" style={{ marginTop: 10 }}>
                  Antworttext: {game.game_json.halluRound.answer.sentences.length} Sätze, davon{' '}
                  {game.game_json.halluRound.answer.sentences.filter(s => s.isHallucination).length} Halluzination(en)
                </div>
              </div>
            )}

            {game.game_json.arenaRounds && (
              <div>
                <p className="grm-section-title">Arena-Runden ({game.game_json.arenaRounds.length})</p>
                <div className="grm-question-list">
                  {game.game_json.arenaRounds.map((r, i) => (
                    <div key={r.id} className="grm-question-item">
                      <div className="grm-q-text">{i + 1}. {r.taskDescription}</div>
                      <div className="grm-q-explanation">{r.referenceOutputs.length} Referenzantworten hinterlegt</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {game.game_json.branching && (
              <div>
                <p className="grm-section-title">
                  Prompt-Navigator · Prompt-Optionen ({(game.game_json.branching.nodes[game.game_json.branching.startNode]?.options ?? []).length})
                </p>
                <div className="grm-objective" style={{ marginBottom: 10 }}>
                  {game.game_json.branching.scenario.intro}
                </div>
                <div className="grm-question-list">
                  {(game.game_json.branching.nodes[game.game_json.branching.startNode]?.options ?? []).map((o, i) => (
                    <div key={o.id} className="grm-question-item">
                      <div className="grm-q-text">{i + 1}. {o.label}</div>
                      {o.promptText && (
                        <div className="grm-q-explanation" style={{ marginBottom: 6 }}>{o.promptText}</div>
                      )}
                      <div className="grm-q-answer" style={{ color: o.points > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                        <span>{o.points > 0 ? '✓' : '·'}</span>
                        <span>{o.points} Punkte</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {game.format === 'excel_challenge' && (
              <div>
                <p className="grm-section-title">Excel Challenge</p>
                <div className="grm-question-list">
                  <div className="grm-question-item">
                    <div className="grm-q-text">{game.game_json.task}</div>
                    <div className="grm-q-explanation">
                      Ausgangsdaten: {game.game_json.initialData?.rows.length ?? 0} Zeilen × {game.game_json.initialData?.headers.length ?? 0} Spalten
                      {' · '}
                      Musterlösung: {game.game_json.solutionData?.rows.length ?? 0} Zeilen × {game.game_json.solutionData?.headers.length ?? 0} Spalten
                      {' · '}
                      Max. Versuche: {game.game_json.maxAttempts ?? '—'}
                    </div>
                  </div>
                  {(game.game_json.evaluationCriteria ?? []).map(c => (
                    <div key={c.id} className="grm-question-item">
                      <div className="grm-q-text">{c.description}</div>
                      <div className="grm-q-explanation">
                        Gewicht: {c.weight} · Spalten: {c.columns.join(', ')}
                      </div>
                    </div>
                  ))}
                  {game.game_json.samplePrompt && (
                    <div className="grm-question-item">
                      <div className="grm-q-text">Beispiel-Prompt</div>
                      <div className="grm-q-explanation">{game.game_json.samplePrompt}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!game.game_json.questions && !game.game_json.halluRound && !game.game_json.arenaRounds && !game.game_json.branching && game.format !== 'excel_challenge' && (
              <div>
                <p className="grm-section-title">Spieltyp nicht verfügbar</p>
                <div className="grm-objective">
                  Für das Format „{game.format || '—'}" ist keine Detailansicht verfügbar.
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
