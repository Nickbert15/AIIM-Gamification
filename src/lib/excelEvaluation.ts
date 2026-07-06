import {
  ExcelCellValue,
  ExcelChallengeData,
  ExcelTableState,
  GameJson,
} from '@/types/game'

export function extractExcelChallengeData(gameJson: GameJson): ExcelChallengeData {
  const { task, initialData, solutionData, evaluationCriteria, evaluationConfig, maxAttempts, samplePrompt } = gameJson
  if (!task || !initialData || !solutionData || !evaluationCriteria || !evaluationConfig || !maxAttempts || !samplePrompt) {
    throw new Error('Spiel enthält keine vollständigen Excel-Prompt-Challenge-Daten')
  }
  return { task, initialData, solutionData, evaluationCriteria, evaluationConfig, maxAttempts, samplePrompt }
}

export interface CriterionResult {
  id: string
  description: string
  passed: boolean
  weight: number
}

export interface EvaluationResult {
  score: number
  criteriaResults: CriterionResult[]
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase()
}

export function normalizeCell(v: ExcelCellValue): string | number | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const trimmed = v.trim()
  if (trimmed === '') return null
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed)
  return trimmed
}

export function cellsMatch(a: ExcelCellValue, b: ExcelCellValue, tolerance: number): boolean {
  const na = normalizeCell(a)
  const nb = normalizeCell(b)
  if (na === null && nb === null) return true
  if (na === null || nb === null) return false
  if (typeof na === 'number' && typeof nb === 'number') return Math.abs(na - nb) <= tolerance
  if (typeof na !== typeof nb) return false
  return na === nb
}

export function alignColumns(currentHeaders: string[], solutionHeaders: string[]): number[] {
  return solutionHeaders.map(sh =>
    currentHeaders.findIndex(ch => normalizeHeader(ch) === normalizeHeader(sh))
  )
}

function rowSimilarity(
  solutionRow: ExcelCellValue[],
  currentRow: ExcelCellValue[],
  colMap: number[],
  tolerance: number
): number {
  let matches = 0
  colMap.forEach((ci, si) => {
    if (ci === -1) return
    if (cellsMatch(currentRow[ci], solutionRow[si], tolerance)) matches++
  })
  return matches
}

export function matchRowsUnordered(
  currentRows: ExcelCellValue[][],
  solutionRows: ExcelCellValue[][],
  colMap: number[],
  tolerance: number
): number[] {
  const assignment = new Array(solutionRows.length).fill(-1)
  const candidates: { si: number; ci: number; sim: number }[] = []
  solutionRows.forEach((srow, si) => {
    currentRows.forEach((crow, ci) => {
      candidates.push({ si, ci, sim: rowSimilarity(srow, crow, colMap, tolerance) })
    })
  })
  candidates.sort((a, b) => b.sim - a.sim)
  const assignedSolutionRows = new Set<number>()
  const usedCurrentRows = new Set<number>()
  for (const c of candidates) {
    if (assignedSolutionRows.has(c.si) || usedCurrentRows.has(c.ci)) continue
    assignment[c.si] = c.ci
    assignedSolutionRows.add(c.si)
    usedCurrentRows.add(c.ci)
  }
  return assignment
}

function isColumnOrderCorrect(colMap: number[], solutionColumnIndices: number[]): boolean {
  const currentPositions = solutionColumnIndices
    .map(si => colMap[si])
    .filter(ci => ci !== -1)
  for (let i = 1; i < currentPositions.length; i++) {
    if (currentPositions[i] <= currentPositions[i - 1]) return false
  }
  return true
}

export function evaluateExcelChallenge(
  current: ExcelTableState,
  challenge: Pick<ExcelChallengeData, 'solutionData' | 'evaluationCriteria' | 'evaluationConfig'>
): EvaluationResult {
  const { solutionData, evaluationCriteria, evaluationConfig } = challenge
  const colMap = alignColumns(current.headers, solutionData.headers)

  const rowMap = evaluationConfig.rowOrderMatters
    ? solutionData.rows.map((_, i) => i)
    : matchRowsUnordered(current.rows, solutionData.rows, colMap, evaluationConfig.numericTolerance)

  const criteriaResults = evaluationCriteria.map(criterion => {
    const solutionColumnIndices = criterion.columns
      .map(colName => solutionData.headers.findIndex(h => normalizeHeader(h) === normalizeHeader(colName)))
      .filter(i => i !== -1)

    const orderOk = evaluationConfig.columnOrderMatters
      ? isColumnOrderCorrect(colMap, solutionColumnIndices)
      : true

    let totalCells = 0
    let matchedCells = 0
    solutionData.rows.forEach((solRow, si) => {
      const ci = rowMap[si]
      solutionColumnIndices.forEach(solColIdx => {
        totalCells++
        if (ci === -1) return
        const curColIdx = colMap[solColIdx]
        if (curColIdx === -1) return
        const currentRow = current.rows[ci]
        if (!currentRow) return
        if (cellsMatch(currentRow[curColIdx], solRow[solColIdx], evaluationConfig.numericTolerance)) {
          matchedCells++
        }
      })
    })

    const ratio = !orderOk ? 0 : totalCells === 0 ? 0 : matchedCells / totalCells

    return {
      id: criterion.id,
      description: criterion.description,
      passed: ratio >= 1.0,
      weight: criterion.weight,
      ratio,
    }
  })

  const rawScore = criteriaResults.reduce((sum, r) => sum + r.weight * r.ratio, 0) * 100
  const score = Math.max(0, Math.min(100, Math.round(rawScore)))

  return {
    score,
    criteriaResults: criteriaResults.map(({ id, description, passed, weight }) => ({
      id, description, passed, weight,
    })),
  }
}
