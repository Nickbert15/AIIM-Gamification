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
  promptOptions?: HallucinationPromptOption[]
  outputVariants?: HallucinationOutputVariant[]
  halluRound?: HalluRoundV2
  arenaRounds?: ArenaRound[]
  contextIntro?: string
  scoring?: { maxPoints: number; passingScore: number }
  aiContextNote?: string
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
