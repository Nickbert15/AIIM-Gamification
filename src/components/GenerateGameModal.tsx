'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  isOpen: boolean
  onClose: () => void
}

type Status = 'idle' | 'loading' | 'success' | 'error'
type TechStatus = 'loading' | 'success' | 'empty' | 'error'
type Difficulty = 'easy' | 'medium' | 'hard'
type GameType = 'excel_challenge' | 'hallucination_spotter_v2' | 'prompt_arena'

interface Technology {
  id: string
  label: string
  whats_new: string | null
  source_url: string | null
  source_name: string | null
  created_at: string
}

const OTHER = 'other'

// Statische Lernziel-Liste (bewusst keine DB-Tabelle).
const LEARNING_GOALS: { value: string; label: string; description: string }[] = [
  { value: 'finanzabschluss', label: 'Finanzabschluss', description: 'Erstellung des Jahres- oder Periodenabschlusses nach HGB/IFRS.' },
  { value: 'buchhaltung', label: 'Buchhaltung', description: 'Erfassung und Verbuchung laufender Geschäftsvorfälle.' },
  { value: 'controlling', label: 'Controlling', description: 'Planung, Steuerung und Kontrolle betrieblicher Kennzahlen.' },
  { value: 'reporting', label: 'Reporting', description: 'Aufbereitung von Finanzdaten für interne und externe Berichte.' },
  { value: 'kostenrechnung', label: 'Kostenrechnung', description: 'Erfassung und Zuordnung von Kosten auf Kostenstellen und -träger.' },
  { value: 'konsolidierung', label: 'Konsolidierung', description: 'Zusammenführung von Einzelabschlüssen zum Konzernabschluss.' },
  { value: 'steuern', label: 'Steuern', description: 'Steuerliche Bewertung und Deklaration von Geschäftsvorfällen.' },
  { value: 'treasury', label: 'Treasury', description: 'Steuerung von Liquidität, Zahlungsverkehr und Finanzrisiken.' },
]

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Einfach' },
  { value: 'medium', label: 'Mittel' },
  { value: 'hard', label: 'Schwer' },
]

// Werte identisch mit der Spalte games.format.
const GAME_TYPES: { value: GameType; label: string }[] = [
  { value: 'excel_challenge', label: 'Excel Challenge' },
  { value: 'hallucination_spotter_v2', label: 'Hallucination Spotter' },
  { value: 'prompt_arena', label: 'Prompt Arena' },
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
  const [technologies, setTechnologies] = useState<Technology[]>([])
  const [techStatus, setTechStatus] = useState<TechStatus>('loading')
  const [technologyId, setTechnologyId] = useState('')
  const [technologyCustom, setTechnologyCustom] = useState('')
  const [techOpen, setTechOpen] = useState(false)

  const [learningGoal, setLearningGoal] = useState('')
  const [learningGoalCustom, setLearningGoalCustom] = useState('')
  const [goalOpen, setGoalOpen] = useState(false)

  const [gameType, setGameType] = useState<GameType>('excel_challenge')
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

  if (!isOpen) return null

  const selectedTech = technologies.find((t) => t.id === technologyId)
  const techLabel =
    technologyId === OTHER
      ? 'Sonstiges'
      : selectedTech?.label ?? 'Technologie wählen…'

  const selectedGoal = LEARNING_GOALS.find((g) => g.value === learningGoal)
  const goalLabel =
    learningGoal === OTHER
      ? 'Sonstiges'
      : selectedGoal?.label ?? 'Lernziel wählen…'

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
        setClarify({ verdict: 'block', message: data.message ?? 'Eingabe nicht verwendbar.', suggestion: null })
        setStatus('idle')
        return
      }
      if (data.verdict === 'warn') {
        setClarify({
          verdict: 'warn',
          message: data.message ?? 'Eingabe ist grenzwertig.',
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
          : data.errors ?? 'Unbekannter Fehler'
        setErrorMessage(`Generierung fehlgeschlagen: ${msg}`)
        setStatus('error')
        return
      }

      setErrorMessage(data.error ?? 'Unbekannter Fehler')
      setStatus('error')
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
        .ggm-input, .ggm-select {
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
        .ggm-input:focus, .ggm-select:focus {
          border-color: var(--accent);
        }
        .ggm-select option {
          background: var(--bg-card);
        }

        /* Custom Technologie-Dropdown (native select kann keine Info-Icons/Tooltips pro Eintrag) */
        .ggm-combo { position: relative; width: 100%; }
        .ggm-combo-trigger {
          background: var(--bg);
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
          transition: border-color 0.15s;
        }
        .ggm-combo-trigger:hover, .ggm-combo-trigger:focus { border-color: var(--accent); }
        .ggm-combo-trigger[data-placeholder="true"] { color: var(--text-muted); }
        .ggm-combo-caret { color: var(--text-muted); flex-shrink: 0; }
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
          box-shadow: 0 10px 30px rgba(0,0,0,0.35);
        }
        .ggm-combo-row {
          display: flex;
          align-items: center;
          gap: 6px;
          border-radius: 8px;
        }
        .ggm-combo-row:hover { background: rgba(148,163,184,0.08); }
        .ggm-combo-row[data-selected="true"] { background: rgba(14,165,233,0.1); }
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
          border: 1px solid var(--border);
          color: var(--text-muted);
          font-size: 11px;
          font-style: normal;
          font-weight: 700;
          cursor: help;
        }
        .ggm-info-wrap:hover .ggm-info-icon,
        .ggm-info-wrap:focus-within .ggm-info-icon {
          border-color: var(--accent);
          color: var(--accent);
        }
        .ggm-tooltip {
          display: none;
          position: absolute;
          top: 50%;
          right: calc(100% + 8px);
          transform: translateY(-50%);
          width: 240px;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 10px 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.4);
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
          color: var(--accent);
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
          background: rgba(245,158,11,0.1);
          border: 1px solid rgba(245,158,11,0.35);
          color: #f59e0b;
        }
        .ggm-clarify--block {
          background: rgba(239,68,68,0.1);
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
        .ggm-error-msg { margin-bottom: 10px; }
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
                Anfrage erfasst. Die Spielgenerierung wird angestoßen.
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
              {/* ── 1. Technologie ── */}
              <div className="ggm-field">
                <label className="ggm-label">Technologie *</label>
                <div className="ggm-combo" ref={techRef}>
                  <button
                    type="button"
                    className="ggm-combo-trigger"
                    data-placeholder={technologyId === '' ? 'true' : 'false'}
                    onClick={() => setTechOpen((o) => !o)}
                    disabled={techStatus === 'loading'}
                  >
                    <span>
                      {techStatus === 'loading' ? 'Lade Technologien…' : techLabel}
                    </span>
                    <span className="ggm-combo-caret">▾</span>
                  </button>

                  {techOpen && (
                    <div className="ggm-combo-list" role="listbox">
                      {technologies.map((t) => (
                        <div
                          key={t.id}
                          className="ggm-combo-row"
                          data-selected={technologyId === t.id ? 'true' : 'false'}
                        >
                          <button
                            type="button"
                            role="option"
                            aria-selected={technologyId === t.id}
                            className="ggm-combo-option"
                            onClick={() => handleSelectTech(t.id)}
                          >
                            {t.label}
                          </button>
                          {(t.whats_new || t.source_url) && (
                            <span className="ggm-info-wrap" tabIndex={0}>
                              <span className="ggm-info-icon" aria-hidden="true">i</span>
                              <span className="ggm-tooltip" role="tooltip">
                                {t.whats_new && (
                                  <p className="ggm-tooltip-text">{t.whats_new}</p>
                                )}
                                {t.source_url && (
                                  <a
                                    className="ggm-tooltip-link"
                                    href={t.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    Quelle ansehen
                                    {t.source_name ? ` (${t.source_name})` : ''} ↗
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
                          Sonstiges
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {techStatus === 'empty' && (
                  <span className="ggm-hint-small">
                    Keine Technologien gefunden — wähle „Sonstiges".
                  </span>
                )}
                {techStatus === 'error' && (
                  <span className="ggm-hint-small">
                    Technologien konnten nicht geladen werden — wähle „Sonstiges".
                  </span>
                )}

                {technologyId === OTHER && (
                  <>
                    <input
                      type="text"
                      className="ggm-input"
                      placeholder="Technologie eingeben…"
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
                <label className="ggm-label">Lernziel *</label>
                <div className="ggm-combo" ref={goalRef}>
                  <button
                    type="button"
                    className="ggm-combo-trigger"
                    data-placeholder={learningGoal === '' ? 'true' : 'false'}
                    onClick={() => setGoalOpen((o) => !o)}
                  >
                    <span>{goalLabel}</span>
                    <span className="ggm-combo-caret">▾</span>
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
                            {g.label}
                          </button>
                          <span className="ggm-info-wrap" tabIndex={0}>
                            <span className="ggm-info-icon" aria-hidden="true">i</span>
                            <span className="ggm-tooltip" role="tooltip">
                              <p className="ggm-tooltip-text">{g.description}</p>
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
                          Sonstiges
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
                      placeholder="Lernziel eingeben…"
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
                <label className="ggm-label">Spieltyp</label>
                <select
                  className="ggm-select"
                  value={gameType}
                  onChange={(e) => setGameType(e.target.value as GameType)}
                >
                  {GAME_TYPES.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* ── 4. Schwierigkeit ── */}
              <div className="ggm-field">
                <label className="ggm-label">Schwierigkeit</label>
                <select
                  className="ggm-select"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Schicht-2-Klärung: warn (Hinweis + Trotzdem fortfahren) / block (nur Hinweis) */}
              {clarify && (
                <div className={clarify.verdict === 'block' ? 'ggm-clarify ggm-clarify--block' : 'ggm-clarify ggm-clarify--warn'}>
                  <div className="ggm-clarify-msg">{clarify.message}</div>
                  {clarify.suggestion && (
                    <div className="ggm-clarify-suggestion">Vorschlag: {clarify.suggestion}</div>
                  )}
                  {clarify.verdict === 'warn' && (
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: 13, marginTop: 8 }}
                      onClick={() => handleGenerate(true)}
                      disabled={status === 'loading'}
                    >
                      Trotzdem fortfahren
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
                  Abbrechen
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => handleGenerate(false)}
                  disabled={!canSubmit}
                >
                  {status === 'loading' && <span className="ggm-spinner" />}
                  {status === 'loading' ? 'Wird geprüft…' : 'Generieren'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
