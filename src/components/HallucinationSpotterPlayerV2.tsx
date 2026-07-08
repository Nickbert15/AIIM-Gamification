'use client'

import { useMemo, useState } from 'react'
import { Game, HalluPromptOptionV2, HalluRoundV2 } from '@/types/game'
import HallucinationText from './ui/HallucinationText'
import HowToPlay from './ui/HowToPlay'
import GamePopup from './ui/GamePopup'
import ConfettiBurst from './ui/ConfettiBurst'
import ScoreCounter from './ui/ScoreCounter'
import StarRating from './ui/StarRating'
import Badge from './ui/Badge'
import StepIndicator from './ui/StepIndicator'
import ConfidenceSlider from './ui/ConfidenceSlider'

interface Props {
  game: Game
  onComplete: (result: {
    score: number
    maxPoints: number
    chosenPromptId: number | null
    correctCount: number
    totalHallucinations: number
    falsePositives: number
    confidenceLevel: number
  }) => void
}

type Step = 'choose' | 'marking'

function qualityToStars(quality: number): 1 | 2 | 3 {
  if (quality >= 75) return 3
  if (quality >= 40) return 2
  return 1
}

export default function HallucinationSpotterPlayerV2({ game, onComplete }: Props) {
  const round = game.game_json.halluRound as HalluRoundV2 | undefined
  const promptOptions = round?.promptOptions ?? []
  const sentences = round?.answer.sentences ?? []

  const [howToPlayOpen, setHowToPlayOpen] = useState(true)
  const [step, setStep] = useState<Step>('choose')
  const [chosenId, setChosenId] = useState<number | null>(null)
  const [promptFeedbackOpen, setPromptFeedbackOpen] = useState(false)
  const [markedIds, setMarkedIds] = useState<Set<number>>(new Set())
  const [confidencePopupOpen, setConfidencePopupOpen] = useState(false)
  const [confidenceValue, setConfidenceValue] = useState(3)
  const [resultOpen, setResultOpen] = useState(false)
  const [completed, setCompleted] = useState(false)

  const chosen: HalluPromptOptionV2 | null = promptOptions.find(p => p.id === chosenId) ?? null

  const totalHallucinations = useMemo(
    () => sentences.filter(s => s.isHallucination).length,
    [sentences]
  )
  const correctCount = useMemo(
    () => sentences.filter(s => s.isHallucination && markedIds.has(s.id)).length,
    [sentences, markedIds]
  )
  const falsePositives = useMemo(
    () => sentences.filter(s => !s.isHallucination && markedIds.has(s.id)).length,
    [sentences, markedIds]
  )

  const stars: 0 | 1 | 2 | 3 = chosen ? qualityToStars(chosen.quality) : 0
  const markingScore = Math.max(0, correctCount * 2 - falsePositives)
  const totalScore = stars + markingScore
  const maxPoints = 3 + totalHallucinations * 2

  const recall = totalHallucinations > 0 ? correctCount / totalHallucinations : 1
  const highConfidence = confidenceValue >= 4
  const lowConfidence = confidenceValue <= 1
  let calibrationMessage: string
  if (highConfidence && recall < 0.5) {
    calibrationMessage = `Du warst dir sehr sicher, hast aber nur ${correctCount} von ${totalHallucinations} erfundenen Stellen gefunden. Bei KI-Texten lohnt sich gesundes Misstrauen — auch wenn ein Text überzeugend klingt.`
  } else if (lowConfidence && recall >= 0.7) {
    calibrationMessage = `Du warst unsicher, lagst aber goldrichtig — du hast ${correctCount} von ${totalHallucinations} erfundenen Stellen gefunden. Vertrau deinem Urteil ruhig etwas mehr!`
  } else if (recall >= 0.7) {
    calibrationMessage = `Gut eingeschätzt: deine Sicherheit passt zu deinem starken Ergebnis (${correctCount} von ${totalHallucinations} gefunden).`
  } else {
    calibrationMessage = `Deine Einschätzung passt ungefähr zu deinem Ergebnis (${correctCount} von ${totalHallucinations} gefunden) — mit etwas Übung wird die Trefferquote noch besser.`
  }

  function choosePrompt(id: number) {
    if (chosenId !== null) return
    setChosenId(id)
    setPromptFeedbackOpen(true)
  }

  function closePromptFeedback() {
    setPromptFeedbackOpen(false)
    setStep('marking')
  }

  function toggleSentence(id: number) {
    setMarkedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openConfidencePopup() {
    setConfidencePopupOpen(true)
  }

  function confirmConfidence() {
    setConfidencePopupOpen(false)
    setResultOpen(true)
    if (!completed) {
      setCompleted(true)
      onComplete({
        score: totalScore,
        maxPoints,
        chosenPromptId: chosenId,
        correctCount,
        totalHallucinations,
        falsePositives,
        confidenceLevel: confidenceValue,
      })
    }
  }

  if (!round || !promptOptions.length || !sentences.length) return null

  const scorePct = maxPoints > 0 ? totalScore / maxPoints : 0
  const showConfetti = resultOpen && scorePct >= 0.7

  return (
    <>
      <style>{hsv2Styles}</style>

      <HowToPlay
        open={howToPlayOpen}
        title="So funktioniert Hallucination Spotter"
        termExplanation={
          'Eine „Halluzination" ist, wenn eine KI etwas erfindet, das überzeugend klingt, aber nicht stimmt — ' +
          'zum Beispiel eine Zahl, ein Gesetz oder einen Namen, den es gar nicht gibt.'
        }
        steps={[
          { icon: '1️⃣', text: 'Du wählst einen von 5 möglichen Prompts (Anfragen an die KI) zu einer Finance-Situation aus.' },
          { icon: '2️⃣', text: 'Du liest die KI-Antwort und klickst jeden Satz an, den du für erfunden hältst.' },
          { icon: '3️⃣', text: 'Du gibst an, wie sicher du dir insgesamt bist, und siehst danach deine Auswertung mit Erklärungen.' },
        ]}
        onDismiss={() => setHowToPlayOpen(false)}
      />

      <div className="hsv2-container">
        <StepIndicator
          steps={['Prompt wählen', 'Halluzinationen markieren']}
          currentIndex={step === 'choose' ? 0 : 1}
        />

        {step === 'choose' && (
          <>
            <p className="hsv2-intro">Situation: {round.situation}</p>
            <p className="hsv2-instruction">
              Das sind 5 Prompts, die man zu dieser Situation an eine KI schicken könnte. Wähle den,
              der die zuverlässigste — also am wenigsten erfundene — Antwort liefern würde:
            </p>
            <div className="hsv2-prompt-list">
              {promptOptions.map(p => (
                <button
                  key={p.id}
                  className={`hsv2-prompt-card ${chosenId === p.id ? 'chosen' : ''} ${chosenId !== null && chosenId !== p.id ? 'dimmed' : ''}`}
                  onClick={() => choosePrompt(p.id)}
                  disabled={chosenId !== null}
                >
                  {p.text}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'marking' && (
          <>
            <div className="hsv2-prompt-recap">Du hast diesen Prompt gewählt: „{chosen?.text}"</div>
            <p className="hsv2-instruction">
              Das hat die KI auf diesen Prompt geantwortet. Fahre mit der Maus über den Text — der
              Satz wird hervorgehoben. Klicke jeden Satz an, den du für erfunden hältst.
            </p>
            <HallucinationText sentences={sentences} markedIds={markedIds} onToggle={toggleSentence} />
            <div className="hsv2-next-row">
              <button className="btn btn-primary" onClick={openConfidencePopup}>
                Weiter →
              </button>
            </div>
          </>
        )}
      </div>

      <GamePopup open={promptFeedbackOpen} title="Dein Prompt im Check" onClose={closePromptFeedback}>
        {chosen && (
          <>
            <StarRating stars={stars} />
            <p className="hsv2-popup-text">{chosen.feedback}</p>
            {!chosen.isRecommended && (
              <p className="hsv2-popup-hint">
                Der beste Prompt in dieser Auswahl bat die KI, unsichere Angaben zu kennzeichnen —
                so erfindet sie seltener etwas.
              </p>
            )}
            {stars === 3 && <ConfettiBurst intensity="low" />}
            <div className="hsv2-next-row">
              <button className="btn btn-primary" onClick={closePromptFeedback}>
                Weiter zum Text →
              </button>
            </div>
          </>
        )}
      </GamePopup>

      <GamePopup open={confidencePopupOpen} title="Wie sicher bist du dir?">
        <ConfidenceSlider
          value={confidenceValue}
          onChange={setConfidenceValue}
          question="Wie sicher bist du dir insgesamt bei deiner Auswahl an markierten Sätzen?"
        />
        <div className="hsv2-next-row">
          <button className="btn btn-primary" onClick={confirmConfidence}>
            Finale Auswertung anzeigen
          </button>
        </div>
      </GamePopup>

      <GamePopup open={resultOpen} title="Deine Auswertung" variant="celebratory">
        {showConfetti && <ConfettiBurst />}
        <div className="hsv2-result-card">
          <ScoreCounter value={totalScore} className="hsv2-score-number" suffix={`/${maxPoints}`} />
          <div className="hsv2-score-label">Punkte erreicht</div>
          {scorePct >= 0.7 && <Badge label="Halluzinations-Späher" icon="🕵️" />}
        </div>

        <div className="hsv2-summary-line">
          Gefundene erfundene Stellen: <strong>{correctCount} von {totalHallucinations}</strong>
          {falsePositives > 0 && (
            <>
              {' '}· Fälschlich markiert: <strong>{falsePositives}</strong>{' '}
              ({falsePositives === 1 ? 'ein Satz war eigentlich korrekt' : `${falsePositives} Sätze waren eigentlich korrekt`}
              {' '}— kein Problem, das ist knifflig.)
            </>
          )}
        </div>

        <div className="hsv2-calibration">{calibrationMessage}</div>

        <p className="hsv2-instruction">
          Hier ist der Text nochmal — grün: richtig erkannt, rot: fälschlich markiert, gelb gestrichelt:
          übersehen. Klicke einen Satz für die Erklärung.
        </p>
        <HallucinationText sentences={sentences} markedIds={markedIds} onToggle={toggleSentence} revealMode />

        <div className="hsv2-lesson">
          Merke: Zahlen, Gesetze und Namen von einer KI immer prüfen.
        </div>
      </GamePopup>
    </>
  )
}

const hsv2Styles = `
  .hsv2-container {
    padding: 20px 24px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .hsv2-intro {
    background: rgba(14,165,233,0.05);
    border: 1px solid rgba(14,165,233,0.2);
    border-radius: var(--radius);
    padding: 14px 16px;
    font-size: 13px;
    color: var(--text-dim);
    line-height: 1.5;
    margin: 0;
  }
  .hsv2-instruction {
    font-size: 13px;
    color: var(--text-dim);
    margin: 0;
  }
  .hsv2-prompt-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .hsv2-prompt-card {
    text-align: left;
    padding: 14px 16px;
    min-height: 44px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    cursor: pointer;
    font-size: 14px;
    line-height: 1.5;
    font-family: inherit;
    transition: border-color 0.15s ease, background-color 0.15s ease, opacity 0.2s ease;
  }
  .hsv2-prompt-card:hover:not(:disabled) {
    border-color: var(--accent);
    background: rgba(14,165,233,0.06);
  }
  .hsv2-prompt-card.chosen {
    border-color: var(--accent);
    background: rgba(14,165,233,0.1);
  }
  .hsv2-prompt-card.dimmed { opacity: 0.4; }
  .hsv2-prompt-card:disabled { cursor: default; }
  .hsv2-prompt-recap {
    font-size: 12px;
    color: var(--text-muted);
    font-style: italic;
    padding: 8px 0;
    border-bottom: 1px solid var(--border);
  }
  .hsv2-next-row { display: flex; justify-content: flex-end; }
  .hsv2-popup-text {
    font-size: 13px;
    color: var(--text-dim);
    line-height: 1.6;
    margin: 0;
  }
  .hsv2-popup-hint {
    font-size: 12px;
    color: var(--accent);
    background: rgba(14,165,233,0.06);
    border: 1px solid rgba(14,165,233,0.2);
    border-radius: var(--radius);
    padding: 10px 12px;
    margin: 0;
    line-height: 1.5;
  }
  .hsv2-result-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 0;
    gap: 8px;
  }
  .hsv2-score-number {
    font-size: 44px;
    font-weight: 800;
    color: var(--accent);
    line-height: 1;
  }
  .hsv2-score-label { font-size: 13px; color: var(--text-muted); }
  .hsv2-summary-line {
    font-size: 13px;
    color: var(--text-dim);
    line-height: 1.6;
    text-align: center;
  }
  .hsv2-calibration {
    font-size: 12px;
    color: var(--text-dim);
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 10px 14px;
    line-height: 1.5;
  }
  .hsv2-lesson {
    font-size: 13px;
    font-weight: 600;
    color: var(--accent);
    background: rgba(14,165,233,0.06);
    border: 1px solid rgba(14,165,233,0.2);
    border-radius: var(--radius);
    padding: 12px 14px;
    text-align: center;
  }
`
