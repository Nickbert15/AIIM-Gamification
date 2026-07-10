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
  promptOptions?: HallucinationPromptOption[]
  outputVariants?: HallucinationOutputVariant[]
  halluRound?: HalluRoundV2
  arenaRounds?: ArenaRound[]
  branching?: BranchingContent
  contextIntro?: string
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

export interface QuestionOption {
  id: string
  text: string
  [key: string]: unknown
}

export interface Question {
  id: string
  question: string
  options: QuestionOption[]
  correctAnswer: string
  explanation?: string
  points?: number
  [key: string]: unknown
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

// --- Hallucination Spotter v2 ---

export interface HallucinationPromptOption {
  id: number
  text: string
  isRecommended: boolean
  critique: string
}

export interface HallucinationLine {
  id: number
  text: string
  isHallucination: boolean
  explanation: string
}

export interface HallucinationOutputVariant {
  promptOptionId: number
  lines: HallucinationLine[]
}

// --- Hallucination Spotter v2 (round 2: 5 prompts + one full annotated text) ---

export type HalluPromptApproach = 'vage' | 'kontext' | 'rolle' | 'quellen' | 'suggestiv'

export interface HalluPromptOptionV2 {
  id: number
  text: string
  approach: HalluPromptApproach
  quality: number // 0-100, drives the star rating; hidden from the player until after they choose
  isRecommended: boolean
  feedback: string // plain-language explanation shown after choosing
}

export interface HalluSentenceV2 {
  id: number
  text: string
  isHallucination: boolean
  explanation: string
}

export interface HalluRoundV2 {
  situation: string
  promptOptions: HalluPromptOptionV2[]
  answer: { sentences: HalluSentenceV2[] }
}

// --- Prompt Arena ---

export interface ArenaReferenceOutput {
  id: number
  text: string
  qualityRank: 1 | 2
  note: string
}

export interface ArenaRound {
  id: number
  taskDescription: string
  systemContext: string
  referenceOutputs: ArenaReferenceOutput[]
}

export interface ArenaEvaluation {
  scorePercent: number // 0-100, quality of the player's own answer vs. the best reference
  explanation: string
  whatWasGood: string
  improvement: string
  comparison: string
}

// --- Prompt-Navigator (prompt_branching) ---
// Ein Szenario, in dem die Spielerin aus mehreren Prompt-Optionen wählt und den
// simulierten KI-Output anschließend über ein kleines Zustandsdiagramm (Knoten +
// Optionen) bewertet bekommt. Die Knotentypen sind bewusst generisch gehalten,
// damit ein Szenario mehrere Runden (Auswahl -> Diagnose -> Nachsteuern) abbilden
// kann, ohne dass der Player-Code pro Runde neuen Code braucht.

export type BranchNodeType = 'prompt_choice' | 'output_review' | 'diagnosis' | 'info' | 'end'

export interface BranchOption {
  id: string
  label: string
  /** Nur bei prompt_choice: der vollständige Prompt-Text, der der Spielerin angezeigt wird */
  promptText?: string | null
  points: number
  /** Erklärung, die bei diagnosis-Knoten nach der Wahl eingeblendet wird */
  feedback?: string
  nextNode: string
}

export interface BranchRecapLesson {
  craftElement: string
  text: string
}

export interface BranchNode {
  type: BranchNodeType
  /** Frage/Aufgabenstellung (prompt_choice, diagnosis) oder Erklärtext (info) */
  text?: string
  /** Simulierter KI-Output (output_review) */
  aiOutput?: string
  /** Kurzes Bewertungs-Label für den Ergebnis-Popup (output_review), z. B. "Ausgezeichnet" */
  ratingLabel?: string
  /** Begründung, warum der Prompt/Output gut oder weniger gut war (output_review) */
  explanation?: string
  options?: BranchOption[]
  /** Bei info-/output_review-Knoten: direkter Folgeknoten */
  nextNode?: string
  /** Nur bei end-Knoten */
  recapIntro?: string
  lessons?: BranchRecapLesson[]
}

export interface BranchingContent {
  scenario: { intro: string; personaNote?: string }
  startNode: string
  nodes: Record<string, BranchNode>
  scoring: { maxPoints: number; passingScore: number }
}
