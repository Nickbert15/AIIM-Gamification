'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Game } from '@/types/game'
import { X, Check, XCircle, Star, Circle } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

interface Props {
  game: Game | null
  onClose: () => void
  onStatusChange: (id: string, status: string) => void
}

export default function GameReviewModal({ game, onClose, onStatusChange }: Props) {
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!game) return null

  async function handleStatus(status: 'approved' | 'rejected') {
    if (!game) return
    setLoading(true)
    setError(null)
    try {
      const { error: dbError } = await supabase
        .from('games')
        .update({ status })
        .eq('id', game.id)
      if (dbError) throw dbError
      onStatusChange(game.id, status)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('grm.saveError'))
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        .grm-overlay {
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
        .grm-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          box-shadow: var(--shadow-lg);
          width: 100%;
          max-width: 680px;
          max-height: 90vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .grm-header {
          padding: 20px 24px 16px;
          border-bottom: 1px solid var(--border);
          position: sticky;
          top: 0;
          background: var(--bg-card);
          z-index: 1;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .grm-title {
          font-size: 16px;
          font-weight: 700;
          font-family: var(--font-head);
          color: var(--text);
          margin: 0;
          line-height: 1.4;
        }
        .grm-close {
          background: none;
          border: 1px solid var(--border-strong);
          border-radius: 6px;
          color: var(--text-dim);
          cursor: pointer;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          padding: 0;
          flex-shrink: 0;
          font-family: inherit;
        }
        .grm-close:hover { color: var(--text); border-color: var(--accent); }
        .grm-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 22px;
          flex: 1;
        }
        .grm-section-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--text-muted);
          margin: 0 0 10px;
        }
        .grm-objective {
          background: var(--surface-sunken);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 14px 16px;
          font-size: 14px;
          color: var(--text);
          line-height: 1.6;
        }
        .grm-meta-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 8px;
        }
        .grm-meta-item {
          background: var(--surface-sunken);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 10px 12px;
        }
        .grm-meta-label {
          font-size: 11px;
          color: var(--text-muted);
          margin-bottom: 3px;
        }
        .grm-meta-value {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
        }
        .grm-question-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .grm-question-item {
          background: var(--surface-sunken);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 14px 16px;
        }
        .grm-q-text {
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 8px;
          line-height: 1.4;
        }
        .grm-q-answer {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          font-size: 13px;
          color: var(--success-ink);
          margin-bottom: 6px;
        }
        .grm-q-explanation {
          font-size: 13px;
          color: var(--text-dim);
          line-height: 1.5;
        }
        .grm-attribution {
          background: var(--surface-sunken);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 12px 16px;
          font-size: 12px;
          color: var(--text-muted);
          font-family: monospace;
          white-space: pre-wrap;
          word-break: break-all;
        }
        .grm-footer {
          padding: 16px 24px;
          border-top: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          position: sticky;
          bottom: 0;
          background: var(--bg-card);
        }
        .grm-error {
          font-size: 13px;
          color: var(--danger);
          margin-right: auto;
        }
      `}</style>

      <div
        className="grm-overlay"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="grm-card">
          <div className="grm-header">
            <h2 className="grm-title">{t('grm.reviewPrefix')}: {game.title}</h2>
            <button className="grm-close" onClick={onClose} aria-label={t('common.close')}><X size={16} strokeWidth={2} /></button>
          </div>

          <div className="grm-body">
            {game.learning_objective && (
              <div>
                <p className="grm-section-title">{t('grm.learningObjective')}</p>
                <div className="grm-objective">{game.learning_objective}</div>
              </div>
            )}

            <div>
              <p className="grm-section-title">{t('grm.metadata')}</p>
              <div className="grm-meta-grid">
                {([
                  { label: t('grm.metaTopic'), value: game.topic },
                  { label: t('grm.metaRole'), value: game.target_role },
                  { label: t('grm.metaDifficulty'), value: game.difficulty },
                  { label: t('grm.metaPersona'), value: game.persona_key },
                  { label: t('grm.metaFormat'), value: game.format },
                  { label: t('grm.metaLanguage'), value: game.language },
                ] as { label: string; value: string | null }[])
                  .filter(m => m.value)
                  .map(m => (
                    <div key={m.label} className="grm-meta-item">
                      <div className="grm-meta-label">{m.label}</div>
                      <div className="grm-meta-value">{m.value}</div>
                    </div>
                  ))}
              </div>
            </div>

            {game.game_json.questions && (
              <div>
                <p className="grm-section-title">{t('grm.questions', { n: game.game_json.questions.length })}</p>
                <div className="grm-question-list">
                  {game.game_json.questions.map((q, i) => {
                    const correctOption = q.options.find(o => o.id === q.correctAnswer)
                    return (
                      <div key={q.id} className="grm-question-item">
                        <div className="grm-q-text">{i + 1}. {q.question}</div>
                        <div className="grm-q-answer">
                          <Check size={14} strokeWidth={2.5} />
                          <span>{correctOption?.text ?? q.correctAnswer}</span>
                        </div>
                        {q.explanation && (
                          <div className="grm-q-explanation">{q.explanation}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {game.game_json.halluRound && (
              <div>
                <p className="grm-section-title">
                  {t('grm.promptVariants', { n: game.game_json.halluRound.promptOptions.length })}
                </p>
                <div className="grm-q-text" style={{ marginBottom: 8 }}>{game.game_json.halluRound.situation}</div>
                <div className="grm-question-list">
                  {game.game_json.halluRound.promptOptions.map((p, i) => (
                    <div key={p.id} className="grm-question-item">
                      <div className="grm-q-text">{i + 1}. {p.text}</div>
                      <div className="grm-q-answer" style={{ color: p.isRecommended ? 'var(--success-ink)' : 'var(--text-muted)' }}>
                        {p.isRecommended ? <Star size={13} strokeWidth={2} fill="currentColor" /> : <Circle size={9} strokeWidth={2} fill="currentColor" />}
                        <span>{p.isRecommended ? `${t('grm.recommended')} · ${p.approach}` : `${t('grm.alternative')} · ${p.approach}`}</span>
                      </div>
                      {p.feedback && <div className="grm-q-explanation">{p.feedback}</div>}
                    </div>
                  ))}
                </div>
                <div className="grm-q-explanation" style={{ marginTop: 10 }}>
                  {t('grm.answerText', {
                    sentences: game.game_json.halluRound.answer.sentences.length,
                    hallu: game.game_json.halluRound.answer.sentences.filter(s => s.isHallucination).length,
                  })}
                </div>
              </div>
            )}

            {game.game_json.arenaRounds && (
              <div>
                <p className="grm-section-title">{t('grm.arenaRounds', { n: game.game_json.arenaRounds.length })}</p>
                <div className="grm-question-list">
                  {game.game_json.arenaRounds.map((r, i) => (
                    <div key={r.id} className="grm-question-item">
                      <div className="grm-q-text">{i + 1}. {r.taskDescription}</div>
                      <div className="grm-q-explanation">{t('grm.refAnswers', { n: r.referenceOutputs.length })}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {game.game_json.branching && (
              <div>
                <p className="grm-section-title">
                  {t('grm.pnavOptions', { n: (game.game_json.branching.nodes[game.game_json.branching.startNode]?.options ?? []).length })}
                </p>
                <div className="grm-objective" style={{ marginBottom: 10 }}>
                  {game.game_json.branching.scenario.intro}
                </div>
                <div className="grm-question-list">
                  {(game.game_json.branching.nodes[game.game_json.branching.startNode]?.options ?? []).map((o, i) => (
                    <div key={o.id} className="grm-question-item">
                      <div className="grm-q-text">{i + 1}. {o.label}</div>
                      {o.promptText && (
                        <div className="grm-q-explanation" style={{ marginBottom: 6 }}>{o.promptText}</div>
                      )}
                      <div className="grm-q-answer" style={{ color: o.points > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                        <span>{o.points > 0 ? '✓' : '·'}</span>
                        <span>{o.points} {t('grm.pointsWord')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {game.format === 'excel_challenge' && (
              <div>
                <p className="grm-section-title">Excel Challenge</p>
                <div className="grm-question-list">
                  <div className="grm-question-item">
                    <div className="grm-q-text">{game.game_json.task}</div>
                    <div className="grm-q-explanation">
                      {t('grm.excelStats', {
                        ir: game.game_json.initialData?.rows.length ?? 0,
                        ic: game.game_json.initialData?.headers.length ?? 0,
                        sr: game.game_json.solutionData?.rows.length ?? 0,
                        sc: game.game_json.solutionData?.headers.length ?? 0,
                        max: game.game_json.maxAttempts ?? '—',
                      })}
                    </div>
                  </div>
                  {(game.game_json.evaluationCriteria ?? []).map(c => (
                    <div key={c.id} className="grm-question-item">
                      <div className="grm-q-text">{c.description}</div>
                      <div className="grm-q-explanation">
                        {t('grm.criteriaStats', { weight: c.weight, columns: c.columns.join(', ') })}
                      </div>
                    </div>
                  ))}
                  {game.game_json.samplePrompt && (
                    <div className="grm-question-item">
                      <div className="grm-q-text">{t('excel.samplePromptLabel')}</div>
                      <div className="grm-q-explanation">{game.game_json.samplePrompt}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!game.game_json.questions && !game.game_json.halluRound && !game.game_json.arenaRounds && !game.game_json.branching && game.format !== 'excel_challenge' && (
              <div>
                <p className="grm-section-title">{t('grm.unavailableTitle')}</p>
                <div className="grm-objective">
                  {t('grm.noDetail', { format: game.format || '—' })}
                </div>
              </div>
            )}

            {game.source_attribution && (
              <div>
                <p className="grm-section-title">{t('grm.sourceAttribution')}</p>
                <div className="grm-attribution">
                  {JSON.stringify(game.source_attribution, null, 2)}
                </div>
              </div>
            )}
          </div>

          <div className="grm-footer">
            {error && <span className="grm-error">{error}</span>}
            <button className="btn btn-ghost" onClick={onClose} disabled={loading}>
              {t('common.cancel')}
            </button>
            <button
              className="btn btn-danger"
              onClick={() => handleStatus('rejected')}
              disabled={loading}
            >
              {!loading && <XCircle size={15} strokeWidth={2} />}
              {loading ? '…' : t('grm.reject')}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => handleStatus('approved')}
              disabled={loading}
            >
              {!loading && <Check size={15} strokeWidth={2.25} />}
              {loading ? '…' : t('grm.approve')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
