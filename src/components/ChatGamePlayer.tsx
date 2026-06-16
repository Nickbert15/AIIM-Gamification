'use client'

import { useState } from 'react'
import { Game, Challenge } from '@/types/game'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  game: Game
  onComplete: (score: number) => void
}

type Status = 'idle' | 'loading' | 'answered'

export default function ChatGamePlayer({ game, onComplete }: Props) {
  const challenges = (game.game_json.challenges ?? []) as Challenge[]
  const maxPoints = game.game_json.scoring?.maxPoints
    ?? challenges.reduce((s, c) => s + c.points, 0)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [userPrompt, setUserPrompt] = useState('')
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [feedback, setFeedback] = useState('')
  const [apiError, setApiError] = useState('')
  const [totalScore, setTotalScore] = useState(0)
  const [completed, setCompleted] = useState(false)

  const challenge = challenges[currentIndex]
  const isLast = currentIndex === challenges.length - 1

  async function handleSubmit() {
    if (!userPrompt.trim() || status !== 'idle') return
    setStatus('loading')
    setApiError('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt: userPrompt.trim(),
          systemPrompt: challenge.system_prompt,
          history,
        }),
      })
      const data = await res.json()

      if (data.error) {
        setApiError(data.error)
        setStatus('idle')
        return
      }

      setHistory(prev => [
        ...prev,
        { role: 'user', content: userPrompt.trim() },
        { role: 'assistant', content: data.response },
      ])
      setFeedback(data.feedback ?? '')
      setStatus('answered')
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Netzwerkfehler')
      setStatus('idle')
    }
  }

  function handleNext() {
    const newScore = totalScore + challenge.points
    if (isLast) {
      setTotalScore(newScore)
      setCompleted(true)
      onComplete(newScore)
    } else {
      setTotalScore(newScore)
      setCurrentIndex(i => i + 1)
      setHistory([])
      setUserPrompt('')
      setFeedback('')
      setApiError('')
      setStatus('idle')
    }
  }

  if (completed) {
    const pct = Math.round((totalScore / maxPoints) * 100)
    return (
      <>
        <style>{cgpStyles}</style>
        <div className="cgp-score-screen">
          <div className="cgp-score-number">
            {totalScore}
            <span style={{ fontSize: '0.45em', color: 'var(--text-muted)', fontWeight: 400 }}>
              /{maxPoints}
            </span>
          </div>
          <div className="cgp-score-label">Punkte erreicht</div>
          <div className="cgp-score-pct">{pct}%</div>
          <div className="cgp-score-msg">
            {pct >= 80
              ? 'Ausgezeichnet! Du hast alle Aufgaben gut gemeistert.'
              : pct >= 60
              ? 'Gut gemacht! Mit etwas Übung wirst du noch besser.'
              : 'Weiter üben — Prompt-Writing ist eine lernbare Fähigkeit.'}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{cgpStyles}</style>
      <div className="cgp-container">
        {/* Progress */}
        <div className="cgp-progress">
          <span>Aufgabe {currentIndex + 1} von {challenges.length}</span>
          <div className="cgp-progress-bar">
            <div
              className="cgp-progress-fill"
              style={{ width: `${(currentIndex / challenges.length) * 100}%` }}
            />
          </div>
          <span style={{ whiteSpace: 'nowrap' }}>{totalScore} Pkt.</span>
        </div>

        {/* Task card */}
        <div className="cgp-task-card">
          <span className="cgp-task-label">Deine Aufgabe</span>
          <p className="cgp-task-text">{challenge.task}</p>
          {challenge.context && (
            <p className="cgp-context">{challenge.context}</p>
          )}
        </div>

        {/* Chat history */}
        {history.length > 0 && (
          <div className="cgp-chat">
            {history.map((msg, i) => (
              <div
                key={i}
                className={`cgp-bubble ${msg.role === 'user' ? 'cgp-bubble-user' : 'cgp-bubble-assistant'}`}
              >
                {msg.content}
              </div>
            ))}
          </div>
        )}

        {/* Feedback */}
        {status === 'answered' && feedback && (
          <div className="cgp-feedback">
            <span className="cgp-feedback-label">Feedback zur deinem Prompt</span>
            {feedback}
          </div>
        )}

        {/* API error */}
        {apiError && (
          <div className="cgp-error">{apiError}</div>
        )}

        {/* Input area */}
        {status !== 'answered' && (
          <div className="cgp-input-area">
            <textarea
              className="cgp-textarea"
              placeholder="Schreibe hier deinen Prompt an den KI-Assistenten…"
              value={userPrompt}
              onChange={e => setUserPrompt(e.target.value)}
              disabled={status === 'loading'}
            />
            <div className="cgp-submit-row">
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={status === 'loading' || !userPrompt.trim()}
              >
                {status === 'loading' && <span className="cgp-spinner" />}
                {status === 'loading' ? 'KI antwortet…' : 'Prompt absenden'}
              </button>
            </div>
          </div>
        )}

        {/* Next / finish */}
        {status === 'answered' && (
          <div className="cgp-next-row">
            <button className="btn btn-primary" onClick={handleNext}>
              {isLast ? 'Fertig →' : 'Nächste Aufgabe →'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

const cgpStyles = `
  .cgp-container {
    padding: 20px 24px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .cgp-progress {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: var(--text-muted);
  }
  .cgp-progress-bar {
    flex: 1;
    height: 4px;
    background: var(--border);
    border-radius: 9999px;
    overflow: hidden;
  }
  .cgp-progress-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 9999px;
    transition: width 0.4s ease;
  }
  .cgp-task-card {
    background: rgba(14,165,233,0.05);
    border: 1px solid rgba(14,165,233,0.2);
    border-radius: var(--radius);
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .cgp-task-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--accent);
  }
  .cgp-task-text {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    line-height: 1.5;
    margin: 0;
  }
  .cgp-context {
    font-size: 12px;
    color: var(--text-dim);
    margin: 0;
    padding-top: 8px;
    border-top: 1px solid var(--border);
  }
  .cgp-chat {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .cgp-bubble {
    max-width: 85%;
    padding: 10px 14px;
    font-size: 14px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .cgp-bubble-user {
    align-self: flex-end;
    background: var(--accent);
    color: #fff;
    border-radius: 12px 12px 4px 12px;
  }
  .cgp-bubble-assistant {
    align-self: flex-start;
    background: var(--bg-card);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: 12px 12px 12px 4px;
  }
  .cgp-feedback {
    background: rgba(245,158,11,0.1);
    border: 1px solid rgba(245,158,11,0.3);
    border-radius: var(--radius);
    padding: 12px 16px;
    font-size: 13px;
    color: #f59e0b;
    line-height: 1.5;
  }
  .cgp-feedback-label {
    display: block;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 6px;
  }
  .cgp-error {
    background: rgba(239,68,68,0.08);
    border: 1px solid rgba(239,68,68,0.25);
    border-radius: var(--radius);
    padding: 10px 14px;
    font-size: 13px;
    color: var(--danger);
  }
  .cgp-input-area {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .cgp-textarea {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    font-size: 14px;
    padding: 12px 14px;
    resize: vertical;
    min-height: 80px;
    font-family: inherit;
    outline: none;
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.15s;
  }
  .cgp-textarea:focus { border-color: var(--accent); }
  .cgp-textarea:disabled { opacity: 0.5; cursor: not-allowed; }
  .cgp-submit-row { display: flex; justify-content: flex-end; }
  .cgp-next-row { display: flex; justify-content: flex-end; }
  .cgp-spinner {
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: cgp-spin 0.7s linear infinite;
    margin-right: 6px;
    vertical-align: middle;
  }
  @keyframes cgp-spin { to { transform: rotate(360deg); } }
  .cgp-score-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 36px 24px 32px;
    gap: 8px;
    text-align: center;
  }
  .cgp-score-number {
    font-size: 52px;
    font-weight: 800;
    color: var(--accent);
    line-height: 1;
  }
  .cgp-score-label {
    font-size: 14px;
    color: var(--text-muted);
  }
  .cgp-score-pct {
    font-size: 26px;
    font-weight: 700;
    color: var(--text);
    margin-top: 4px;
  }
  .cgp-score-msg {
    font-size: 14px;
    color: var(--text-dim);
    max-width: 360px;
    line-height: 1.5;
    margin-top: 8px;
  }
`
