'use client'

import { useState } from 'react'
import { Game } from '@/types/game'
import { BranchingGameJson, BranchNode, BranchOption } from '@/types/branching'

interface Props {
  game: Game
  onComplete: (score: number) => void
}

export default function BranchingGamePlayer({ game, onComplete }: Props) {
  const data = game.game_json as unknown as BranchingGameJson
  const maxPoints = data.scoring?.maxPoints ?? 10

  const [nodeId, setNodeId] = useState(data.startNode)
  const [selected, setSelected] = useState<BranchOption | null>(null)
  const [totalScore, setTotalScore] = useState(0)
  const [path, setPath] = useState<string[]>([])
  const [introSeen, setIntroSeen] = useState(false)
  const [reported, setReported] = useState(false)

  const node: BranchNode | undefined = data.nodes[nodeId]

  if (!node) {
    return (
      <>
        <style>{bgpStyles}</style>
        <div className="bgp-error">Spielknoten „{nodeId}“ nicht gefunden — game_json prüfen.</div>
      </>
    )
  }

  function handleSelect(option: BranchOption) {
    if (selected) return
    setSelected(option)
    setTotalScore(s => s + option.points)
    setPath(p => [...p, option.id])
  }

  function handleContinue(next: string) {
    setSelected(null)
    setNodeId(next)
    const target = data.nodes[next]
    if (target?.type === 'end' && !reported) {
      setReported(true)
      onComplete(totalScore)
    }
  }

  /* ---------- Szenario-Intro ---------- */
  if (!introSeen) {
    return (
      <>
        <style>{bgpStyles}</style>
        <div className="bgp-container">
          <div className="bgp-scenario-card">
            <span className="bgp-label">Dein Szenario</span>
            <p className="bgp-scenario-text">{data.scenario.intro}</p>
          </div>
          <div className="bgp-next-row">
            <button className="btn btn-primary" onClick={() => setIntroSeen(true)}>
              Los geht&apos;s →
            </button>
          </div>
        </div>
      </>
    )
  }

  /* ---------- Recap / Ende ---------- */
  if (node.type === 'end') {
    const pct = Math.round((totalScore / maxPoints) * 100)
    const expert = node.expertPath ?? []
    return (
      <>
        <style>{bgpStyles}</style>
        <div className="bgp-container">
          <div className="bgp-score-screen">
            <div className="bgp-score-number">
              {totalScore}
              <span className="bgp-score-max">/{maxPoints}</span>
            </div>
            <div className="bgp-score-pct">{pct}%</div>
            <div className="bgp-score-msg">
              {pct >= 80
                ? 'Ausgezeichnet! Du hast souverän mit der KI zusammengearbeitet.'
                : pct >= 60
                ? 'Gut gemacht! Schau dir im Recap an, wo der Expertenweg abweicht.'
                : 'Weiter üben — der Recap unten zeigt dir, worauf es ankommt.'}
            </div>
          </div>

          {expert.length > 0 && (
            <div className="bgp-recap-card">
              <span className="bgp-label">{node.recapIntro ?? 'Dein Weg im Vergleich:'}</span>
              <div className="bgp-path-row">
                <span className="bgp-path-name">Dein Weg</span>
                <div className="bgp-chips">
                  {path.map((id, i) => (
                    <span
                      key={i}
                      className={`bgp-chip ${expert[i] === id ? 'bgp-chip-match' : 'bgp-chip-miss'}`}
                    >
                      {id}
                    </span>
                  ))}
                </div>
              </div>
              <div className="bgp-path-row">
                <span className="bgp-path-name">Expertenweg</span>
                <div className="bgp-chips">
                  {expert.map((id, i) => (
                    <span key={i} className="bgp-chip bgp-chip-expert">{id}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {node.lessons && node.lessons.length > 0 && (
            <div className="bgp-lessons">
              {node.lessons.map((lesson, i) => (
                <div key={i} className="bgp-lesson">
                  <span className="bgp-lesson-tag">{lesson.craftElement}</span>
                  <p className="bgp-lesson-text">{lesson.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    )
  }

  /* ---------- Info-Zwischenknoten ---------- */
  if (node.type === 'info') {
    return (
      <>
        <style>{bgpStyles}</style>
        <div className="bgp-container">
          <div className="bgp-info-card">{node.text}</div>
          <div className="bgp-next-row">
            <button className="btn btn-primary" onClick={() => handleContinue(node.nextNode!)}>
              Weiter →
            </button>
          </div>
        </div>
      </>
    )
  }

  /* ---------- Entscheidungsknoten (prompt_choice / output_review / diagnosis) ---------- */
  const isPromptChoice = node.type === 'prompt_choice'
  const options = node.options ?? []

  return (
    <>
      <style>{bgpStyles}</style>
      <div className="bgp-container">
        <div className="bgp-progress">
          <span>Schritt {path.length + 1}</span>
          <div className="bgp-progress-bar">
            <div
              className="bgp-progress-fill"
              style={{ width: `${Math.min((path.length / 5) * 100, 100)}%` }}
            />
          </div>
          <span style={{ whiteSpace: 'nowrap' }}>{totalScore} Pkt.</span>
        </div>

        {node.type === 'output_review' && node.aiOutput && (
          <div className="bgp-ai-output">
            <span className="bgp-label">Antwort des KI-Assistenten</span>
            <div className="bgp-ai-text">{node.aiOutput}</div>
          </div>
        )}

        <p className="bgp-question">{node.type === 'output_review' ? node.question : node.text}</p>

        <div className="bgp-options">
          {options.map(option => {
            const isChosen = selected?.id === option.id
            return (
              <button
                key={option.id}
                className={`bgp-option ${isChosen ? 'bgp-option-chosen' : ''} ${selected && !isChosen ? 'bgp-option-dimmed' : ''}`}
                onClick={() => handleSelect(option)}
                disabled={!!selected}
              >
                <span className="bgp-option-label">{option.label}</span>
                {isPromptChoice && option.promptText && (
                  <span className="bgp-option-prompt">{option.promptText}</span>
                )}
              </button>
            )
          })}
        </div>

        {selected?.feedback && (
          <div className="bgp-feedback">
            <span className="bgp-feedback-label">
              {selected.points > 0 ? 'Gut gewählt' : 'Merke dir'}
            </span>
            {selected.feedback}
          </div>
        )}

        {selected && (
          <div className="bgp-next-row">
            <button className="btn btn-primary" onClick={() => handleContinue(selected.nextNode)}>
              Weiter →
            </button>
          </div>
        )}
      </div>
    </>
  )
}

const bgpStyles = `
  .bgp-container {
    padding: 20px 24px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .bgp-progress {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: var(--text-muted);
  }
  .bgp-progress-bar {
    flex: 1;
    height: 4px;
    background: var(--border);
    border-radius: 9999px;
    overflow: hidden;
  }
  .bgp-progress-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 9999px;
    transition: width 0.4s ease;
  }
  .bgp-label {
    display: block;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--accent);
    margin-bottom: 6px;
  }
  .bgp-scenario-card {
    background: rgba(14,165,233,0.05);
    border: 1px solid rgba(14,165,233,0.2);
    border-radius: var(--radius);
    padding: 16px 18px;
  }
  .bgp-scenario-text {
    font-size: 14px;
    color: var(--text);
    line-height: 1.6;
    margin: 0;
  }
  .bgp-ai-output {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px 12px 12px 4px;
    padding: 14px 16px;
  }
  .bgp-ai-text {
    font-size: 14px;
    color: var(--text);
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .bgp-question {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    line-height: 1.5;
    margin: 0;
  }
  .bgp-options {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .bgp-option {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 12px 14px;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: border-color 0.15s, opacity 0.15s;
  }
  .bgp-option:hover:not(:disabled) { border-color: var(--accent); }
  .bgp-option:disabled { cursor: default; }
  .bgp-option-chosen { border-color: var(--accent); background: rgba(14,165,233,0.06); }
  .bgp-option-dimmed { opacity: 0.45; }
  .bgp-option-label {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    line-height: 1.4;
  }
  .bgp-option-prompt {
    font-size: 12.5px;
    color: var(--text-dim);
    line-height: 1.55;
    border-left: 2px solid var(--border);
    padding-left: 10px;
    white-space: pre-wrap;
  }
  .bgp-feedback {
    background: rgba(245,158,11,0.1);
    border: 1px solid rgba(245,158,11,0.3);
    border-radius: var(--radius);
    padding: 12px 16px;
    font-size: 13px;
    color: #f59e0b;
    line-height: 1.5;
  }
  .bgp-feedback-label {
    display: block;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 6px;
  }
  .bgp-info-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 18px;
    font-size: 14px;
    color: var(--text);
    line-height: 1.6;
  }
  .bgp-next-row { display: flex; justify-content: flex-end; }
  .bgp-error {
    background: rgba(239,68,68,0.08);
    border: 1px solid rgba(239,68,68,0.25);
    border-radius: var(--radius);
    padding: 10px 14px;
    font-size: 13px;
    color: var(--danger);
    margin: 20px 24px;
  }
  .bgp-score-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px 24px 8px;
    gap: 6px;
    text-align: center;
  }
  .bgp-score-number {
    font-size: 52px;
    font-weight: 800;
    color: var(--accent);
    line-height: 1;
  }
  .bgp-score-max {
    font-size: 0.45em;
    color: var(--text-muted);
    font-weight: 400;
  }
  .bgp-score-pct {
    font-size: 26px;
    font-weight: 700;
    color: var(--text);
    margin-top: 4px;
  }
  .bgp-score-msg {
    font-size: 14px;
    color: var(--text-dim);
    max-width: 380px;
    line-height: 1.5;
    margin-top: 6px;
  }
  .bgp-recap-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .bgp-path-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }
  .bgp-path-name {
    font-size: 11px;
    color: var(--text-muted);
    min-width: 88px;
    padding-top: 3px;
  }
  .bgp-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .bgp-chip {
    font-size: 11px;
    padding: 3px 8px;
    border-radius: 9999px;
    border: 1px solid var(--border);
    color: var(--text-dim);
  }
  .bgp-chip-match { border-color: rgba(34,197,94,0.5); color: #22c55e; }
  .bgp-chip-miss { border-color: rgba(245,158,11,0.5); color: #f59e0b; }
  .bgp-chip-expert { border-color: var(--accent); color: var(--accent); }
  .bgp-lessons {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .bgp-lesson {
    background: rgba(14,165,233,0.05);
    border: 1px solid rgba(14,165,233,0.2);
    border-radius: var(--radius);
    padding: 12px 14px;
  }
  .bgp-lesson-tag {
    display: inline-block;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--accent);
    margin-bottom: 4px;
  }
  .bgp-lesson-text {
    font-size: 13px;
    color: var(--text);
    line-height: 1.55;
    margin: 0;
  }
`
