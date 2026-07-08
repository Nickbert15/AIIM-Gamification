'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ExcelCellValue, ExcelTableState } from '@/types/game'
import { computeTableDiff, TableDiff } from '@/lib/tableDiff'
import { columnLetter } from '@/lib/spreadsheetLabels'

export interface CellPosition {
  row: number // 0 = header row, 1..N = data rows
  col: number
}

interface Props {
  table: ExcelTableState
  selectedCell: CellPosition
  onSelectCell: (pos: CellPosition) => void
  onAnimationSettled?: () => void
}

const MIN_COLS = 12
const MIN_ROWS = 50
const REMOVE_FADE_MS = 420
const SWEEP_MS = 400

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
}

// A column whose values are unique in the current table, used purely to give data rows a
// content-stable React key (so reordered rows keep their DOM node identity for the FLIP
// animation) — independent of the transient diff/animation lifecycle.
function findStableColumn(table: ExcelTableState): number | null {
  for (let c = 0; c < table.headers.length; c++) {
    const values = table.rows.map(r => JSON.stringify(r[c]))
    if (new Set(values).size === values.length && values.length > 0) return c
  }
  return null
}

export default function ExcelSheet({ table, selectedCell, onSelectCell, onAnimationSettled }: Props) {
  const prevTableRef = useRef<ExcelTableState>(table)
  const [diff, setDiff] = useState<TableDiff | null>(null)
  const [removingRows, setRemovingRows] = useState<{ key: string; cells: ExcelCellValue[] }[]>([])
  const [sweeping, setSweeping] = useState(false)
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map())
  const prevRectsRef = useRef<Map<string, DOMRect>>(new Map())

  const stableColIdx = useMemo(() => findStableColumn(table), [table])

  function rowKey(row: ExcelCellValue[], idx: number): string {
    return stableColIdx !== null ? `k:${JSON.stringify(row[stableColIdx])}` : `i:${idx}`
  }

  useEffect(() => {
    const prev = prevTableRef.current
    if (prev === table) return

    let cancelled = false
    try {
      const d = computeTableDiff(prev, table)
      const changeCount = d.removedRowIndices.length + d.addedRowIndices.length +
        d.movedRows.length + d.changedCells.length + d.addedColumns.length + d.removedColumns.length

      if (changeCount === 0) {
        prevTableRef.current = table
        onAnimationSettled?.()
        return
      }

      const reduced = prefersReducedMotion()
      setDiff(d)

      if (!reduced && d.removedRowIndices.length > 0) {
        setRemovingRows(d.removedRowIndices.map(i => ({ key: `removing-${i}`, cells: prev.rows[i] })))
      }

      setSweeping(true)
      const sweepTimer = setTimeout(() => { if (!cancelled) setSweeping(false) }, reduced ? 150 : SWEEP_MS)

      const totalDuration = reduced ? 300 : Math.min(4000, 1200 + changeCount * 80)
      const removeTimer = setTimeout(() => {
        if (!cancelled) setRemovingRows([])
      }, reduced ? 0 : REMOVE_FADE_MS)

      const settleTimer = setTimeout(() => {
        if (cancelled) return
        setDiff(null)
        prevTableRef.current = table
        onAnimationSettled?.()
      }, totalDuration)

      return () => {
        cancelled = true
        clearTimeout(sweepTimer)
        clearTimeout(removeTimer)
        clearTimeout(settleTimer)
      }
    } catch {
      prevTableRef.current = table
      onAnimationSettled?.()
    }
  }, [table])

  // FLIP: measure previous row positions (recorded on the prior commit) vs. current ones,
  // apply an inverse transform, then release it into a transition on the next frame.
  useLayoutEffect(() => {
    const newRects = new Map<string, DOMRect>()
    rowRefs.current.forEach((el, key) => newRects.set(key, el.getBoundingClientRect()))

    if (prevRectsRef.current.size > 0) {
      rowRefs.current.forEach((el, key) => {
        const oldRect = prevRectsRef.current.get(key)
        const newRect = newRects.get(key)
        if (!oldRect || !newRect) return
        const deltaY = oldRect.top - newRect.top
        if (Math.abs(deltaY) > 0.5) {
          el.style.transition = 'none'
          el.style.transform = `translateY(${deltaY}px)`
          requestAnimationFrame(() => {
            el.style.transition = 'transform 0.5s ease'
            el.style.transform = ''
          })
        }
      })
    }
    prevRectsRef.current = newRects
  })

  function isCellChanged(dataRowIdx: number, colIdx: number): boolean {
    if (!diff || diff.keyColumnIndex === null) return false
    const row = table.rows[dataRowIdx]
    if (!row) return false
    const keyVal = JSON.stringify(row[diff.keyColumnIndex])
    return diff.changedCells.some(cc => cc.rowKey === keyVal && cc.colIndex === colIdx)
  }

  function isRowAdded(dataRowIdx: number): boolean {
    return diff?.addedRowIndices.includes(dataRowIdx) ?? false
  }

  function isColAdded(colIdx: number): boolean {
    return diff?.addedColumns.includes(colIdx) ?? false
  }

  const colCount = Math.max(table.headers.length, MIN_COLS)
  const rowCount = Math.max(table.rows.length, MIN_ROWS)

  function handleKeyDown(e: React.KeyboardEvent) {
    const { row, col } = selectedCell
    if (e.key === 'ArrowDown') { e.preventDefault(); onSelectCell({ row: Math.min(rowCount, row + 1), col }) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); onSelectCell({ row: Math.max(0, row - 1), col }) }
    else if (e.key === 'ArrowRight') { e.preventDefault(); onSelectCell({ row, col: Math.min(colCount - 1, col + 1) }) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); onSelectCell({ row, col: Math.max(0, col - 1) }) }
  }

  function cellDisplayValue(r: number, c: number): string {
    if (r === 0) return c < table.headers.length ? table.headers[c] : ''
    const dataRow = table.rows[r - 1]
    if (!dataRow) return ''
    const v = dataRow[c]
    return v === null || v === undefined ? '' : String(v)
  }

  return (
    <>
      <style>{sheetStyles}</style>
      <div className="xs-workspace">
        <div
          className={`xs-scroll ${sweeping ? 'xs-sweep' : ''}`}
          tabIndex={0}
          onKeyDown={handleKeyDown}
        >
          <table className="xs-table">
            <thead>
              <tr>
                <th className="xs-corner" />
                {Array.from({ length: colCount }).map((_, c) => (
                  <th key={c} className={`xs-col-letter ${selectedCell.col === c ? 'xs-col-letter-active' : ''} ${isColAdded(c) ? 'xs-col-entering' : ''}`}>
                    {columnLetter(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {removingRows.map(r => (
                <tr key={r.key} className="xs-row xs-row-removing">
                  <td className="xs-row-num" />
                  {r.cells.map((cell, c) => (
                    <td key={c} className="xs-cell">{cell === null ? '' : String(cell)}</td>
                  ))}
                </tr>
              ))}

              <tr
                className={`xs-row ${selectedCell.row === 0 ? 'xs-row-active' : ''}`}
                ref={el => { if (el) rowRefs.current.set('header', el); else rowRefs.current.delete('header') }}
              >
                <td className="xs-row-num">1</td>
                {Array.from({ length: colCount }).map((_, c) => (
                  <td
                    key={c}
                    className={`xs-header-cell ${selectedCell.row === 0 && selectedCell.col === c ? 'xs-cell-selected' : ''} ${isColAdded(c) ? 'xs-col-entering' : ''}`}
                    onClick={() => onSelectCell({ row: 0, col: c })}
                  >
                    {cellDisplayValue(0, c)}
                  </td>
                ))}
              </tr>

              {Array.from({ length: rowCount }).map((_, i) => {
                const dataRow = table.rows[i]
                const key = dataRow ? rowKey(dataRow, i) : `blank-${i}`
                const displayRowNum = selectedCell.row === i + 1
                return (
                  <tr
                    key={key}
                    className={`xs-row ${displayRowNum ? 'xs-row-active' : ''} ${isRowAdded(i) ? 'xs-row-entering' : ''}`}
                    ref={el => { if (el) rowRefs.current.set(key, el); else rowRefs.current.delete(key) }}
                  >
                    <td className="xs-row-num">{i + 2}</td>
                    {Array.from({ length: colCount }).map((_, c) => (
                      <td
                        key={c}
                        className={[
                          'xs-cell',
                          displayRowNum && selectedCell.col === c ? 'xs-cell-selected' : '',
                          isCellChanged(i, c) ? 'xs-cell-pulse' : '',
                          isColAdded(c) ? 'xs-col-entering' : '',
                        ].filter(Boolean).join(' ')}
                        style={isColAdded(c) ? { animationDelay: `${Math.min(i, 30) * 15}ms` } : undefined}
                        onClick={() => onSelectCell({ row: i + 1, col: c })}
                      >
                        {cellDisplayValue(i + 1, c)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="xs-footer">
          <div className="xs-sheet-tabs">
            <span className="xs-sheet-tab xs-sheet-tab-active">Tabelle1</span>
            <span className="xs-sheet-tab-add">+</span>
          </div>
          <div className="xs-status-bar">Bereit</div>
        </div>
      </div>
    </>
  )
}

const sheetStyles = `
  .xs-workspace {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #ffffff;
    min-height: 0;
  }
  .xs-scroll {
    flex: 1;
    overflow: auto;
    outline: none;
    position: relative;
  }
  .xs-table {
    border-collapse: collapse;
    font-size: 12.5px;
    font-family: Calibri, Arial, sans-serif;
    color: #111;
  }
  .xs-corner, .xs-col-letter {
    position: sticky;
    top: 0;
    background: #f3f2f1;
    border: 1px solid #d0d0d0;
    color: #444;
    font-weight: 600;
    text-align: center;
    min-width: 88px;
    padding: 3px 8px;
    z-index: 2;
  }
  .xs-corner { left: 0; z-index: 3; min-width: 36px; }
  .xs-col-letter-active { background: #c6e6d5; color: #14532d; }
  .xs-row-num {
    position: sticky;
    left: 0;
    background: #f3f2f1;
    border: 1px solid #d0d0d0;
    color: #444;
    font-weight: 600;
    text-align: center;
    min-width: 36px;
    padding: 3px 6px;
    z-index: 1;
  }
  .xs-row-active .xs-row-num { background: #c6e6d5; color: #14532d; }
  .xs-header-cell {
    border: 1px solid #d9d9d9;
    padding: 3px 8px;
    font-weight: 700;
    background: #eef6f1;
    color: #1a1a1a;
    white-space: nowrap;
    cursor: cell;
  }
  .xs-cell {
    border: 1px solid #e2e2e2;
    padding: 3px 8px;
    color: #1a1a1a;
    white-space: nowrap;
    cursor: cell;
  }
  .xs-cell-selected {
    outline: 2px solid #217346;
    outline-offset: -2px;
    background: rgba(33,115,70,0.06);
  }
  .xs-sweep::after {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(33,115,70,0.08);
    pointer-events: none;
    animation: xs-sweep-fade 0.4s ease-out;
  }
  @keyframes xs-sweep-fade {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  .xs-row-removing {
    animation: xs-row-collapse 0.42s ease forwards;
    overflow: hidden;
  }
  @keyframes xs-row-collapse {
    0% { opacity: 1; }
    60% { opacity: 0; }
    100% { opacity: 0; }
  }
  .xs-row-entering {
    animation: xs-row-fade-in 0.4s ease;
  }
  @keyframes xs-row-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .xs-col-entering {
    animation: xs-col-fade-in 0.35s ease both;
  }
  @keyframes xs-col-fade-in {
    from { opacity: 0; transform: translateX(6px); }
    to { opacity: 1; transform: translateX(0); }
  }
  .xs-cell-pulse {
    animation: xs-cell-pulse-kf 1.1s ease;
  }
  @keyframes xs-cell-pulse-kf {
    0% { background: rgba(34,197,94,0.45); }
    100% { background: transparent; }
  }
  .xs-footer {
    border-top: 1px solid #d0d0d0;
    background: #f3f2f1;
    flex-shrink: 0;
  }
  .xs-sheet-tabs {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px 8px 0;
  }
  .xs-sheet-tab {
    font-size: 12px;
    padding: 5px 14px;
    background: #ffffff;
    border: 1px solid #d0d0d0;
    border-bottom: none;
    border-radius: 3px 3px 0 0;
    color: #333;
  }
  .xs-sheet-tab-active {
    border-bottom: 2px solid #217346;
    font-weight: 600;
  }
  .xs-sheet-tab-add {
    padding: 3px 8px;
    color: #217346;
    font-weight: 700;
    cursor: default;
  }
  .xs-status-bar {
    font-size: 11px;
    color: #555;
    padding: 3px 12px;
    border-top: 1px solid #e2e2e2;
  }
  @media (prefers-reduced-motion: reduce) {
    .xs-row-removing, .xs-row-entering, .xs-col-entering, .xs-cell-pulse, .xs-sweep::after {
      animation: none !important;
    }
  }
`
