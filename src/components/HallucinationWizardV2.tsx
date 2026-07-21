'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { HalluPromptOptionV2, HalluSentenceV2 } from '@/types/game'
import ThinkingDots from './ThinkingDots'
import { X, Star, Check, AlertTriangle } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

interface Props {
  learningObjective: string
  topic: string
  difficulty: string
  onClose: () => void
}

type Step =
  | 'loading-prompts'
  | 'review-prompts'
  | 'loading-sentences'
  | 'review-sentences'
  | 'saving'
  | 'success'
  | 'error'

export default function HallucinationWizardV2({ learningObjective, topic, difficulty, onClose }: Props) {
  const { t } = useI18n()
  const [step, setStep] = useState<Step>('loading-prompts')
  const [situation, setSituation] = useState('')
  const [prompts, setPrompts] = useState<HalluPromptOptionV2[]>([])
  const [sentences, setSentences] = useState<HalluSentenceV2[]>([])
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
      if (!res.ok) throw new Error(data.error ?? t('wz.errLoadPrompts'))
      setSituation(data.situation)
      setPrompts(data.prompts)
      setStep('review-prompts')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t('excel.networkError'))
      setStep('error')
    }
  }

  async function generateSentences() {
    setStep('loading-sentences')
    setErrorMessage('')
    try {
      const res = await fetch('/api/hallucination/output-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learningObjective, topic, difficulty, situation }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? t('wz.errGenSentences'))
      setSentences(data.sentences)
      setStep('review-sentences')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t('excel.networkError'))
      setStep('error')
    }
  }

  function updatePrompt(id: number, patch: Partial<HalluPromptOptionV2>) {
    setPrompts(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)))
  }

  function setRecommended(id: number) {
    setPrompts(prev => prev.map(p => ({ ...p, isRecommended: p.id === id })))
  }

  function updateSentence(id: number, patch: Partial<HalluSentenceV2>) {
    setSentences(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)))
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
          halluRound: {
            situation,
            promptOptions: prompts,
            answer: { sentences },
          },
        },
        status: 'draft',
        source_attribution: { generated_by: 'kiconnect', prompts: prompts.length, sentences: sentences.length },
      })
      if (error) throw error
      setStep('success')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t('grm.saveError'))
      setStep('error')
    }
  }

  const hallucinationCount = sentences.filter(s => s.isHallucination).length

  return (
    <>
      <style>{wz2Styles}</style>
      <div className="wz2-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <div className="wz2-card">
          <div className="wz2-header">
            <div>
              <h2 className="wz2-title">{t('wz.title')}</h2>
              <div className="wz2-subtitle">
                {(step === 'loading-prompts' || step === 'review-prompts') && t('wz.step1')}
                {(step === 'loading-sentences' || step === 'review-sentences') && t('wz.step2')}
              </div>
            </div>
            <button className="wz2-close" onClick={onClose} aria-label={t('common.close')}><X size={16} strokeWidth={2} /></button>
          </div>

          <div className="wz2-body">
            {(step === 'loading-prompts' || step === 'loading-sentences') && (
              <div className="wz2-loading">
                <ThinkingDots label={step === 'loading-prompts' ? t('wz.loadingPrompts') : t('wz.loadingSentences')} />
              </div>
            )}

            {step === 'review-prompts' && (
              <>
                <div className="wz2-field">
                  <label className="wz2-label">{t('wz.situationLabel')}</label>
                  <textarea
                    className="wz2-textarea"
                    style={{ minHeight: 50 }}
                    value={situation}
                    onChange={(e) => setSituation(e.target.value)}
                  />
                </div>
                <p className="wz2-hint">
                  {t('wz.promptsHint')}
                </p>
                {prompts.map((p, i) => (
                  <div key={p.id} className="wz2-prompt-card">
                    <div className="wz2-field">
                      <label className="wz2-label">{t('wz.promptLabel', { n: i + 1, approach: p.approach })}</label>
                      <textarea
                        className="wz2-textarea"
                        style={{ minHeight: 50 }}
                        value={p.text}
                        onChange={(e) => updatePrompt(p.id, { text: e.target.value })}
                      />
                    </div>
                    <div className="wz2-quality-row">
                      <label className="wz2-label">{t('wz.quality')}</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className="wz2-number"
                        value={p.quality}
                        onChange={(e) => updatePrompt(p.id, { quality: Number(e.target.value) })}
                      />
                    </div>
                    <button
                      className={`wz2-recommend-btn ${p.isRecommended ? 'active' : ''}`}
                      onClick={() => setRecommended(p.id)}
                    >
                      {p.isRecommended && <Star size={13} strokeWidth={2} fill="currentColor" />}
                      {p.isRecommended ? t('wz.recommendedPrompt') : t('wz.markRecommended')}
                    </button>
                    <div className="wz2-field">
                      <label className="wz2-label">{t('wz.feedbackText')}</label>
                      <textarea
                        className="wz2-textarea"
                        style={{ minHeight: 40 }}
                        value={p.feedback}
                        onChange={(e) => updatePrompt(p.id, { feedback: e.target.value })}
                      />
                    </div>
                  </div>
                ))}
                <div className="wz2-actions">
                  <button className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
                  <button className="btn btn-primary" onClick={generateSentences}>
                    {t('wz.genAnswerText')}
                  </button>
                </div>
              </>
            )}

            {(step === 'review-sentences' || step === 'saving') && (
              <>
                <p className="wz2-hint">
                  {t('wz.sentencesHint', { n: sentences.length, hallu: hallucinationCount })}
                </p>
                {sentences.map((s, i) => (
                  <div key={s.id} className="wz2-statement-card">
                    <div className="wz2-field">
                      <label className="wz2-label">{t('wz.sentenceLabel', { n: i + 1 })}</label>
                      <textarea
                        className="wz2-textarea"
                        style={{ minHeight: 45 }}
                        value={s.text}
                        onChange={(e) => updateSentence(s.id, { text: e.target.value })}
                        disabled={step === 'saving'}
                      />
                    </div>
                    <div className="wz2-verdict-row">
                      <button
                        className={`wz2-verdict-btn ${!s.isHallucination ? 'active-fact' : ''}`}
                        onClick={() => updateSentence(s.id, { isHallucination: false })}
                        disabled={step === 'saving'}
                      >
                        <Check size={14} strokeWidth={2.25} /> {t('wz.fact')}
                      </button>
                      <button
                        className={`wz2-verdict-btn ${s.isHallucination ? 'active-hallu' : ''}`}
                        onClick={() => updateSentence(s.id, { isHallucination: true })}
                        disabled={step === 'saving'}
                      >
                        <AlertTriangle size={14} strokeWidth={2.25} /> {t('wz.hallucination')}
                      </button>
                    </div>
                    <div className="wz2-field">
                      <label className="wz2-label">{t('wz.explanation')}</label>
                      <textarea
                        className="wz2-textarea"
                        style={{ minHeight: 36 }}
                        value={s.explanation}
                        onChange={(e) => updateSentence(s.id, { explanation: e.target.value })}
                        disabled={step === 'saving'}
                      />
                    </div>
                  </div>
                ))}

                <div className="wz2-actions">
                  <button className="btn btn-ghost" onClick={onClose} disabled={step === 'saving'}>
                    {t('common.cancel')}
                  </button>
                  <button className="btn btn-primary" onClick={handleSave} disabled={step === 'saving'}>
                    {step === 'saving' ? t('common.saving') : t('common.save')}
                  </button>
                </div>
              </>
            )}

            {step === 'success' && (
              <>
                <div className="wz2-success">
                  {t('wz.savedDraft')}
                </div>
                <div className="wz2-actions">
                  <button className="btn btn-primary" onClick={onClose}>{t('common.close')}</button>
                </div>
              </>
            )}

            {step === 'error' && (
              <>
                <div className="wz2-error">{errorMessage}</div>
                <div className="wz2-actions">
                  <button className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
                  <button
                    className="btn btn-primary"
                    onClick={() => (prompts.length ? generateSentences() : loadPrompts())}
                  >
                    {t('common.retry')}
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
    position: fixed; inset: 0; background: rgba(5,22,77,.38);
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
    color: var(--text-muted); cursor: pointer; line-height: 1;
    display: flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; padding: 0; flex-shrink: 0; font-family: inherit;
  }
  .wz2-close:hover { color: var(--text); border-color: var(--accent); }
  .wz2-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
  .wz2-loading { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px 0; color: var(--text-muted); }
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
  .wz2-number {
    background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius);
    color: var(--text); font-size: 13px; padding: 8px 10px; font-family: inherit;
    width: 90px; outline: none; transition: border-color 0.15s ease;
  }
  .wz2-number:focus { border-color: var(--accent); }
  .wz2-quality-row { display: flex; align-items: center; gap: 10px; }
  .wz2-prompt-card, .wz2-statement-card {
    border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px;
    display: flex; flex-direction: column; gap: 10px; background: var(--bg);
  }
  .wz2-recommend-btn {
    align-self: flex-start; display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 12px; border-radius: 9999px;
    border: 1px solid var(--border); background: var(--bg-card); color: var(--text-muted);
    cursor: pointer; font-size: 12px; font-weight: 600; font-family: inherit;
    transition: border-color 0.15s ease, color 0.15s ease, background-color 0.15s ease;
  }
  .wz2-recommend-btn:hover { border-color: var(--accent); color: var(--accent-ink); }
  .wz2-recommend-btn.active {
    border-color: var(--lh-yellow); color: var(--lh-yellow-ink); background: var(--lh-yellow-soft);
  }
  .wz2-verdict-row { display: flex; gap: 8px; }
  .wz2-verdict-btn {
    flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border);
    background: var(--bg-card); color: var(--text-muted); cursor: pointer;
    font-size: 12px; font-weight: 600; font-family: inherit;
    transition: border-color var(--duration) var(--ease), color var(--duration) var(--ease), background-color var(--duration) var(--ease);
  }
  .wz2-verdict-btn.active-fact { border-color: var(--success); color: var(--success-ink); background: var(--success-soft); }
  .wz2-verdict-btn.active-hallu { border-color: var(--attention); color: var(--attention-ink); background: var(--attention-soft); }
  .wz2-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
  .wz2-error {
    background: var(--danger-soft); border: 1px solid var(--danger); border-radius: var(--radius);
    color: var(--danger); padding: 14px 16px; font-size: 13px;
  }
  .wz2-success {
    background: var(--success-soft); border: 1px solid var(--success); border-radius: var(--radius);
    color: var(--success-ink); padding: 14px 16px; font-size: 14px; text-align: center;
  }
`
