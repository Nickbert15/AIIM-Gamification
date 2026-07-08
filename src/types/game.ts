export interface Game {
  id: string
  title: string
  format: string
  library_type: string | null
  target_role: string | null
  difficulty: string | null
  language: string
  topic: string | null
  persona_key: string | null
  learning_objective: string | null
  game_json: GameJson
  status: 'draft' | 'approved' | 'rejected'
  source_attribution: Record<string, unknown> | null
  created_at: string
}

export interface GameJson {
  format?: string
  questions?: Question[]
  challenges?: Challenge[]
  scoring?: { maxPoints: number; passingScore: number }
  aiContextNote?: string
  task?: string
  initialData?: ExcelTableState
  solutionData?: ExcelTableState
  evaluationCriteria?: ExcelEvaluationCriterion[]
  evaluationConfig?: ExcelEvaluationConfig
  maxAttempts?: number
  samplePrompt?: string
  [key: string]: unknown
}

export interface Challenge {
  id: number
  task: string
  context: string
  system_prompt: string
  evaluation_criteria: string[]
  example_good_prompt: string
  points: number
}

export interface Question {
  id: number
  question: string
  options: { id: string; text: string }[]
  correctAnswer: string
  explanation: string
  points?: number
}

export type ExcelCellValue = string | number | null

export interface ExcelTableState {
  headers: string[]
  rows: ExcelCellValue[][]
}

export interface ExcelEvaluationCriterion {
  id: string
  description: string
  weight: number
  columns: string[]
}

export interface ExcelEvaluationConfig {
  rowOrderMatters: boolean
  columnOrderMatters: boolean
  numericTolerance: number
}

export interface ExcelChallengeData {
  task: string
  initialData: ExcelTableState
  solutionData: ExcelTableState
  evaluationCriteria: ExcelEvaluationCriterion[]
  evaluationConfig: ExcelEvaluationConfig
  maxAttempts: number
  samplePrompt: string
}
