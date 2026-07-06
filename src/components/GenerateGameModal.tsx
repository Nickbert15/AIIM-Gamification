'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
}

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function GenerateGameModal({ isOpen, onClose }: Props) {
  const [learningObjective, setLearningObjective] = useState('')
  const [gameType, setGameType] = useState('quiz')
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner')
  const [topic, setTopic] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (status === 'loading') {
      setElapsedSeconds(0)
      timerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [status])

  if (!isOpen) return null

  function handleClose() {
    setStatus('idle')
    setLearningObjective('')
    setGameType('quiz')
    setDifficulty('beginner')
    setTopic('')
    setErrorMessage('')
    onClose()
  }

  const isNativeGeneration = gameType === 'excel_prompt_challenge'

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
          max-width: 520px;
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
        .ggm-hint {
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.5;
          text-align: right;
          margin-top: -8px;
        }
      `}</style>

      <div className="ggm-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}>
        <div className="ggm-card">
          <h2 className="ggm-title">Spiel generieren</h2>

          {status === 'success' ? (
            <>
              <div className="ggm-success">
                {isNativeGeneration
                  ? 'Spiel wurde erfolgreich erstellt und als Draft gespeichert.'
                  : 'Spiel wird generiert. Erscheint bald unter Games.'}
              </div>
              <div className="ggm-actions">
                <button className="btn btn-ghost" onClick={handleClose}>Schließen</button>
              </div>
            </>
          ) : status === 'error' ? (
            <>
              <div className="ggm-error">
                <div className="ggm-error-msg">{errorMessage}</div>
                <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => setStatus('idle')}>
                  Erneut versuchen
                </button>
              </div>
              <div className="ggm-actions">
                <button className="btn btn-ghost" onClick={handleClose}>Abbrechen</button>
              </div>
            </>
          ) : (
            <>
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
                <button className="btn btn-ghost" onClick={handleClose} disabled={status === 'loading'}>
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
