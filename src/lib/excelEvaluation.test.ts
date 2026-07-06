import { describe, expect, it } from 'vitest'
import {
  cellsMatch,
  evaluateExcelChallenge,
  normalizeCell,
} from './excelEvaluation'
import { ExcelEvaluationConfig, ExcelTableState } from '@/types/game'

function config(overrides: Partial<ExcelEvaluationConfig> = {}): ExcelEvaluationConfig {
  return {
    rowOrderMatters: true,
    columnOrderMatters: true,
    numericTolerance: 0,
    ...overrides,
  }
}

describe('normalizeCell', () => {
  it('normalizes empty/whitespace strings and null/undefined to null', () => {
    expect(normalizeCell('')).toBeNull()
    expect(normalizeCell('   ')).toBeNull()
    expect(normalizeCell(null)).toBeNull()
    expect(normalizeCell(undefined as unknown as null)).toBeNull()
  })

  it('coerces numeric strings to numbers', () => {
    expect(normalizeCell('42')).toBe(42)
    expect(normalizeCell('-3.5')).toBe(-3.5)
    expect(normalizeCell('  7  ')).toBe(7)
  })

  it('trims plain strings but keeps them as strings', () => {
    expect(normalizeCell('  Berlin  ')).toBe('Berlin')
  })

  it('passes numbers through unchanged', () => {
    expect(normalizeCell(9)).toBe(9)
  })
})

describe('cellsMatch', () => {
  it('treats null-equivalents as equal', () => {
    expect(cellsMatch(null, '')).toBe(true)
    expect(cellsMatch('   ', null)).toBe(true)
  })

  it('does not treat null and 0 as equal', () => {
    expect(cellsMatch(null, 0)).toBe(false)
    expect(cellsMatch('', '0')).toBe(false)
  })

  it('respects numeric tolerance inclusively at the boundary', () => {
    expect(cellsMatch(10, 10.5, 0.5)).toBe(true)
    expect(cellsMatch(10, 10.51, 0.5)).toBe(false)
    expect(cellsMatch(10, 10, 0)).toBe(true)
  })

  it('compares strings case-sensitively after trimming', () => {
    expect(cellsMatch('Berlin', ' Berlin ', 0)).toBe(true)
    expect(cellsMatch('Berlin', 'berlin', 0)).toBe(false)
  })
})

describe('evaluateExcelChallenge', () => {
  const solutionData: ExcelTableState = {
    headers: ['Name', 'Betrag'],
    rows: [
      ['Alpha', 100],
      ['Beta', 200],
      ['Gamma', 300],
    ],
  }

  it('scores 100% when the current table exactly matches the solution', () => {
    const current: ExcelTableState = {
      headers: ['Name', 'Betrag'],
      rows: [
        ['Alpha', 100],
        ['Beta', 200],
        ['Gamma', 300],
      ],
    }
    const result = evaluateExcelChallenge(current, {
      solutionData,
      evaluationCriteria: [{ id: 'c1', description: 'Beträge korrekt', weight: 1, columns: ['Betrag'] }],
      evaluationConfig: config(),
    })
    expect(result.score).toBe(100)
    expect(result.criteriaResults[0].passed).toBe(true)
  })

  it('ignores column order when columnOrderMatters is false', () => {
    const current: ExcelTableState = {
      headers: ['Betrag', 'Name'],
      rows: [
        [100, 'Alpha'],
        [200, 'Beta'],
        [300, 'Gamma'],
      ],
    }
    const result = evaluateExcelChallenge(current, {
      solutionData,
      evaluationCriteria: [{ id: 'c1', description: 'Alles korrekt', weight: 1, columns: ['Name', 'Betrag'] }],
      evaluationConfig: config({ columnOrderMatters: false }),
    })
    expect(result.score).toBe(100)
  })

  it('scores 100% with shuffled rows when rowOrderMatters is false', () => {
    const current: ExcelTableState = {
      headers: ['Name', 'Betrag'],
      rows: [
        ['Gamma', 300],
        ['Alpha', 100],
        ['Beta', 200],
      ],
    }
    const result = evaluateExcelChallenge(current, {
      solutionData,
      evaluationCriteria: [{ id: 'c1', description: 'Zeilen korrekt', weight: 1, columns: ['Name', 'Betrag'] }],
      evaluationConfig: config({ rowOrderMatters: false }),
    })
    expect(result.score).toBe(100)
  })

  it('penalizes the same shuffled rows when rowOrderMatters is true', () => {
    const current: ExcelTableState = {
      headers: ['Name', 'Betrag'],
      rows: [
        ['Gamma', 300],
        ['Alpha', 100],
        ['Beta', 200],
      ],
    }
    const result = evaluateExcelChallenge(current, {
      solutionData,
      evaluationCriteria: [{ id: 'c1', description: 'Zeilen korrekt', weight: 1, columns: ['Name', 'Betrag'] }],
      evaluationConfig: config({ rowOrderMatters: true }),
    })
    expect(result.score).toBeLessThan(100)
  })

  it('computes exact weighted partial credit across two criteria', () => {
    const current: ExcelTableState = {
      headers: ['Name', 'Betrag'],
      rows: [
        ['Alpha', 100],
        ['Beta', 200],
        ['Gamma', 300],
      ],
    }
    const result = evaluateExcelChallenge(current, {
      solutionData,
      evaluationCriteria: [
        { id: 'names-correct', description: 'Namen korrekt', weight: 0.6, columns: ['Name'] },
        { id: 'amounts-wrong', description: 'Beträge korrekt', weight: 0.4, columns: ['Betrag'] },
      ],
      evaluationConfig: config(),
    })
    // Names column fully correct (weight 0.6 * ratio 1.0), amounts column entirely
    // replaced with a non-matching sentinel value below (weight 0.4 * ratio 0.0) -> 60.
    const currentWithWrongAmounts: ExcelTableState = {
      headers: ['Name', 'Betrag'],
      rows: [
        ['Alpha', 999],
        ['Beta', 999],
        ['Gamma', 999],
      ],
    }
    const result2 = evaluateExcelChallenge(currentWithWrongAmounts, {
      solutionData,
      evaluationCriteria: [
        { id: 'names-correct', description: 'Namen korrekt', weight: 0.6, columns: ['Name'] },
        { id: 'amounts-wrong', description: 'Beträge korrekt', weight: 0.4, columns: ['Betrag'] },
      ],
      evaluationConfig: config(),
    })
    expect(result.score).toBe(100)
    expect(result2.score).toBe(60)
    expect(result2.criteriaResults[0].passed).toBe(true)
    expect(result2.criteriaResults[1].passed).toBe(false)
  })

  it('scores a criterion as 0 when its column is entirely missing, without crashing or affecting other criteria', () => {
    const current: ExcelTableState = {
      headers: ['Name'],
      rows: [['Alpha'], ['Beta'], ['Gamma']],
    }
    const result = evaluateExcelChallenge(current, {
      solutionData,
      evaluationCriteria: [
        { id: 'names-correct', description: 'Namen korrekt', weight: 0.5, columns: ['Name'] },
        { id: 'amounts-correct', description: 'Beträge korrekt', weight: 0.5, columns: ['Betrag'] },
      ],
      evaluationConfig: config(),
    })
    expect(result.criteriaResults[0].passed).toBe(true)
    expect(result.criteriaResults[1].passed).toBe(false)
    expect(result.score).toBe(50)
  })
})
