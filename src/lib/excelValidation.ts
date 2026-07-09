import { ExcelEvaluationConfig, ExcelEvaluationCriterion, ExcelTableState } from '@/types/game'

export interface GeneratedExcelChallenge {
  title: string
  task: string
  topic: string
  initialData: ExcelTableState
  solutionData: ExcelTableState
  evaluationCriteria: ExcelEvaluationCriterion[]
  evaluationConfig: ExcelEvaluationConfig
  samplePrompt: string
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

const FORBIDDEN_TASK_PHRASES = [
  'sortier', 'lösch', 'entfern', 'filter', 'berechn', 'gruppier', 'aggregier',
  'summier', 'runde', 'runden', 'dedupli', 'duplikat', 'neue spalte', 'spalte hinzu',
  'füge eine spalte', 'ergänze eine spalte', 'füge eine zeile', 'ergänze eine zeile',
]

export function containsForbiddenOperationLanguage(task: string): string[] {
  const normalized = task.toLowerCase()
  return FORBIDDEN_TASK_PHRASES.filter(phrase => normalized.includes(phrase))
}

export function isTableState(v: unknown): v is ExcelTableState {
  if (!v || typeof v !== 'object') return false
  const t = v as Record<string, unknown>
  if (!Array.isArray(t.headers) || !t.headers.every(h => typeof h === 'string')) return false
  if (!Array.isArray(t.rows)) return false
  const headers = t.headers as string[]
  return t.rows.every(row =>
    Array.isArray(row) &&
    row.length === headers.length &&
    row.every(cell => cell === null || typeof cell === 'string' || typeof cell === 'number')
  )
}

export function validateExcelGeneration(parsed: unknown): ValidationResult {
  const errors: string[] = []
  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, errors: ['Antwort ist kein JSON-Objekt'] }
  }
  const g = parsed as Record<string, unknown>

  if (typeof g.title !== 'string' || !g.title.trim()) errors.push('title fehlt oder ist leer')
  if (typeof g.task !== 'string' || !g.task.trim()) {
    errors.push('task fehlt oder ist leer')
  } else {
    const forbiddenHits = containsForbiddenOperationLanguage(g.task)
    if (forbiddenHits.length > 0) {
      errors.push(`task enthält verbotene Operationsformulierungen: ${forbiddenHits.join(', ')}`)
    }
  }
  if (typeof g.samplePrompt !== 'string' || !g.samplePrompt.trim()) errors.push('samplePrompt fehlt oder ist leer')

  const initialDataValid = isTableState(g.initialData)
  const solutionDataValid = isTableState(g.solutionData)
  if (!initialDataValid) errors.push('initialData hat kein gültiges {headers, rows}-Schema')
  if (!solutionDataValid) errors.push('solutionData hat kein gültiges {headers, rows}-Schema')

  const initialData = initialDataValid ? (g.initialData as ExcelTableState) : undefined
  const solutionData = solutionDataValid ? (g.solutionData as ExcelTableState) : undefined

  if (initialData) {
    if (initialData.headers.length < 4 || initialData.headers.length > 8) {
      errors.push(`initialData hat ${initialData.headers.length} Spalten, erwartet 4-8`)
    }
    if (initialData.rows.length < 15 || initialData.rows.length > 60) {
      errors.push(`initialData hat ${initialData.rows.length} Zeilen, erwartet 15-60`)
    }
  }

  if (solutionData) {
    if (solutionData.headers.length < 4 || solutionData.headers.length > 8) {
      errors.push(`solutionData hat ${solutionData.headers.length} Spalten, erwartet 4-8`)
    }
    if (initialData && (solutionData.rows.length < 1 || solutionData.rows.length > initialData.rows.length)) {
      errors.push('solutionData hat eine unplausible Zeilenanzahl relativ zu initialData')
    }
  }

  if (!Array.isArray(g.evaluationCriteria) || g.evaluationCriteria.length === 0) {
    errors.push('evaluationCriteria fehlt oder ist leer')
  } else {
    const criteria = g.evaluationCriteria as ExcelEvaluationCriterion[]
    const weightSum = criteria.reduce((s, c) => s + (typeof c.weight === 'number' ? c.weight : 0), 0)
    if (Math.abs(weightSum - 1) > 0.02) {
      errors.push(`evaluationCriteria-Gewichte summieren zu ${weightSum.toFixed(2)}, erwartet ~1.0`)
    }
    const solutionHeaders = (solutionData?.headers ?? []).map(h => h.trim().toLowerCase())
    criteria.forEach((c, i) => {
      if (!Array.isArray(c.columns) || c.columns.length === 0) {
        errors.push(`Kriterium ${i + 1} (${c.id ?? '?'}) hat keine columns`)
        return
      }
      const unknownCols = c.columns.filter(col => !solutionHeaders.includes(col.trim().toLowerCase()))
      if (unknownCols.length > 0) {
        errors.push(`Kriterium ${i + 1} (${c.id ?? '?'}) referenziert unbekannte Spalten: ${unknownCols.join(', ')}`)
      }
    })
  }

  if (!g.evaluationConfig || typeof g.evaluationConfig !== 'object') {
    errors.push('evaluationConfig fehlt')
  } else {
    const ec = g.evaluationConfig as Record<string, unknown>
    if (typeof ec.rowOrderMatters !== 'boolean') errors.push('evaluationConfig.rowOrderMatters fehlt')
    if (typeof ec.columnOrderMatters !== 'boolean') errors.push('evaluationConfig.columnOrderMatters fehlt')
    if (typeof ec.numericTolerance !== 'number') errors.push('evaluationConfig.numericTolerance fehlt')
  }

  return { valid: errors.length === 0, errors }
}
