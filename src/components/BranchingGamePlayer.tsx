'use client'

import { useState } from 'react'
import { Award, Star, TrendingUp, Zap, type LucideIcon } from 'lucide-react'
import { Game, BranchNode, BranchOption } from '@/types/game'
import GamePopup from './ui/GamePopup'
import ScoreCounter from './ui/ScoreCounter'
import Badge from './ui/Badge'
import ConfettiBurst from './ui/ConfettiBurst'
import StepIndicator from './ui/StepIndicator'
import HowToPlay from './ui/HowToPlay'
import { useI18n } from '@/lib/i18n'

interface Props {
  game: Game
  onComplete: (score: number) => void
}

type PopupStage = 'preview' | 'confirmed' | null

interface PathEntry {
  id: string
  label: string
  points: number
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

export default function BranchingGamePlayer({ game, onComplete }: Props) {
  const { t } = useI18n()
  const branching = game.game_json?.branching

  const [nodeId, setNodeId] = useState(branching?.startNode ?? '')
  const [totalScore, setTotalScore] = useState(0)
  const [path, setPath] = useState<PathEntry[]>([])
  const [howToPlayOpen, setHowToPlayOpen] = useState(true)
  const [reported, setReported] = useState(false)

  // Popup-Flow für prompt_choice-Runden (Erstwahl + Nachsteuern)
  const [previewOption, setPreviewOption] = useState<BranchOption | null>(null)
  const [popupStage, setPopupStage] = useState<PopupStage>(null)

  // Inline-Reflexion (diagnosis)
  const [diagnosisSelected, setDiagnosisSelected] = useState<BranchOption | null>(null)

  if (!branching) return null

  const maxPoints = branching.scoring?.maxPoints ?? 10
  const node: BranchNode | undefined = branching.nodes[nodeId]

  if (!node) {
    return <div className="empty-state-text">{t('bn.nodeNotFound', { id: nodeId })}</div>
  }

  function finishIfEnd(targetId: string) {
    const target = branching!.nodes[targetId]
    if (target?.type === 'end' && !reported) {
      setReported(true)
      // Leaderboard-Score einheitlich als Prozent (0–100), damit alle Spieltypen vergleichbar sind.
      onComplete(maxPoints > 0 ? Math.round((totalScore / maxPoints) * 100) : 0)
    }
  }

  /* Klick auf eine Prompt-Karte -> Popup 1 (Ergebnis-Vorschau) öffnen, noch nicht gewertet.
     Führt eine Option ausnahmsweise nicht zu einem output_review-Knoten (z. B. eine
     Korrektur-Option, die direkt zu einem Hinweistext springt, ohne neuen Prompt an die
     KI zu schicken), gibt es nichts zu previewen — dann sofort werten und weiterspringen. */
  function handlePreview(option: BranchOption) {
    const target = branching!.nodes[option.nextNode]
    if (target?.type !== 'output_review') {
      setTotalScore(s => s + option.points)
      setPath(p => [...p, { id: option.id, label: option.label, points: option.points }])
      setNodeId(option.nextNode)
      return
    }
    setPreviewOption(option)
    setPopupStage('preview')
  }

  /* Popup 1: "Neu auswählen" -> zurück zur Kartenauswahl, nichts wird gewertet */
  function handleReselect() {
    setPreviewOption(null)
    setPopupStage(null)
  }

  /* Popup 1: "Abschicken" -> Auswahl bestätigen, Button wird zu "Weiter" */
  function handleAbschicken() {
    setPopupStage('confirmed')
  }

  /* Popup 1: "Weiter" -> Punkte werden vergeben, Knoten wechselt zum Ergebnis, Popup 2 öffnet */
  function handleConfirmChoice() {
    if (!previewOption) return
    const { id, label, points, nextNode } = previewOption
    setTotalScore(s => s + points)
    setPath(p => [...p, { id, label, points }])
    setPreviewOption(null)
    setNodeId(nextNode)
    setPopupStage(null)
  }

  /* Popup 2: "Weiter" -> Popup schließen, zum Folgeknoten (Diagnose/Info/Ende) */
  function handleAfterResult() {
    const next = node!.nextNode
    if (!next) return
    finishIfEnd(next)
    setNodeId(next)
  }

  function handleDiagnosisSelect(option: BranchOption) {
    if (diagnosisSelected) return
    setDiagnosisSelected(option)
    setTotalScore(s => s + option.points)
    setPath(p => [...p, { id: option.id, label: option.label, points: option.points }])
  }

  function handleDiagnosisContinue() {
    if (!diagnosisSelected) return
    const next = diagnosisSelected.nextNode
    setDiagnosisSelected(null)
    finishIfEnd(next)
    setNodeId(next)
  }

  function handleInfoContinue(next: string) {
    finishIfEnd(next)
    setNodeId(next)
  }

  const previewNode = previewOption ? branching.nodes[previewOption.nextNode] : null
  const stepIndex = path.length === 0 ? 0 : 1

  return (
    <>
      <style>{pnavStyles}</style>

      <HowToPlay
        open={howToPlayOpen}
        title={t('bn.htpTitle')}
        termExplanation={t('bn.htpTerm')}
        steps={[
          { text: t('bn.htpStep1') },
          { text: t('bn.htpStep2') },
          { text: t('bn.htpStep3') },
        ]}
        onDismiss={() => setHowToPlayOpen(false)}
      />

      {/* ---------- Recap / Ende ---------- */}
      {node.type === 'end' && (() => {
        const pct = maxPoints > 0 ? Math.round((totalScore / maxPoints) * 100) : 0
        const badges: { icon: LucideIcon; label: string }[] = []
        if (pct >= 90) badges.push({ icon: Award, label: t('bn.badgePro') })
        else if (pct >= 60) badges.push({ icon: Star, label: t('bn.badgeGood') })
        else badges.push({ icon: TrendingUp, label: t('bn.badgePractice') })
        const volltreffer = path[0]?.id === 'prompt_d'
        if (volltreffer) badges.push({ icon: Zap, label: t('bn.badgeBullseye') })

        return (
          <div className="pnav-container">
            {(pct >= 80 || volltreffer) && <ConfettiBurst />}
            <div className="pnav-score-screen">
              <ScoreCounter value={pct} suffix="/100" className="pnav-score-number" />
              <div className="pnav-score-msg">
                {pct >= 80
                  ? t('bn.scoreHigh')
                  : pct >= 60
                  ? t('bn.scoreMid')
                  : t('bn.scoreLow')}
              </div>
              <div className="pnav-badges-row">
                {badges.map(b => <Badge key={b.label} icon={b.icon} label={b.label} />)}
              </div>
            </div>

            {path.length > 0 && (
              <div className="pnav-recap-card">
                <span className="pnav-label">{node.recapIntro ?? t('bn.decisions')}</span>
                <div className="pnav-timeline">
                  {path.map((entry, i) => (
                    <div key={i} className={`pnav-timeline-item ${entry.points > 0 ? 'is-positive' : 'is-neutral'}`}>
                      <span className="pnav-timeline-icon" aria-hidden="true">{entry.points > 0 ? '✓' : '✗'}</span>
                      <span className="pnav-timeline-label">{entry.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {node.lessons && node.lessons.length > 0 && (
              <div className="pnav-lessons">
                {node.lessons.map((lesson, i) => (
                  <div key={i} className="pnav-lesson">
                    <span className="pnav-lesson-tag">{lesson.craftElement}</span>
                    <p className="pnav-lesson-text">{lesson.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* ---------- Info-Zwischenknoten ---------- */}
      {node.type === 'info' && (
        <div className="pnav-container">
          <div className="pnav-info-card">{node.text}</div>
          <div className="pnav-next-row">
            <button className="btn btn-primary" onClick={() => handleInfoContinue(node.nextNode!)}>
              {t('bn.continue')}
            </button>
          </div>
        </div>
      )}

      {/* ---------- Reflexion (diagnosis), inline ---------- */}
      {node.type === 'diagnosis' && (
        <div className="pnav-container">
          <StepIndicator steps={[t('bn.stepChoose'), t('bn.stepResult')]} currentIndex={stepIndex} />
          <p className="pnav-question">{node.text}</p>

          <div className="pnav-options">
            {(node.options ?? []).map(option => {
              const isChosen = diagnosisSelected?.id === option.id
              return (
                <button
                  key={option.id}
                  className={`pnav-option ${isChosen ? 'chosen' : ''} ${diagnosisSelected && !isChosen ? 'dimmed' : ''}`}
                  onClick={() => handleDiagnosisSelect(option)}
                  disabled={!!diagnosisSelected}
                >
                  {option.label}
                </button>
              )
            })}
          </div>

          {diagnosisSelected?.feedback && (
            <div className="pnav-feedback" role="status">
              <span className="pnav-feedback-label">
                {diagnosisSelected.points > 0 ? t('bn.diagCorrect') : t('bn.diagRemember')}
              </span>
              {diagnosisSelected.feedback}
            </div>
          )}

          {diagnosisSelected && (
            <div className="pnav-next-row">
              <button className="btn btn-primary" onClick={handleDiagnosisContinue}>
                {t('bn.continue')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ---------- prompt_choice: Karten + Popup 1 ---------- */}
      {node.type === 'prompt_choice' && (
        <div className="pnav-container">
          <StepIndicator steps={[t('bn.stepChoose'), t('bn.stepResult')]} currentIndex={stepIndex} />

          {nodeId === branching.startNode && (
            <div className="pnav-scenario-card">
              <span className="pnav-label">{t('bn.yourScenario')}</span>
              <p className="pnav-scenario-text">{branching.scenario.intro}</p>
            </div>
          )}

          <p className="pnav-question">{node.text}</p>

          <div className="pnav-choice-grid">
            {(node.options ?? []).map((option, i) => (
              <button key={option.id} className="pnav-choice-card" onClick={() => handlePreview(option)}>
                <span className="pnav-choice-badge" aria-hidden="true">{LETTERS[i]}</span>
                <span className="pnav-choice-body">
                  <span className="pnav-option-label">{option.label}</span>
                  {option.promptText && <span className="pnav-option-prompt">{option.promptText}</span>}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---------- output_review: reiner Score-Popup, kein eigener Screen ---------- */}
      {node.type === 'output_review' && <div className="pnav-container" />}

      <GamePopup
        open={!!previewOption}
        title={previewOption ? t('bn.aiReactsTo', { label: previewOption.label }) : ''}
        onClose={popupStage === 'preview' ? handleReselect : undefined}
      >
        <div className="pnav-ai-output">
          <span className="pnav-label">{t('bn.aiAssistantAnswer')}</span>
          <div className="pnav-ai-text">{previewNode?.aiOutput}</div>
        </div>

        {popupStage === 'confirmed' ? (
          <div className="pnav-popup-footer">
            <span className="pnav-confirmed-tag">{t('bn.confirmedTag')}</span>
            <button className="btn btn-primary" onClick={handleConfirmChoice} autoFocus>
              {t('bn.continue')}
            </button>
          </div>
        ) : (
          <div className="pnav-popup-footer">
            <button className="btn btn-ghost" onClick={handleReselect}>
              {t('bn.reselect')}
            </button>
            <button className="btn btn-primary" onClick={handleAbschicken}>
              {t('bn.submit')}
            </button>
          </div>
        )}
      </GamePopup>

      <GamePopup
        open={node.type === 'output_review'}
        title={t('bn.yourResult')}
        variant={node.ratingLabel?.includes('Ausgezeichnet') || node.ratingLabel?.includes('Perfekt') ? 'celebratory' : 'neutral'}
      >
        {(node.ratingLabel?.includes('Ausgezeichnet') || node.ratingLabel?.includes('Perfekt')) && (
          <ConfettiBurst intensity="low" />
        )}
        <div className="pnav-result-card">
          <ScoreCounter value={path[path.length - 1]?.points ?? 0} suffix={t('bn.pointsSuffix')} className="pnav-result-score" />
          {node.ratingLabel && <div className="pnav-result-rating">{node.ratingLabel}</div>}
        </div>

        {node.aiOutput && (
          <div className="pnav-ai-output">
            <span className="pnav-label">{t('bn.outputVerbatim')}</span>
            <div className="pnav-ai-text">{node.aiOutput}</div>
          </div>
        )}

        {node.explanation && <div className="pnav-explanation">{node.explanation}</div>}

        <div className="pnav-popup-footer">
          <button className="btn btn-primary" onClick={handleAfterResult} autoFocus>
            {t('bn.continue')}
          </button>
        </div>
      </GamePopup>
    </>
  )
}

const pnavStyles = `
  .pnav-container {
    padding: 20px 24px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .pnav-label {
    display: block;
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--accent-text);
    margin-bottom: 6px;
  }
  .pnav-scenario-card {
    background: rgba(255,173,0,0.05);
    border: 1px solid rgba(255,173,0,0.2);
    border-radius: var(--radius);
    padding: 16px 18px;
  }
  .pnav-scenario-text {
    font-size: 14.5px;
    color: var(--text);
    line-height: 1.6;
    margin: 0;
  }
  .pnav-ai-output {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 12px 12px 12px 4px;
    padding: 14px 16px;
  }
  .pnav-ai-text {
    font-size: 14px;
    color: var(--text);
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .pnav-question {
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
    line-height: 1.5;
    margin: 0;
  }

  /* Prompt-Auswahl: Kartenraster */
  .pnav-choice-grid { display: flex; flex-direction: column; gap: 12px; }
  .pnav-choice-card {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 16px;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    transition: border-color 0.15s, background 0.15s, transform 0.1s;
    min-height: 48px;
  }
  .pnav-choice-card:hover { border-color: var(--accent); background: rgba(255,173,0,0.06); }
  .pnav-choice-card:active { transform: scale(0.99); }
  .pnav-choice-badge {
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: rgba(255,173,0,0.14);
    color: var(--accent-text);
    font-weight: 800;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pnav-choice-body { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
  .pnav-option-label { font-size: 14.5px; font-weight: 600; color: var(--text); line-height: 1.4; }
  .pnav-option-prompt {
    font-size: 13px;
    color: var(--text-dim);
    line-height: 1.55;
    border-left: 2px solid var(--border);
    padding-left: 10px;
    white-space: pre-wrap;
  }

  /* Diagnose: einspaltige Auswahl (inline) */
  .pnav-options { display: flex; flex-direction: column; gap: 10px; }
  .pnav-option {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 16px;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    font-size: 14px;
    color: var(--text);
    min-height: 48px;
    transition: border-color 0.15s, opacity 0.15s;
  }
  .pnav-option:hover:not(:disabled) { border-color: var(--accent); }
  .pnav-option:disabled { cursor: default; }
  .pnav-option.chosen { border-color: var(--accent); background: rgba(255,173,0,0.08); }
  .pnav-option.dimmed { opacity: 0.45; }

  .pnav-feedback {
    background: rgba(255,173,0,0.08);
    border: 1px solid rgba(255,173,0,0.3);
    border-radius: var(--radius);
    padding: 12px 16px;
    font-size: 13.5px;
    color: var(--accent-text);
    line-height: 1.5;
  }
  .pnav-feedback-label {
    display: block;
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 6px;
  }
  .pnav-explanation {
    background: rgba(255,173,0,0.08);
    border: 1px solid rgba(255,173,0,0.3);
    border-radius: var(--radius);
    padding: 14px 16px;
    font-size: 14px;
    color: var(--text);
    line-height: 1.55;
  }
  .pnav-info-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 18px;
    font-size: 14.5px;
    color: var(--text);
    line-height: 1.6;
  }
  .pnav-next-row { display: flex; justify-content: flex-end; }

  .pnav-popup-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
  }
  .pnav-confirmed-tag { margin-right: auto; font-size: 13px; font-weight: 600; color: var(--success); }

  .pnav-result-card { display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center; }
  .pnav-result-score { font-size: 34px; font-weight: 800; color: var(--accent-text); }
  .pnav-result-rating { font-size: 16px; font-weight: 700; color: var(--text); }

  .pnav-score-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 0 8px;
    gap: 6px;
    text-align: center;
  }
  .pnav-score-number { font-size: 52px; font-weight: 800; color: var(--accent-text); line-height: 1; }
  .pnav-score-pct { font-size: 26px; font-weight: 700; color: var(--text); margin-top: 4px; }
  .pnav-score-msg { font-size: 14.5px; color: var(--text-dim); max-width: 400px; line-height: 1.5; margin-top: 6px; }
  .pnav-badges-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 16px; }

  .pnav-recap-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .pnav-timeline { display: flex; flex-direction: column; gap: 8px; }
  .pnav-timeline-item { display: flex; align-items: flex-start; gap: 10px; font-size: 13.5px; line-height: 1.4; }
  .pnav-timeline-icon {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 800;
    margin-top: 1px;
  }
  .is-positive .pnav-timeline-icon { background: rgba(16,185,129,0.15); color: var(--success); }
  .is-neutral .pnav-timeline-icon { background: rgba(148,163,184,0.15); color: var(--text-muted); }
  .pnav-timeline-label { color: var(--text); padding-top: 2px; }

  .pnav-lessons { display: flex; flex-direction: column; gap: 10px; }
  .pnav-lesson {
    background: rgba(255,173,0,0.05);
    border: 1px solid rgba(255,173,0,0.2);
    border-radius: var(--radius);
    padding: 12px 14px;
  }
  .pnav-lesson-tag {
    display: inline-block;
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--accent-text);
    margin-bottom: 4px;
  }
  .pnav-lesson-text { font-size: 13.5px; color: var(--text); line-height: 1.55; margin: 0; }
`
