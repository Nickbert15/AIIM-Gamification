import { ExcelCellValue, ExcelTableState } from '@/types/game'

export interface CellChange {
  rowKey: string
  colIndex: number
  oldValue: ExcelCellValue
  newValue: ExcelCellValue
}

export interface TableDiff {
  keyColumnIndex: number | null
  removedRowIndices: number[]
  addedRowIndices: number[]
  movedRows: { oldIndex: number; newIndex: number }[]
  changedCells: CellChange[]
  addedColumns: number[]
  removedColumns: number[]
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase()
}

function rowHash(row: ExcelCellValue[], colIndices: number[]): string {
  return JSON.stringify(colIndices.map(i => row[i]))
}

interface ColumnPair {
  oldIdx: number
  newIdx: number
}

// Reordering/paraphrase-resilient row matcher: exact content hash first (unchanged rows
// that only moved), then a heuristically-picked "stable key column" (first common column
// unique in both tables) for rows whose cells actually changed. Anything still unmatched
// falls back to plain removed+added, as specified.
export function computeTableDiff(oldTable: ExcelTableState, newTable: ExcelTableState): TableDiff {
  const columnPairs: ColumnPair[] = []
  newTable.headers.forEach((h, newIdx) => {
    const oldIdx = oldTable.headers.findIndex(oh => normalizeHeader(oh) === normalizeHeader(h))
    if (oldIdx !== -1) columnPairs.push({ oldIdx, newIdx })
  })
  const matchedNewCols = new Set(columnPairs.map(p => p.newIdx))
  const matchedOldCols = new Set(columnPairs.map(p => p.oldIdx))
  const addedColumns = newTable.headers.map((_, i) => i).filter(i => !matchedNewCols.has(i))
  const removedColumns = oldTable.headers.map((_, i) => i).filter(i => !matchedOldCols.has(i))

  const commonOldIndices = columnPairs.map(p => p.oldIdx)
  const commonNewIndices = columnPairs.map(p => p.newIdx)

  const usedOld = new Set<number>()
  const usedNew = new Set<number>()
  const movedRows: { oldIndex: number; newIndex: number }[] = []

  const newHashBuckets = new Map<string, number[]>()
  newTable.rows.forEach((row, newIdx) => {
    const hash = rowHash(row, commonNewIndices)
    const bucket = newHashBuckets.get(hash)
    if (bucket) bucket.push(newIdx)
    else newHashBuckets.set(hash, [newIdx])
  })

  oldTable.rows.forEach((row, oldIdx) => {
    const hash = rowHash(row, commonOldIndices)
    const bucket = newHashBuckets.get(hash)
    const candidate = bucket?.find(newIdx => !usedNew.has(newIdx))
    if (candidate !== undefined) {
      usedOld.add(oldIdx)
      usedNew.add(candidate)
      if (candidate !== oldIdx) movedRows.push({ oldIndex: oldIdx, newIndex: candidate })
    }
  })

  let keyColumnIndex: number | null = null
  for (const { oldIdx, newIdx } of columnPairs) {
    const oldValues = oldTable.rows.map(r => JSON.stringify(r[oldIdx]))
    const newValues = newTable.rows.map(r => JSON.stringify(r[newIdx]))
    if (new Set(oldValues).size === oldValues.length && new Set(newValues).size === newValues.length) {
      keyColumnIndex = newIdx
      break
    }
  }

  const changedCells: CellChange[] = []

  if (keyColumnIndex !== null) {
    const keyOldIdx = columnPairs.find(p => p.newIdx === keyColumnIndex)!.oldIdx
    const remainingNewByKey = new Map<string, number>()
    newTable.rows.forEach((row, newIdx) => {
      if (!usedNew.has(newIdx)) remainingNewByKey.set(JSON.stringify(row[keyColumnIndex!]), newIdx)
    })

    oldTable.rows.forEach((row, oldIdx) => {
      if (usedOld.has(oldIdx)) return
      const keyVal = JSON.stringify(row[keyOldIdx])
      const newIdx = remainingNewByKey.get(keyVal)
      if (newIdx === undefined || usedNew.has(newIdx)) return

      usedOld.add(oldIdx)
      usedNew.add(newIdx)
      if (newIdx !== oldIdx) movedRows.push({ oldIndex: oldIdx, newIndex: newIdx })

      columnPairs.forEach(({ oldIdx: coi, newIdx: cni }) => {
        const oldValue = row[coi]
        const newValue = newTable.rows[newIdx][cni]
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          changedCells.push({ rowKey: keyVal, colIndex: cni, oldValue, newValue })
        }
      })
    })
  }

  const removedRowIndices = oldTable.rows.map((_, i) => i).filter(i => !usedOld.has(i))
  const addedRowIndices = newTable.rows.map((_, i) => i).filter(i => !usedNew.has(i))

  return { keyColumnIndex, removedRowIndices, addedRowIndices, movedRows, changedCells, addedColumns, removedColumns }
}
