'use client'

export interface ChatMessage {
  role: 'assistant' | 'user'
  text: string
}

export type PlayerStatus = 'idle' | 'thinking' | 'animating' | 'finishing' | 'done'

interface Props {
  messages: ChatMessage[]
  prompt: string
  onPromptChange: (value: string) => void
  onSend: () => void
  onFinish: () => void
  status: PlayerStatus
  attemptsUsed: number
  maxAttempts: number
  apiError: string
}

export default function CopilotSidebar({
  messages, prompt, onPromptChange, onSend, onFinish, status, attemptsUsed, maxAttempts, apiError,
}: Props) {
  const busy = status !== 'idle'
  const thinking = status === 'thinking' || status === 'animating'
  const attemptsRemaining = Math.max(0, maxAttempts - attemptsUsed)

  return (
    <>
      <style>{sidebarStyles}</style>
      <div className="cs-sidebar">
        <div className="cs-header">
          <span className="cs-header-icon" />
          <div>
            <div className="cs-header-title">KI-Assistent</div>
            <div className="cs-header-subtitle">Versuch {attemptsUsed} von {maxAttempts}</div>
          </div>
        </div>

        <div className="cs-messages">
          {messages.map((m, i) => (
            <div key={i} className={`cs-bubble ${m.role === 'user' ? 'cs-bubble-user' : 'cs-bubble-assistant'}`}>
              {m.text}
            </div>
          ))}
          {thinking && (
            <div className="cs-bubble cs-bubble-assistant cs-thinking">
              <span>Arbeite an deiner Anfrage</span>
              <span className="cs-dots"><span /><span /><span /></span>
            </div>
          )}
        </div>

        {apiError && <div className="cs-error">{apiError}</div>}

        <div className="cs-input-area">
          <textarea
            className="cs-textarea"
            placeholder="Schreibe eine Anweisung an den Assistenten…"
            value={prompt}
            onChange={e => onPromptChange(e.target.value)}
            disabled={busy || attemptsRemaining <= 0}
          />
          <button
            className="cs-send-btn"
            onClick={onSend}
            disabled={busy || !prompt.trim() || attemptsRemaining <= 0}
          >
            Senden
          </button>
        </div>

        <button className="cs-finish-btn" onClick={onFinish} disabled={status === 'finishing' || status === 'done'}>
          {status === 'finishing' ? 'Wird ausgewertet…' : 'Fertig →'}
        </button>
      </div>
    </>
  )
}

const sidebarStyles = `
  .cs-sidebar {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #faf9f8;
    border-left: 1px solid #d0d0d0;
    min-height: 0;
  }
  .cs-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    border-bottom: 1px solid #e2e2e2;
    background: #ffffff;
  }
  .cs-header-icon {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    flex-shrink: 0;
    background: linear-gradient(135deg, #217346, #4fd1a5 60%, #a5f3c9);
  }
  .cs-header-title {
    font-size: 13.5px;
    font-weight: 700;
    color: #1a1a1a;
  }
  .cs-header-subtitle {
    font-size: 11px;
    color: #767676;
    margin-top: 1px;
  }
  .cs-messages {
    flex: 1;
    overflow-y: auto;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .cs-bubble {
    max-width: 92%;
    padding: 9px 12px;
    font-size: 13px;
    line-height: 1.45;
    white-space: pre-wrap;
    word-break: break-word;
    border-radius: 10px;
  }
  .cs-bubble-assistant {
    align-self: flex-start;
    background: #ffffff;
    border: 1px solid #e2e2e2;
    color: #1f1f1f;
    border-bottom-left-radius: 3px;
  }
  .cs-bubble-user {
    align-self: flex-end;
    background: #217346;
    color: #ffffff;
    border-bottom-right-radius: 3px;
  }
  .cs-thinking {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #767676;
    font-style: italic;
  }
  .cs-dots {
    display: inline-flex;
    gap: 3px;
  }
  .cs-dots span {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #217346;
    animation: cs-dot-pulse 1.1s infinite ease-in-out;
  }
  .cs-dots span:nth-child(2) { animation-delay: 0.15s; }
  .cs-dots span:nth-child(3) { animation-delay: 0.3s; }
  @keyframes cs-dot-pulse {
    0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
    40% { opacity: 1; transform: scale(1); }
  }
  .cs-error {
    margin: 0 14px;
    padding: 8px 12px;
    background: rgba(220,38,38,0.08);
    border: 1px solid rgba(220,38,38,0.25);
    border-radius: 8px;
    color: #b91c1c;
    font-size: 12.5px;
  }
  .cs-input-area {
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    border-top: 1px solid #e2e2e2;
    background: #ffffff;
  }
  .cs-textarea {
    border: 1px solid #d0d0d0;
    border-radius: 8px;
    padding: 9px 10px;
    font-size: 13px;
    font-family: inherit;
    resize: vertical;
    min-height: 64px;
    outline: none;
    color: #1a1a1a;
    transition: border-color 0.15s;
  }
  .cs-textarea:focus { border-color: #217346; }
  .cs-textarea:disabled { opacity: 0.55; cursor: not-allowed; background: #f5f5f5; }
  .cs-send-btn {
    align-self: flex-end;
    background: #217346;
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 8px 18px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }
  .cs-send-btn:hover:not(:disabled) { background: #185c37; }
  .cs-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .cs-finish-btn {
    margin: 0 14px 14px;
    background: #ffffff;
    color: #217346;
    border: 1.5px solid #217346;
    border-radius: 8px;
    padding: 10px 16px;
    font-size: 13.5px;
    font-weight: 700;
    cursor: pointer;
  }
  .cs-finish-btn:hover:not(:disabled) { background: #eef6f1; }
  .cs-finish-btn:disabled { opacity: 0.5; cursor: not-allowed; }
`
