'use client'

import { useState, useEffect, CSSProperties } from 'react'
import type { KnowledgeTopic } from '@/app/api/knowledge-suggestions/route'

interface Props {
  isOpen: boolean
  onClose: () => void
}

type Status = 'idle' | 'loading' | 'success' | 'error'
type SuggestionsStatus = 'loading' | 'success' | 'empty' | 'error'

function relevanceBadgeStyle(category: KnowledgeTopic['relevance_category']): CSSProperties {
  switch (category) {
    case 'finance':
      return {
        background: 'rgba(14,165,233,0.15)',
        color: 'var(--accent)',
        border: '1px solid rgba(14,165,233,0.3)',
      }
    case 'ai-tools':
      return {
        background: 'rgba(16,185,129,0.15)',
        color: 'var(--success)',
        border: '1px solid rgba(16,185,129,0.3)',
      }
    case 'ai-general':
      return {
        background: 'rgba(148,163,184,0.12)',
        color: 'var(--text-dim)',
        border: '1px solid rgba(148,163,184,0.2)',
      }
  }
}

function learningBadgeStyle(potential: KnowledgeTopic['learning_potential']): CSSProperties {
  switch (potential) {
    case 'hoch':
      return { background: 'rgba(14,165,233,0.15)', color: 'var(--accent)' }
    case 'mittel':
      return { background: 'rgba(100,116,139,0.15)', color: 'var(--text-muted)' }
    case 'niedrig':
      return { background: 'rgba(148,163,184,0.1)', color: 'var(--text-dim)' }
  }
}

const LEARNING_POTENTIAL_LABEL: Record<KnowledgeTopic['learning_potential'], string> = {
  hoch: '↑ hoch',
  mittel: '→ mittel',
  niedrig: '↓ niedrig',
}

export default function GenerateGameModal({ isOpen, onClose }: Props) {
  const [learningObjective, setLearningObjective] = useState('')
  const [gameType, setGameType] = useState('quiz')
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner')
  const [topic, setTopic] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const [suggestions, setSuggestions] = useState<KnowledgeTopic[]>([])
  const [suggestionsStatus, setSuggestionsStatus] = useState<SuggestionsStatus>('loading')
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setSuggestionsStatus('loading')
    setSuggestions([])
    setSelectedTopicId(null)
    fetch('/api/knowledge-suggestions')
      .then((res) => res.json())
      .then((data) => {
        const topics: KnowledgeTopic[] = data.topics ?? []
        setSuggestions(topics)
        setSuggestionsStatus(topics.length > 0 ? 'success' : 'empty')
      })
      .catch(() => setSuggestionsStatus('error'))
  }, [isOpen])

  if (!isOpen) return null

  function handleClose() {
    setStatus('idle')
    setLearningObjective('')
    setGameType('quiz')
    setDifficulty('beginner')
    setTopic('')
    setErrorMessage('')
    setSuggestions([])
    setSuggestionsStatus('loading')
    setSelectedTopicId(null)
    onClose()
  }

  function handleSelectTopic(t: KnowledgeTopic) {
    setSelectedTopicId(t.id)
    setLearningObjective(
      `Der Lernende versteht ${t.title} und kann es auf seinen Arbeitsalltag bei Lufthansa anwenden.`
    )
    setGameType(t.suggested_game_type === 'multiple-choice' ? 'quiz' : 'chat_challenge')
    setTopic(t.title)
  }

  async function handleGenerate() {
    if (!learningObjective.trim()) return
    setStatus('loading')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learningObjective, difficulty, topic, format: gameType }),
      })
      const data = await res.json()
      if (data.success) {
        setStatus('success')
      } else {
        setErrorMessage(data.error ?? 'Unbekannter Fehler')
        setStatus('error')
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Netzwerkfehler')
      setStatus('error')
    }
  }

  return (
    <>
      <style>{`
        .ggm-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }
        .ggm-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          width: 100%;
          max-width: 560px;
          max-height: 90vh;
          overflow-y: auto;
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .ggm-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text);
          margin: 0;
        }
        .ggm-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .ggm-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .ggm-textarea, .ggm-input, .ggm-select {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          color: var(--text);
          font-size: 14px;
          padding: 10px 12px;
          outline: none;
          transition: border-color 0.15s;
          font-family: inherit;
          width: 100%;
          box-sizing: border-box;
        }
        .ggm-textarea:focus, .ggm-input:focus, .ggm-select:focus {
          border-color: var(--accent);
        }
        .ggm-textarea {
          resize: vertical;
          min-height: 90px;
        }
        .ggm-select option {
          background: var(--bg-card);
        }
        .ggm-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 4px;
        }
        .ggm-spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: ggm-spin 0.7s linear infinite;
          margin-right: 7px;
          vertical-align: middle;
        }
        @keyframes ggm-spin { to { transform: rotate(360deg); } }
        .ggm-success {
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid var(--success);
          border-radius: var(--radius);
          color: var(--success);
          padding: 14px 16px;
          font-size: 14px;
          font-weight: 500;
          text-align: center;
        }
        .ggm-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid var(--danger);
          border-radius: var(--radius);
          color: var(--danger);
          padding: 14px 16px;
          font-size: 14px;
        }
        .ggm-error-msg {
          margin-bottom: 10px;
        }

        /* ── Recommendations ── */
        .ggm-suggestions {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ggm-suggestions-header {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .ggm-suggestions-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .ggm-topic-card {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 10px 12px;
          text-align: left;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 5px;
          transition: border-color 0.15s, background 0.15s;
          width: 100%;
          font-family: inherit;
        }
        .ggm-topic-card:hover:not(:disabled) {
          border-color: var(--accent-dim);
          background: var(--bg-card-hover);
        }
        .ggm-topic-card:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .ggm-topic-card--selected {
          border-color: var(--accent) !important;
          background: rgba(14,165,233,0.06) !important;
        }
        .ggm-topic-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          line-height: 1.35;
        }
        .ggm-topic-badges {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          align-items: center;
        }
        .ggm-badge {
          font-size: 11px;
          font-weight: 500;
          padding: 2px 7px;
          border-radius: 20px;
          line-height: 1.6;
        }
        .ggm-badge--relevance {
          border-style: solid;
          border-width: 1px;
        }
        .ggm-badge--potential {
          border: none;
        }
        .ggm-skeleton-card {
          height: 60px;
          border-radius: var(--radius);
          border: 1px solid var(--border);
          background: linear-gradient(
            90deg,
            var(--bg) 25%,
            var(--bg-card-hover) 50%,
            var(--bg) 75%
          );
          background-size: 200% 100%;
          animation: ggm-shimmer 1.4s ease-in-out infinite;
        }
        @keyframes ggm-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .ggm-suggestions-empty {
          font-size: 13px;
          color: var(--text-muted);
          margin: 0;
          padding: 4px 0;
        }
        .ggm-divider {
          border: none;
          border-top: 1px solid var(--border);
          margin: 0;
        }
      `}</style>

      <div
        className="ggm-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose()
        }}
      >
        <div className="ggm-card">
          <h2 className="ggm-title">Spiel generieren</h2>

          {status === 'success' ? (
            <>
              <div className="ggm-success">Spiel wird generiert. Erscheint bald unter Games.</div>
              <div className="ggm-actions">
                <button className="btn btn-ghost" onClick={handleClose}>
                  Schließen
                </button>
              </div>
            </>
          ) : status === 'error' ? (
            <>
              <div className="ggm-error">
                <div className="ggm-error-msg">{errorMessage}</div>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 13 }}
                  onClick={() => setStatus('idle')}
                >
                  Erneut versuchen
                </button>
              </div>
              <div className="ggm-actions">
                <button className="btn btn-ghost" onClick={handleClose}>
                  Abbrechen
                </button>
              </div>
            </>
          ) : (
            <>
              {/* ── AI Recommendations ── */}
              <div className="ggm-suggestions">
                <div className="ggm-suggestions-header">💡 Aktuelle KI-Empfehlungen</div>

                {suggestionsStatus === 'loading' && (
                  <div className="ggm-suggestions-list">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="ggm-skeleton-card" />
                    ))}
                  </div>
                )}

                {suggestionsStatus === 'success' && (
                  <div className="ggm-suggestions-list">
                    {suggestions.map((t) => (
                      <button
                        key={t.id}
                        className={`ggm-topic-card${selectedTopicId === t.id ? ' ggm-topic-card--selected' : ''}`}
                        onClick={() => handleSelectTopic(t)}
                        disabled={status === 'loading'}
                      >
                        <div className="ggm-topic-title">{t.title}</div>
                        <div className="ggm-topic-badges">
                          <span
                            className="ggm-badge ggm-badge--relevance"
                            style={relevanceBadgeStyle(t.relevance_category)}
                          >
                            {t.relevance_category}
                          </span>
                          <span
                            className="ggm-badge ggm-badge--potential"
                            style={learningBadgeStyle(t.learning_potential)}
                          >
                            {LEARNING_POTENTIAL_LABEL[t.learning_potential]}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {(suggestionsStatus === 'empty' || suggestionsStatus === 'error') && (
                  <p className="ggm-suggestions-empty">
                    Keine aktuellen Empfehlungen verfügbar
                  </p>
                )}
              </div>

              <hr className="ggm-divider" />

              {/* ── Form fields (unchanged) ── */}
              <div className="ggm-field">
                <label className="ggm-label">Lernziel *</label>
                <textarea
                  className="ggm-textarea"
                  placeholder="The learner can identify which AI-generated statements require human verification before use."
                  value={learningObjective}
                  onChange={(e) => setLearningObjective(e.target.value)}
                  disabled={status === 'loading'}
                />
              </div>

              <div className="ggm-field">
                <label className="ggm-label">Spieltyp</label>
                <select
                  className="ggm-select"
                  value={gameType}
                  onChange={(e) => setGameType(e.target.value)}
                  disabled={status === 'loading'}
                >
                  <option value="quiz">Quiz — Multiple Choice</option>
                  <option value="chat_challenge">Prompt-Challenge — Chatbot</option>
                  <option value="ai_output_judge">AI Output Judge</option>
                </select>
              </div>

              <div className="ggm-field">
                <label className="ggm-label">Schwierigkeit</label>
                <select
                  className="ggm-select"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
                  disabled={status === 'loading'}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div className="ggm-field">
                <label className="ggm-label">Thema (optional)</label>
                <input
                  type="text"
                  className="ggm-input"
                  placeholder="z.B. Monatsabschluss, SAP-Rückstellungen"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={status === 'loading'}
                />
              </div>

              <div className="ggm-actions">
                <button
                  className="btn btn-ghost"
                  onClick={handleClose}
                  disabled={status === 'loading'}
                >
                  Abbrechen
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleGenerate}
                  disabled={status === 'loading' || !learningObjective.trim()}
                >
                  {status === 'loading' && <span className="ggm-spinner" />}
                  {status === 'loading' ? 'Pipeline läuft…' : 'Generieren'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
