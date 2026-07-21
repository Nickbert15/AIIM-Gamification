'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronDown } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

interface Props {
  isOpen: boolean
  onClose: () => void
}

type Status = 'idle' | 'loading' | 'success' | 'error'
type TechStatus = 'loading' | 'success' | 'empty' | 'error'
type Difficulty = 'easy' | 'medium' | 'hard'
type GameType = 'excel_challenge' | 'hallucination_spotter_v2' | 'prompt_arena' | 'prompt_branching'

interface Technology {
  id: string
  label: string
  whats_new: string | null
  source_url: string | null
  source_name: string | null
  created_at: string
}

const OTHER = 'other'

// Statische Lernziel-Liste (bewusst keine DB-Tabelle). Labels/Beschreibungen via i18n.
const LEARNING_GOALS: { value: string; labelKey: string; descKey: string }[] = [
  { value: 'finanzabschluss', labelKey: 'ggm.goal.finanzabschluss', descKey: 'ggm.goalDesc.finanzabschluss' },
  { value: 'buchhaltung', labelKey: 'ggm.goal.buchhaltung', descKey: 'ggm.goalDesc.buchhaltung' },
  { value: 'controlling', labelKey: 'ggm.goal.controlling', descKey: 'ggm.goalDesc.controlling' },
  { value: 'reporting', labelKey: 'ggm.goal.reporting', descKey: 'ggm.goalDesc.reporting' },
  { value: 'kostenrechnung', labelKey: 'ggm.goal.kostenrechnung', descKey: 'ggm.goalDesc.kostenrechnung' },
  { value: 'konsolidierung', labelKey: 'ggm.goal.konsolidierung', descKey: 'ggm.goalDesc.konsolidierung' },
  { value: 'steuern', labelKey: 'ggm.goal.steuern', descKey: 'ggm.goalDesc.steuern' },
  { value: 'treasury', labelKey: 'ggm.goal.treasury', descKey: 'ggm.goalDesc.treasury' },
]

const DIFFICULTIES: { value: Difficulty; labelKey: string }[] = [
  { value: 'easy', labelKey: 'ggm.diff.easy' },
  { value: 'medium', labelKey: 'ggm.diff.medium' },
  { value: 'hard', labelKey: 'ggm.diff.hard' },
]

// Werte identisch mit der Spalte games.format. Label = Produktname (bleibt), Beschreibung via i18n.
const GAME_TYPES: { value: GameType; label: string; descKey: string }[] = [
  { value: 'excel_challenge', label: 'Excel Challenge', descKey: 'ggm.gtDesc.excel_challenge' },
  { value: 'hallucination_spotter_v2', label: 'Hallucination Spotter', descKey: 'ggm.gtDesc.hallucination_spotter_v2' },
  { value: 'prompt_arena', label: 'Prompt Arena', descKey: 'ggm.gtDesc.prompt_arena' },
  { value: 'prompt_branching', label: 'Prompt-Navigator', descKey: 'ggm.gtDesc.prompt_branching' },
]

// Neueste zuerst, dann pro label nur den ersten (= neuesten) Eintrag behalten.
function dedupeByLabel(rows: Technology[]): Technology[] {
  const sorted = [...rows].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  const seen = new Set<string>()
  const result: Technology[] = []
  for (const row of sorted) {
    const key = row.label.trim().toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(row)
  }
  return result
}

export default function GenerateGameModal({ isOpen, onClose }: Props) {
  const { t } = useI18n()
  const [technologies, setTechnologies] = useState<Technology[]>([])
  const [techStatus, setTechStatus] = useState<TechStatus>('loading')
  const [technologyId, setTechnologyId] = useState('')
  const [technologyCustom, setTechnologyCustom] = useState('')
  const [techOpen, setTechOpen] = useState(false)

  const [learningGoal, setLearningGoal] = useState('')
  const [learningGoalCustom, setLearningGoalCustom] = useState('')
  const [goalOpen, setGoalOpen] = useState(false)

  const [gameType, setGameType] = useState<GameType>('excel_challenge')
  const [gameTypeOpen, setGameTypeOpen] = useState(false)
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')

  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [wizardV2Open, setWizardV2Open] = useState(false)

  // Feedback aus /api/generate: Schicht-1-Feldfehler und Schicht-2-Klärung.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [clarify, setClarify] = useState<
    { verdict: 'warn' | 'block'; message: string; suggestion: string | null } | null
  >(null)

  const techRef = useRef<HTMLDivElement | null>(null)
  const goalRef = useRef<HTMLDivElement | null>(null)
  const gameTypeRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    setTechStatus('loading')
    setTechnologies([])

    supabase
      .from('technologies')
      .select('id, label, whats_new, source_url, source_name, created_at')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          setTechStatus('error')
          return
        }
        const deduped = dedupeByLabel((data ?? []) as Technology[])
        setTechnologies(deduped)
        setTechStatus(deduped.length > 0 ? 'success' : 'empty')
      })
  }, [isOpen])

  // Klick außerhalb schließt das Technologie-Dropdown.
  useEffect(() => {
    if (!techOpen) return
    function handleClick(e: MouseEvent) {
      if (techRef.current && !techRef.current.contains(e.target as Node)) {
        setTechOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [techOpen])

  // Klick außerhalb schließt das Lernziel-Dropdown.
  useEffect(() => {
    if (!goalOpen) return
    function handleClick(e: MouseEvent) {
      if (goalRef.current && !goalRef.current.contains(e.target as Node)) {
        setGoalOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [goalOpen])

  // Klick außerhalb schließt das Spieltyp-Dropdown.
  useEffect(() => {
    if (!gameTypeOpen) return
    function handleClick(e: MouseEvent) {
      if (gameTypeRef.current && !gameTypeRef.current.contains(e.target as Node)) {
        setGameTypeOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [gameTypeOpen])

  if (!isOpen) return null

  const selectedTech = technologies.find((tech) => tech.id === technologyId)
  const techLabel =
    technologyId === OTHER
      ? t('ggm.other')
      : selectedTech?.label ?? t('ggm.techPlaceholder')

  const selectedGoal = LEARNING_GOALS.find((g) => g.value === learningGoal)
  const goalLabel =
    learningGoal === OTHER
      ? t('ggm.other')
      : (selectedGoal ? t(selectedGoal.labelKey) : t('ggm.goalPlaceholder'))

  const gameTypeLabel = GAME_TYPES.find((g) => g.value === gameType)?.label ?? t('ggm.gtPlaceholder')

  const technologyValid =
    technologyId === OTHER
      ? technologyCustom.trim().length > 0
      : technologyId.length > 0

  const learningGoalValid =
    learningGoal === OTHER
      ? learningGoalCustom.trim().length > 0
      : learningGoal.length > 0

  const canSubmit = technologyValid && learningGoalValid && status !== 'loading'

  function resetForm() {
    setTechnologyId('')
    setTechnologyCustom('')
    setTechOpen(false)
    setLearningGoal('')
    setLearningGoalCustom('')
    setGoalOpen(false)
    setGameType('excel_challenge')
    setGameTypeOpen(false)
    setDifficulty('easy')
    setErrorMessage('')
    setFieldErrors({})
    setClarify(null)
  }

  // Bei jeder Eingabeänderung veraltetes Feedback verwerfen (Assumption neu bewerten lassen).
  function clearFeedback() {
    setFieldErrors({})
    setClarify(null)
  }

  function handleClose() {
    setStatus('idle')
    resetForm()
    setTechnologies([])
    setTechStatus('loading')
    onClose()
  }

  function handleSelectTech(id: string) {
    setTechnologyId(id)
    if (id !== OTHER) setTechnologyCustom('')
    setTechOpen(false)
    clearFeedback()
  }

  function handleSelectGoal(value: string) {
    setLearningGoal(value)
    if (value !== OTHER) setLearningGoalCustom('')
    setGoalOpen(false)
    clearFeedback()
  }

  function handleSelectGameType(value: GameType) {
    setGameType(value)
    setGameTypeOpen(false)
  }

  async function handleGenerate(acknowledgedWarning = false) {
    if (!technologyValid || !learningGoalValid) return
    setStatus('loading')
    setErrorMessage('')
    setFieldErrors({})
    if (!acknowledgedWarning) setClarify(null)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technologyId,
          technologyCustom: technologyId === OTHER ? technologyCustom.trim() : null,
          learningGoal,
          learningGoalCustom: learningGoal === OTHER ? learningGoalCustom.trim() : null,
          gameType,
          difficulty,
          acknowledgedWarning,
        }),
      })
      const data = await res.json()

      // Schicht 1: strukturelle Feldfehler → inline anzeigen, nicht absenden.
      if (res.status === 400 && data.needsInput) {
        const fe: Record<string, string> = {}
        for (const e of data.errors ?? []) fe[e.field] = e.message
        setFieldErrors(fe)
        setStatus('idle')
        return
      }

      // Schicht 2: LLM-Klärung.
      if (data.verdict === 'block') {
        setClarify({ verdict: 'block', message: data.message ?? t('ggm.clarifyBlock'), suggestion: null })
        setStatus('idle')
        return
      }
      if (data.verdict === 'warn') {
        setClarify({
          verdict: 'warn',
          message: data.message ?? t('ggm.clarifyWarn'),
          suggestion: data.suggestion ?? null,
        })
        setStatus('idle')
        return
      }

      if (res.ok && data.ok) {
        setStatus('success')
        return
      }

      // Generierung fehlgeschlagen (nach bestandener Klärung, im n8n-Workflow).
      if (data.stage === 'generation') {
        const msg = Array.isArray(data.errors)
          ? data.errors.join('; ')
          : data.errors ?? t('ggm.unknownError')
        setErrorMessage(t('ggm.genFailed', { msg }))
        setStatus('error')
        return
      }

      setErrorMessage(data.error ?? t('ggm.unknownError'))
      setStatus('error')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t('excel.networkError'))
      setStatus('error')
    }
  }

  return (
    <>
      <style>{`
        .ggm-overlay {
          position: fixed;
          inset: 0;
          background: rgba(5,22,77,.38);
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
          box-shadow: var(--shadow-lg);
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
          font-family: var(--font-head);
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
        .ggm-input, .ggm-select {
          background: var(--surface-sunken);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          color: var(--text);
          font-size: 14px;
          padding: 10px 12px;
          outline: none;
          transition: border-color var(--duration) var(--ease), box-shadow var(--duration) var(--ease);
          font-family: inherit;
          width: 100%;
          box-sizing: border-box;
        }
        .ggm-input:focus, .ggm-select:focus {
          border-color: var(--accent);
          box-shadow: var(--focus-ring);
        }
        .ggm-select option {
          background: var(--bg-card);
        }

        /* Custom Technologie-Dropdown (native select kann keine Info-Icons/Tooltips pro Eintrag) */
        .ggm-combo { position: relative; width: 100%; }
        .ggm-combo-trigger {
          background: var(--surface-sunken);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          color: var(--text);
          font-size: 14px;
          padding: 10px 12px;
          outline: none;
          font-family: inherit;
          width: 100%;
          box-sizing: border-box;
          text-align: left;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          transition: border-color var(--duration) var(--ease);
        }
        .ggm-combo-trigger:hover, .ggm-combo-trigger:focus { border-color: var(--accent); }
        .ggm-combo-trigger:focus { box-shadow: var(--focus-ring); }
        .ggm-combo-trigger[data-placeholder="true"] { color: var(--text-muted); }
        .ggm-combo-caret { color: var(--text-muted); flex-shrink: 0; display: flex; }
        .ggm-combo-list {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          z-index: 20;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 4px;
          max-height: 280px;
          overflow-y: auto;
          box-shadow: var(--shadow-lg);
        }
        /* Für kurze Listen (z. B. Spieltyp): nicht scrollen/clippen, damit die
           per-Zeile-Tooltips nach oben/unten frei überstehen können. */
        .ggm-combo-list--flush { max-height: none; overflow: visible; }
        .ggm-combo-row {
          display: flex;
          align-items: center;
          gap: 6px;
          border-radius: 8px;
        }
        .ggm-combo-row:hover { background: var(--bg-card-hover); }
        .ggm-combo-row[data-selected="true"] { background: var(--accent-soft); }
        .ggm-combo-option {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text);
          font-size: 14px;
          font-family: inherit;
          padding: 9px 10px;
          text-align: left;
          cursor: pointer;
          border-radius: 8px;
        }
        .ggm-combo-option--other { color: var(--text-dim); font-style: italic; }

        .ggm-info-wrap { position: relative; display: inline-flex; padding-right: 8px; }
        .ggm-info-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 1px solid var(--border-strong);
          color: var(--text-muted);
          cursor: help;
        }
        .ggm-info-wrap:hover .ggm-info-icon,
        .ggm-info-wrap:focus-within .ggm-info-icon {
          border-color: var(--accent);
          color: var(--accent-ink);
        }
        .ggm-tooltip {
          display: none;
          position: absolute;
          top: 50%;
          right: calc(100% + 8px);
          transform: translateY(-50%);
          width: 240px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-top: 3px solid var(--lh-yellow);
          border-radius: var(--radius);
          padding: 10px 12px;
          box-shadow: var(--shadow-lg);
          z-index: 30;
        }
        .ggm-info-wrap:hover .ggm-tooltip,
        .ggm-info-wrap:focus-within .ggm-tooltip { display: block; }
        .ggm-tooltip-text {
          font-size: 12px;
          color: var(--text);
          line-height: 1.5;
          margin: 0 0 6px;
        }
        .ggm-tooltip-link {
          font-size: 12px;
          font-weight: 600;
          color: var(--accent-ink);
          text-decoration: none;
        }
        .ggm-tooltip-link:hover { text-decoration: underline; }

        .ggm-hint-small { font-size: 12px; color: var(--text-muted); }
        .ggm-field-error {
          font-size: 12px;
          color: var(--danger);
          margin-top: 4px;
        }
        .ggm-clarify {
          border-radius: var(--radius);
          padding: 12px 14px;
          font-size: 13px;
          line-height: 1.5;
        }
        .ggm-clarify--warn {
          background: var(--attention-soft);
          border: 1px solid var(--attention);
          color: var(--attention-ink);
        }
        .ggm-clarify--block {
          background: var(--danger-soft);
          border: 1px solid var(--danger);
          color: var(--danger);
        }
        .ggm-clarify-msg { font-weight: 500; }
        .ggm-clarify-suggestion { margin-top: 4px; opacity: 0.9; }
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
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: ggm-spin 0.7s linear infinite;
          margin-right: 7px;
          vertical-align: middle;
        }
        @keyframes ggm-spin { to { transform: rotate(360deg); } }
        .ggm-success {
          background: var(--success-soft);
          border: 1px solid var(--success);
          border-radius: var(--radius);
          color: var(--success-ink);
          padding: 14px 16px;
          font-size: 14px;
          font-weight: 500;
          text-align: center;
        }
        .ggm-error {
          background: var(--danger-soft);
          border: 1px solid var(--danger);
          border-radius: var(--radius);
          color: var(--danger);
          padding: 14px 16px;
          font-size: 14px;
        }
        .ggm-error-msg { margin-bottom: 10px; }
      `}</style>

      <div
        className="ggm-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose()
        }}
      >
        <div className="ggm-card">
          <h2 className="ggm-title">{t('ggm.title')}</h2>

          {status === 'success' ? (
            <>
              <div className="ggm-success">
                {t('ggm.success')}
              </div>
              <div className="ggm-actions">
                <button className="btn btn-ghost" onClick={handleClose}>
                  {t('common.close')}
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
                  {t('common.retry')}
                </button>
              </div>
              <div className="ggm-actions">
                <button className="btn btn-ghost" onClick={handleClose}>
                  {t('common.cancel')}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* ── 1. Technologie ── */}
              <div className="ggm-field">
                <label className="ggm-label">{t('ggm.labelTech')}</label>
                <div className="ggm-combo" ref={techRef}>
                  <button
                    type="button"
                    className="ggm-combo-trigger"
                    data-placeholder={technologyId === '' ? 'true' : 'false'}
                    onClick={() => setTechOpen((o) => !o)}
                    disabled={techStatus === 'loading'}
                  >
                    <span>
                      {techStatus === 'loading' ? t('ggm.loadingTech') : techLabel}
                    </span>
                    <span className="ggm-combo-caret"><ChevronDown size={16} strokeWidth={2} /></span>
                  </button>

                  {techOpen && (
                    <div className="ggm-combo-list" role="listbox">
                      {technologies.map((tech) => (
                        <div
                          key={tech.id}
                          className="ggm-combo-row"
                          data-selected={technologyId === tech.id ? 'true' : 'false'}
                        >
                          <button
                            type="button"
                            role="option"
                            aria-selected={technologyId === tech.id}
                            className="ggm-combo-option"
                            onClick={() => handleSelectTech(tech.id)}
                          >
                            {tech.label}
                          </button>
                          {(tech.whats_new || tech.source_url) && (
                            <span className="ggm-info-wrap" tabIndex={0}>
                              <span className="ggm-info-icon" aria-hidden="true">i</span>
                              <span className="ggm-tooltip" role="tooltip">
                                {tech.whats_new && (
                                  <p className="ggm-tooltip-text">{tech.whats_new}</p>
                                )}
                                {tech.source_url && (
                                  <a
                                    className="ggm-tooltip-link"
                                    href={tech.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {t('ggm.viewSource')}
                                    {tech.source_name ? ` (${tech.source_name})` : ''} ↗
                                  </a>
                                )}
                              </span>
                            </span>
                          )}
                        </div>
                      ))}

                      <div className="ggm-combo-row" data-selected={technologyId === OTHER ? 'true' : 'false'}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={technologyId === OTHER}
                          className="ggm-combo-option ggm-combo-option--other"
                          onClick={() => handleSelectTech(OTHER)}
                        >
                          {t('ggm.other')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {techStatus === 'empty' && (
                  <span className="ggm-hint-small">
                    {t('ggm.techEmpty')}
                  </span>
                )}
                {techStatus === 'error' && (
                  <span className="ggm-hint-small">
                    {t('ggm.techError')}
                  </span>
                )}

                {technologyId === OTHER && (
                  <>
                    <input
                      type="text"
                      className="ggm-input"
                      placeholder={t('ggm.techInput')}
                      value={technologyCustom}
                      onChange={(e) => {
                        setTechnologyCustom(e.target.value)
                        clearFeedback()
                      }}
                      style={{ marginTop: 6 }}
                    />
                    {fieldErrors.technologyCustom && (
                      <span className="ggm-field-error">{fieldErrors.technologyCustom}</span>
                    )}
                  </>
                )}
              </div>

              {/* ── 2. Lernziel ── */}
              <div className="ggm-field">
                <label className="ggm-label">{t('ggm.labelGoal')}</label>
                <div className="ggm-combo" ref={goalRef}>
                  <button
                    type="button"
                    className="ggm-combo-trigger"
                    data-placeholder={learningGoal === '' ? 'true' : 'false'}
                    onClick={() => setGoalOpen((o) => !o)}
                  >
                    <span>{goalLabel}</span>
                    <span className="ggm-combo-caret"><ChevronDown size={16} strokeWidth={2} /></span>
                  </button>

                  {goalOpen && (
                    <div className="ggm-combo-list" role="listbox">
                      {LEARNING_GOALS.map((g) => (
                        <div
                          key={g.value}
                          className="ggm-combo-row"
                          data-selected={learningGoal === g.value ? 'true' : 'false'}
                        >
                          <button
                            type="button"
                            role="option"
                            aria-selected={learningGoal === g.value}
                            className="ggm-combo-option"
                            onClick={() => handleSelectGoal(g.value)}
                          >
                            {t(g.labelKey)}
                          </button>
                          <span className="ggm-info-wrap" tabIndex={0}>
                            <span className="ggm-info-icon" aria-hidden="true">i</span>
                            <span className="ggm-tooltip" role="tooltip">
                              <p className="ggm-tooltip-text">{t(g.descKey)}</p>
                            </span>
                          </span>
                        </div>
                      ))}

                      <div className="ggm-combo-row" data-selected={learningGoal === OTHER ? 'true' : 'false'}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={learningGoal === OTHER}
                          className="ggm-combo-option ggm-combo-option--other"
                          onClick={() => handleSelectGoal(OTHER)}
                        >
                          {t('ggm.other')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {learningGoal === OTHER && (
                  <>
                    <input
                      type="text"
                      className="ggm-input"
                      placeholder={t('ggm.goalInput')}
                      value={learningGoalCustom}
                      onChange={(e) => {
                        setLearningGoalCustom(e.target.value)
                        clearFeedback()
                      }}
                      style={{ marginTop: 6 }}
                    />
                    {fieldErrors.learningGoalCustom && (
                      <span className="ggm-field-error">{fieldErrors.learningGoalCustom}</span>
                    )}
                  </>
                )}
              </div>

              {/* ── 3. Spieltyp ── */}
              <div className="ggm-field">
                <label className="ggm-label">{t('ggm.labelGameType')}</label>
                <div className="ggm-combo" ref={gameTypeRef}>
                  <button
                    type="button"
                    className="ggm-combo-trigger"
                    onClick={() => setGameTypeOpen((o) => !o)}
                  >
                    <span>{gameTypeLabel}</span>
                    <span className="ggm-combo-caret"><ChevronDown size={16} strokeWidth={2} /></span>
                  </button>

                  {gameTypeOpen && (
                    <div className="ggm-combo-list ggm-combo-list--flush" role="listbox">
                      {GAME_TYPES.map((g) => (
                        <div
                          key={g.value}
                          className="ggm-combo-row"
                          data-selected={gameType === g.value ? 'true' : 'false'}
                        >
                          <button
                            type="button"
                            role="option"
                            aria-selected={gameType === g.value}
                            className="ggm-combo-option"
                            onClick={() => handleSelectGameType(g.value)}
                          >
                            {g.label}
                          </button>
                          <span className="ggm-info-wrap" tabIndex={0}>
                            <span className="ggm-info-icon" aria-hidden="true">i</span>
                            <span className="ggm-tooltip" role="tooltip">
                              <p className="ggm-tooltip-text">{t(g.descKey)}</p>
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── 4. Schwierigkeit ── */}
              <div className="ggm-field">
                <label className="ggm-label">{t('ggm.labelDifficulty')}</label>
                <select
                  className="ggm-select"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {t(d.labelKey)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Schicht-2-Klärung: warn (Hinweis + Trotzdem fortfahren) / block (nur Hinweis) */}
              {clarify && (
                <div className={clarify.verdict === 'block' ? 'ggm-clarify ggm-clarify--block' : 'ggm-clarify ggm-clarify--warn'}>
                  <div className="ggm-clarify-msg">{clarify.message}</div>
                  {clarify.suggestion && (
                    <div className="ggm-clarify-suggestion">{t('ggm.suggestion', { suggestion: clarify.suggestion })}</div>
                  )}
                  {clarify.verdict === 'warn' && (
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: 13, marginTop: 8 }}
                      onClick={() => handleGenerate(true)}
                      disabled={status === 'loading'}
                    >
                      {t('pa.continueAnyway')}
                    </button>
                  )}
                </div>
              )}

              <div className="ggm-actions">
                <button
                  className="btn btn-ghost"
                  onClick={handleClose}
                  disabled={status === 'loading'}
                >
                  {t('common.cancel')}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => handleGenerate(false)}
                  disabled={!canSubmit}
                >
                  {status === 'loading' && <span className="ggm-spinner" />}
                  {status === 'loading' ? t('ggm.checking') : t('ggm.generate')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
