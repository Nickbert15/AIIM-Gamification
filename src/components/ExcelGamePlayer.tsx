'use client'

import { useRef, useState } from 'react'
import { ExcelTableState } from '@/types/game'
import { CriterionResult } from '@/lib/excelEvaluation'
import { columnLetter } from '@/lib/spreadsheetLabels'
import ExcelRibbon from './excel-ui/ExcelRibbon'
import ExcelFormulaBar from './excel-ui/ExcelFormulaBar'
import ExcelSheet, { CellPosition } from './excel-ui/ExcelSheet'
import CopilotSidebar, { ChatMessage, PlayerStatus } from './excel-ui/CopilotSidebar'
import ResultDialog from './excel-ui/ResultDialog'
import HowToPlay from './ui/HowToPlay'
import { useI18n } from '@/lib/i18n'

interface Props {
  gameId: string
  task: string
  initialData: ExcelTableState
  maxAttempts: number
  playerId: string | null
  onComplete: (result: { score: number; pointsEarned: number }) => void
  onClose: () => void
}

interface FinishResult {
  score: number
  pointsEarned: number
  criteriaResults: CriterionResult[]
  feedback: string
  samplePrompt: string
}

interface PendingDecision {
  allPassed: boolean
  attemptsRemaining: number
  table: ExcelTableState
  attemptsUsed: number
}

export default function ExcelGamePlayer({ gameId, task, initialData, maxAttempts, playerId, onComplete, onClose }: Props) {
  const { t } = useI18n()
  const [currentTable, setCurrentTable] = useState<ExcelTableState>(initialData)
  const [prompt, setPrompt] = useState('')
  const [attemptsUsed, setAttemptsUsed] = useState(0)
  const [status, setStatus] = useState<PlayerStatus>('idle')
  const [apiError, setApiError] = useState('')
  const [result, setResult] = useState<FinishResult | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', text: task }])
  const [selectedCell, setSelectedCell] = useState<CellPosition>({ row: 0, col: 0 })
  const [howToPlayOpen, setHowToPlayOpen] = useState(true)

  const pendingAfterAnimation = useRef<PendingDecision | null>(null)

  async function finalize(finalTable: ExcelTableState, finalAttemptsUsed: number) {
    setStatus('finishing')
    setApiError('')
    try {
      const res = await fetch('/api/excel/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, playerId, currentTable: finalTable, attemptsUsed: finalAttemptsUsed }),
      })
      const data = await res.json()
      if (data.error) {
        setApiError(data.error)
        setStatus('idle')
        return
      }
      setResult(data)
      setStatus('done')
      onComplete({ score: data.score, pointsEarned: data.pointsEarned })
    } catch (err) {
      setApiError(err instanceof Error ? err.message : t('excel.networkError'))
      setStatus('idle')
    }
  }

  async function handleSend() {
    if (!prompt.trim() || status !== 'idle') return
    const userText = prompt.trim()
    setMessages(prev => [...prev, { role: 'user', text: userText }])
    setPrompt('')
    setStatus('thinking')
    setApiError('')

    try {
      const res = await fetch('/api/excel/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, playerId, currentTable, prompt: userText, attemptsUsed, maxAttempts }),
      })
      const data = await res.json()

      if (data.blocked) {
        setAttemptsUsed(data.attemptsUsed)
        setMessages(prev => [...prev, { role: 'assistant', text: data.message }])
        if (data.attemptsRemaining <= 0) {
          await finalize(currentTable, data.attemptsUsed)
        } else {
          setStatus('idle')
        }
        return
      }

      if (data.error) {
        setApiError(data.error)
        setStatus('idle')
        return
      }

      pendingAfterAnimation.current = {
        allPassed: data.allPassed,
        attemptsRemaining: data.attemptsRemaining,
        table: data.table,
        attemptsUsed: data.attemptsUsed,
      }
      setAttemptsUsed(data.attemptsUsed)
      setStatus('animating')
      setCurrentTable(data.table)
    } catch (err) {
      setApiError(err instanceof Error ? err.message : t('excel.networkError'))
      setStatus('idle')
    }
  }

  async function handleAnimationSettled() {
    const pending = pendingAfterAnimation.current
    pendingAfterAnimation.current = null
    if (!pending) return

    setMessages(prev => [...prev, { role: 'assistant', text: t('excel.applied') }])

    if (pending.allPassed || pending.attemptsRemaining <= 0) {
      await finalize(pending.table, pending.attemptsUsed)
    } else {
      setStatus('idle')
    }
  }

  async function handleFinish() {
    if (status !== 'idle') return
    await finalize(currentTable, attemptsUsed)
  }

  const cellLabel = `${columnLetter(selectedCell.col)}${selectedCell.row + 1}`
  const cellValue = (() => {
    if (selectedCell.row === 0) {
      return selectedCell.col < currentTable.headers.length ? currentTable.headers[selectedCell.col] : ''
    }
    const dataRow = currentTable.rows[selectedCell.row - 1]
    if (!dataRow) return ''
    const v = dataRow[selectedCell.col]
    return v === null || v === undefined ? '' : String(v)
  })()

  return (
    <>
      <style>{workspaceStyles}</style>

      <HowToPlay
        open={howToPlayOpen}
        title={t('excel.htpTitle')}
        termExplanation={t('excel.htpTerm')}
        steps={[
          { text: t('excel.htpStep1') },
          { text: t('excel.htpStep2') },
          { text: t('excel.htpStep3', { attempts: maxAttempts, attemptWord: maxAttempts === 1 ? t('excel.attempt') : t('excel.attempts') }) },
          { text: t('excel.htpStep4') },
        ]}
        onDismiss={() => setHowToPlayOpen(false)}
      />

      <div className="egw-workspace">
        <ExcelRibbon />
        <ExcelFormulaBar cellLabel={cellLabel} cellValue={cellValue} />
        <div className="egw-main">
          <ExcelSheet
            table={currentTable}
            selectedCell={selectedCell}
            onSelectCell={setSelectedCell}
            onAnimationSettled={handleAnimationSettled}
          />
          <CopilotSidebar
            messages={messages}
            prompt={prompt}
            onPromptChange={setPrompt}
            onSend={handleSend}
            onFinish={handleFinish}
            status={status}
            attemptsUsed={attemptsUsed}
            maxAttempts={maxAttempts}
            apiError={apiError}
          />
        </div>

        {status === 'done' && result && (
          <ResultDialog
            score={result.score}
            pointsEarned={result.pointsEarned}
            criteriaResults={result.criteriaResults}
            feedback={result.feedback}
            samplePrompt={result.samplePrompt}
            onClose={onClose}
          />
        )}
      </div>
    </>
  )
}

const workspaceStyles = `
  .egw-workspace {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 78vh;
    min-height: 460px;
    max-height: 840px;
    background: #ffffff;
    overflow: hidden;
  }
  .egw-main {
    flex: 1;
    display: flex;
    min-height: 0;
    min-width: 0;
  }
  /* Nach Klassen adressiert statt per Position: ExcelSheet und CopilotSidebar rendern
     jeweils ein <style> vor ihrem <div>, sodass :first-child/:last-child je nach
     React-Style-Hoisting (dev vs. prod build) den falschen Knoten trafen. */
  .egw-main .xs-workspace {
    flex: 1;
    min-width: 0;
  }
  .egw-main .cs-sidebar {
    flex: 0 1 320px;
    min-width: 240px;
  }

  /* Schmale Screens: Tabelle und Copilot untereinander statt nebeneinander,
     damit beide nutzbar bleiben statt sich den knappen Platz zu teilen. */
  @media (max-width: 760px) {
    .egw-workspace {
      height: auto;
      min-height: 0;
      max-height: none;
    }
    .egw-main {
      flex-direction: column;
    }
    .egw-main .xs-workspace {
      flex: none;
      height: 42vh;
      min-height: 220px;
    }
    .egw-main .cs-sidebar {
      flex: none;
      min-width: 0;
      height: 48vh;
      min-height: 300px;
      border-left: none;
      border-top: 1px solid #d0d0d0;
    }
  }
`
