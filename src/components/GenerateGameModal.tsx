'use client'

import { useState, useEffect, CSSProperties, useRef } from 'react'
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
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [suggestions, setSuggestions] = useState<KnowledgeTopic[]>([])
  const [suggestionsStatus, setSuggestionsStatus] = useState<SuggestionsStatus>('loading')
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)

  const isNativeGeneration = gameType === 'excel_prompt_challenge'

  useEffect(() => {
    if (status === 'loading') {
      setElapsedSeconds(0)
      timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [status])

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
    setElapsedSeconds(0)
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
      const endpoint = isNativeGeneration ? '/api/excel/generate' : '/api/generate'
      const res = await fetch(endpoint, {
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
              <div className="ggm-success">
                Spiel wird generiert. Erscheint bald unter Games.
              </div>
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
                  <option value="excel_prompt_challenge">Excel-Prompt-Challenge — Copilot-Grid</option>
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
                  {status === 'loading'
                    ? (isNativeGeneration ? `Generiere… (${elapsedSeconds}s)` : 'Pipeline läuft…')
                    : 'Generieren'}
                </button>
              </div>
              {status === 'loading' && isNativeGeneration && (
                <div className="ggm-hint">
                  Die KI prüft ihre eigene Antwort und generiert bei Bedarf einmal neu — das kann bis zu 90
                  Sekunden dauern. Du kannst das Fenster schließen oder wegnavigieren, das Spiel wird trotzdem
                  im Hintergrund fertig erstellt und erscheint als Draft unter Games.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
