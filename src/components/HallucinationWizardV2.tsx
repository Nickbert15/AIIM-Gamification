'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { HallucinationOutputVariant, HallucinationPromptOption } from '@/types/game'

interface Props {
  learningObjective: string
  topic: string
  difficulty: string
  onClose: () => void
}

type Step =
  | 'loading-prompts'
  | 'review-prompts'
  | 'loading-outputs'
  | 'review-outputs'
  | 'saving'
  | 'success'
  | 'error'

export default function HallucinationWizardV2({ learningObjective, topic, difficulty, onClose }: Props) {
  const [step, setStep] = useState<Step>('loading-prompts')
  const [prompts, setPrompts] = useState<HallucinationPromptOption[]>([])
  const [outputVariants, setOutputVariants] = useState<HallucinationOutputVariant[]>([])
  const [contextIntro, setContextIntro] = useState('Ein KI-Assistent hat auf einen der folgenden Prompts geantwortet. Finde die Halluzination(en).')
  const [activeTab, setActiveTab] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    loadPrompts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadPrompts() {
    setStep('loading-prompts')
    setErrorMessage('')
    try {
      const res = await fetch('/api/hallucination/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learningObjective, topic, difficulty }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Fehler beim Laden der Prompt-Vorschläge')
      setPrompts(data.prompts)
      setStep('review-prompts')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Netzwerkfehler')
      setStep('error')
    }
  }

  async function generateOutputs() {
    setStep('loading-outputs')
    setErrorMessage('')
    try {
      const res = await fetch('/api/hallucination/output-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learningObjective,
          topic,
          difficulty,
          prompts: prompts.map(p => ({ id: p.id, text: p.text })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Fehler beim Generieren der Antworten')
      setOutputVariants(data.outputVariants)
      setActiveTab(0)
      setStep('review-outputs')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Netzwerkfehler')
      setStep('error')
    }
  }

  function updatePrompt(id: number, patch: Partial<HallucinationPromptOption>) {
    setPrompts(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)))
  }

  function setRecommended(id: number) {
    setPrompts(prev => prev.map(p => ({ ...p, isRecommended: p.id === id })))
  }

  function updateLine(promptOptionId: number, lineId: number, patch: Record<string, unknown>) {
    setOutputVariants(prev =>
      prev.map(v =>
        v.promptOptionId !== promptOptionId
          ? v
          : { ...v, lines: v.lines.map(l => (l.id === lineId ? { ...l, ...patch } : l)) }
      )
    )
  }

  async function handleSave() {
    setStep('saving')
    setErrorMessage('')
    try {
      const { error } = await supabase.from('games').insert({
        title: `Hallucination Spotter v2: ${topic || learningObjective.slice(0, 40)}`,
        format: 'hallucination_spotter_v2',
        library_type: null,
        target_role: null,
        difficulty,
        language: 'de',
        topic: topic || null,
        persona_key: null,
        learning_objective: learningObjective,
        game_json: {
          format: 'hallucination_spotter_v2',
          contextIntro,
          promptOptions: prompts,
          outputVariants,
          scoring: { maxPoints: 3, passingScore: 2 },
        },
        status: 'draft',
        source_attribution: { generated_by: 'kiconnect', variants: prompts.length },
      })
      if (error) throw error
      setStep('success')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Fehler beim Speichern')
      setStep('error')
    }
  }

  const activeVariant = outputVariants[activeTab]
  const activePrompt = activeVariant ? prompts.find(p => p.id === activeVariant.promptOptionId) : null

  return (
    <>
      <style>{wz2Styles}</style>
      <div className="wz2-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <div className="wz2-card">
          <div className="wz2-header">
            <div>
              <h2 className="wz2-title">Hallucination Spotter v2 erstellen</h2>
              <div className="wz2-subtitle">
                {(step === 'loading-prompts' || step === 'review-prompts') && 'Schritt 1/2 — Prompt-Varianten'}
                {(step === 'loading-outputs' || step === 'review-outputs') && 'Schritt 2/2 — Antworten prüfen'}
              </div>
            </div>
            <button className="wz2-close" onClick={onClose}>×</button>
          </div>

          <div className="wz2-body">
            {(step === 'loading-prompts' || step === 'loading-outputs') && (
              <div className="wz2-loading">
                <span className="wz2-spinner" />
                {step === 'loading-prompts' ? 'KI generiert Prompt-Varianten…' : 'KI generiert Antworten je Prompt…'}
              </div>
            )}

            {step === 'review-prompts' && (
              <>
                <p className="wz2-hint">
                  Diese {prompts.length} Prompts werden dem Spieler später zur Auswahl gestellt. Markiere,
                  welcher der empfohlene ist, und passe Text/Kritik bei Bedarf an.
                </p>
                {prompts.map((p, i) => (
                  <div key={p.id} className="wz2-prompt-card">
                    <div className="wz2-field">
                      <label className="wz2-label">Prompt {i + 1}</label>
                      <textarea
                        className="wz2-textarea"
                        style={{ minHeight: 50 }}
                        value={p.text}
                        onChange={(e) => updatePrompt(p.id, { text: e.target.value })}
                      />
                    </div>
                    <button
                      className={`wz2-recommend-btn ${p.isRecommended ? 'active' : ''}`}
                      onClick={() => setRecommended(p.id)}
                    >
                      {p.isRecommended ? '★ Empfohlener Prompt' : 'Als empfohlen markieren'}
                    </button>
                    <div className="wz2-field">
                      <label className="wz2-label">Kritik / Feedback-Text</label>
                      <textarea
                        className="wz2-textarea"
                        style={{ minHeight: 40 }}
                        value={p.critique}
                        onChange={(e) => updatePrompt(p.id, { critique: e.target.value })}
                      />
                    </div>
                  </div>
                ))}
                <div className="wz2-actions">
                  <button className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
                  <button className="btn btn-primary" onClick={generateOutputs}>
                    Antworten generieren →
                  </button>
                </div>
              </>
            )}

            {(step === 'review-outputs' || step === 'saving') && (
              <>
                <div className="wz2-field">
                  <label className="wz2-label">Einleitung für den Spieler</label>
                  <textarea
                    className="wz2-textarea"
                    style={{ minHeight: 50 }}
                    value={contextIntro}
                    onChange={(e) => setContextIntro(e.target.value)}
                    disabled={step === 'saving'}
                  />
                </div>

                <div className="wz2-tabs">
                  {outputVariants.map((v, i) => (
                    <button
                      key={v.promptOptionId}
                      className={`wz2-tab ${i === activeTab ? 'active' : ''}`}
                      onClick={() => setActiveTab(i)}
                      disabled={step === 'saving'}
                    >
                      Prompt {i + 1} {prompts.find(p => p.id === v.promptOptionId)?.isRecommended ? '★' : ''}
                    </button>
                  ))}
                </div>

                {activeVariant && (
                  <>
                    <div className="wz2-prompt-recap">„{activePrompt?.text}“</div>
                    {activeVariant.lines.map((l, i) => (
                      <div key={l.id} className="wz2-statement-card">
                        <div className="wz2-field">
                          <label className="wz2-label">Zeile {i + 1}</label>
                          <textarea
                            className="wz2-textarea"
                            style={{ minHeight: 45 }}
                            value={l.text}
                            onChange={(e) => updateLine(activeVariant.promptOptionId, l.id, { text: e.target.value })}
                            disabled={step === 'saving'}
                          />
                        </div>
                        <div className="wz2-verdict-row">
                          <button
                            className={`wz2-verdict-btn ${!l.isHallucination ? 'active-fact' : ''}`}
                            onClick={() => updateLine(activeVariant.promptOptionId, l.id, { isHallucination: false })}
                            disabled={step === 'saving'}
                          >
                            ✓ Fakt
                          </button>
                          <button
                            className={`wz2-verdict-btn ${l.isHallucination ? 'active-hallu' : ''}`}
                            onClick={() => updateLine(activeVariant.promptOptionId, l.id, { isHallucination: true })}
                            disabled={step === 'saving'}
                          >
                            ⚠ Halluzination
                          </button>
                        </div>
                        <div className="wz2-field">
                          <label className="wz2-label">Erklärung</label>
                          <textarea
                            className="wz2-textarea"
                            style={{ minHeight: 36 }}
                            value={l.explanation}
                            onChange={(e) => updateLine(activeVariant.promptOptionId, l.id, { explanation: e.target.value })}
                            disabled={step === 'saving'}
                          />
                        </div>
                      </div>
                    ))}
                  </>
                )}

                <div className="wz2-actions">
                  <button className="btn btn-ghost" onClick={onClose} disabled={step === 'saving'}>
                    Abbrechen
                  </button>
                  <button className="btn btn-primary" onClick={handleSave} disabled={step === 'saving'}>
                    {step === 'saving' ? 'Speichert…' : 'Speichern'}
                  </button>
                </div>
              </>
            )}

            {step === 'success' && (
              <>
                <div className="wz2-success">
                  Spiel gespeichert (Status: Draft) — erscheint unter Games zur Freigabe.
                </div>
                <div className="wz2-actions">
                  <button className="btn btn-primary" onClick={onClose}>Schließen</button>
                </div>
              </>
            )}

            {step === 'error' && (
              <>
                <div className="wz2-error">{errorMessage}</div>
                <div className="wz2-actions">
                  <button className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
                  <button
                    className="btn btn-primary"
                    onClick={() => (prompts.length ? generateOutputs() : loadPrompts())}
                  >
                    Erneut versuchen
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

const wz2Styles = `
  .wz2-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.75);
    backdrop-filter: blur(4px); display: flex; align-items: center;
    justify-content: center; z-index: 1000; padding: 16px;
  }
  .wz2-card {
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: var(--radius); width: 100%; max-width: 680px;
    max-height: 90vh; overflow-y: auto; display: flex; flex-direction: column;
  }
  .wz2-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 16px; padding: 20px 24px 16px; border-bottom: 1px solid var(--border);
    position: sticky; top: 0; background: var(--bg-card); z-index: 1;
  }
  .wz2-title { font-size: 16px; font-weight: 700; color: var(--text); margin: 0; }
  .wz2-subtitle { font-size: 12px; color: var(--text-muted); margin-top: 3px; }
  .wz2-close {
    background: none; border: 1px solid var(--border); border-radius: 6px;
    color: var(--text-muted); cursor: pointer; font-size: 18px; line-height: 1;
    padding: 4px 10px; flex-shrink: 0; font-family: inherit;
  }
  .wz2-close:hover { color: var(--text); border-color: var(--accent); }
  .wz2-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
  .wz2-loading { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px 0; color: var(--text-muted); }
  .wz2-spinner {
    display: inline-block; width: 22px; height: 22px;
    border: 3px solid var(--border); border-top-color: var(--accent);
    border-radius: 50%; animation: wz2-spin 0.7s linear infinite;
  }
  @keyframes wz2-spin { to { transform: rotate(360deg); } }
  .wz2-hint { font-size: 12px; color: var(--text-muted); margin: 0; line-height: 1.5; }
  .wz2-field { display: flex; flex-direction: column; gap: 6px; }
  .wz2-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
  .wz2-textarea {
    background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius);
    color: var(--text); font-size: 13px; padding: 10px 12px; font-family: inherit;
    width: 100%; box-sizing: border-box; resize: vertical; outline: none;
    transition: border-color 0.15s ease;
  }
  .wz2-textarea:focus { border-color: var(--accent); }
  .wz2-prompt-card, .wz2-statement-card {
    border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px;
    display: flex; flex-direction: column; gap: 10px; background: var(--bg);
  }
  .wz2-recommend-btn {
    align-self: flex-start; padding: 6px 12px; border-radius: 9999px;
    border: 1px solid var(--border); background: var(--bg-card); color: var(--text-muted);
    cursor: pointer; font-size: 12px; font-weight: 600; font-family: inherit;
    transition: border-color 0.15s ease, color 0.15s ease, background-color 0.15s ease;
  }
  .wz2-recommend-btn:hover { border-color: var(--accent); color: var(--accent); }
  .wz2-recommend-btn.active {
    border-color: #f59e0b; color: #f59e0b; background: rgba(245,158,11,0.1);
  }
  .wz2-tabs { display: flex; gap: 6px; flex-wrap: wrap; border-bottom: 1px solid var(--border); padding-bottom: 10px; }
  .wz2-tab {
    padding: 6px 14px; border-radius: 9999px; border: 1px solid var(--border);
    background: var(--bg); color: var(--text-muted); cursor: pointer;
    font-size: 12px; font-weight: 600; font-family: inherit;
    transition: border-color 0.15s ease, color 0.15s ease, background-color 0.15s ease;
  }
  .wz2-tab:hover:not(:disabled) { border-color: var(--accent); color: var(--text); }
  .wz2-tab.active { border-color: var(--accent); background: rgba(14,165,233,0.1); color: var(--accent); }
  .wz2-prompt-recap { font-size: 12px; color: var(--text-muted); font-style: italic; }
  .wz2-verdict-row { display: flex; gap: 8px; }
  .wz2-verdict-btn {
    flex: 1; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border);
    background: var(--bg-card); color: var(--text-muted); cursor: pointer;
    font-size: 12px; font-weight: 600; font-family: inherit;
    transition: border-color 0.15s ease, color 0.15s ease, background-color 0.15s ease;
  }
  .wz2-verdict-btn.active-fact { border-color: var(--success); color: var(--success); background: rgba(16,185,129,0.1); }
  .wz2-verdict-btn.active-hallu { border-color: var(--danger); color: var(--danger); background: rgba(239,68,68,0.08); }
  .wz2-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
  .wz2-error {
    background: rgba(239,68,68,0.1); border: 1px solid var(--danger); border-radius: var(--radius);
    color: var(--danger); padding: 14px 16px; font-size: 13px;
  }
  .wz2-success {
    background: rgba(16,185,129,0.12); border: 1px solid var(--success); border-radius: var(--radius);
    color: var(--success); padding: 14px 16px; font-size: 14px; text-align: center;
  }
`
