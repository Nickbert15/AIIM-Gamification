'use client'

import { useState } from 'react'
import { CriterionResult } from '@/lib/excelEvaluation'
import { useI18n } from '@/lib/i18n'

interface Props {
  score: number
  pointsEarned: number
  criteriaResults: CriterionResult[]
  feedback: string
  samplePrompt: string
  onClose: () => void
}

export default function ResultDialog({ score, pointsEarned, criteriaResults, feedback, samplePrompt, onClose }: Props) {
  const { t } = useI18n()
  const [showSamplePrompt, setShowSamplePrompt] = useState(false)

  return (
    <>
      <style>{dialogStyles}</style>
      <div className="rd-overlay">
        <div className="rd-dialog">
          <div className="rd-titlebar">
            <span className="rd-titlebar-icon" />
            <span className="rd-titlebar-text">{t('excel.result')}</span>
          </div>
          <div className="rd-body">
            <div className="rd-score-row">
              <div className="rd-score-number">{pointsEarned}<span className="rd-score-unit">{t('common.points_short')}</span></div>
              <div className="rd-score-pct">{t('excel.correctPct', { pct: score })}</div>
            </div>

            <div className="rd-criteria-list">
              {criteriaResults.map(c => (
                <div key={c.id} className={`rd-criterion ${c.passed ? 'rd-criterion-pass' : 'rd-criterion-fail'}`}>
                  <span className="rd-criterion-icon">{c.passed ? '✓' : '✗'}</span>
                  <span>{c.description}</span>
                </div>
              ))}
            </div>

            <div className="rd-feedback">{feedback}</div>

            {showSamplePrompt ? (
              <div className="rd-sample-prompt">
                <span className="rd-sample-prompt-label">{t('excel.samplePromptLabel')}</span>
                {samplePrompt}
              </div>
            ) : (
              <button className="rd-sample-toggle" onClick={() => setShowSamplePrompt(true)}>
                {t('excel.showSamplePrompt')}
              </button>
            )}

            <button className="rd-close-btn" onClick={onClose}>
              {t('common.close')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

const dialogStyles = `
  .rd-overlay {
    position: absolute;
    inset: 0;
    background: rgba(20,20,20,0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 20;
    padding: 24px;
  }
  .rd-dialog {
    background: #ffffff;
    border-radius: 8px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.35);
    width: 100%;
    max-width: 460px;
    max-height: 90%;
    overflow-y: auto;
  }
  .rd-titlebar {
    background: #217346;
    color: #fff;
    padding: 12px 18px;
    display: flex;
    align-items: center;
    gap: 10px;
    border-radius: 8px 8px 0 0;
  }
  .rd-titlebar-icon {
    width: 16px;
    height: 16px;
    border-radius: 3px;
    background: #ffffff;
  }
  .rd-titlebar-text {
    font-size: 14px;
    font-weight: 700;
  }
  .rd-body {
    padding: 22px 22px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    text-align: center;
  }
  .rd-score-row {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .rd-score-number {
    font-size: 44px;
    font-weight: 800;
    color: #217346;
    line-height: 1;
  }
  .rd-score-unit {
    font-size: 0.35em;
    color: #767676;
    font-weight: 500;
    margin-left: 6px;
  }
  .rd-score-pct {
    font-size: 14px;
    color: #555;
  }
  .rd-criteria-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
    text-align: left;
  }
  .rd-criterion {
    display: flex;
    gap: 8px;
    font-size: 13px;
    padding: 8px 12px;
    border-radius: 6px;
  }
  .rd-criterion-pass { background: rgba(33,115,70,0.08); color: #185c37; }
  .rd-criterion-fail { background: rgba(220,38,38,0.06); color: #b91c1c; }
  .rd-criterion-icon { font-weight: 700; }
  .rd-feedback {
    background: #fff8e6;
    border: 1px solid #f0dca0;
    border-radius: 6px;
    padding: 12px 14px;
    font-size: 13px;
    color: #7a5c00;
    line-height: 1.5;
    text-align: left;
    width: 100%;
  }
  .rd-sample-toggle {
    background: transparent;
    border: 1px solid #d0d0d0;
    border-radius: 6px;
    padding: 8px 14px;
    font-size: 12.5px;
    color: #444;
    cursor: pointer;
  }
  .rd-sample-toggle:hover { background: #f3f2f1; }
  .rd-sample-prompt {
    background: #f8f8f8;
    border: 1px solid #e2e2e2;
    border-radius: 6px;
    padding: 12px 14px;
    font-size: 13px;
    color: #333;
    line-height: 1.5;
    text-align: left;
    width: 100%;
  }
  .rd-sample-prompt-label {
    display: block;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 6px;
    color: #767676;
  }
  .rd-close-btn {
    background: #217346;
    color: #ffffff;
    border: none;
    border-radius: 6px;
    padding: 10px 22px;
    font-size: 13.5px;
    font-weight: 700;
    cursor: pointer;
    margin-top: 4px;
  }
  .rd-close-btn:hover { background: #185c37; }
`
