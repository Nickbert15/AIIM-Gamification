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
