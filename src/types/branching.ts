// Typen für das Format 'prompt_branching'.
// Bewusst als eigene Datei angelegt, damit src/types/game.ts unverändert bleibt.
// GameJson ist dank Index-Signature kompatibel; hier wird nur präzisiert.

export type BranchNodeType = 'prompt_choice' | 'output_review' | 'diagnosis' | 'info' | 'end'

export interface BranchOption {
  id: string
  label: string
  /** Nur bei prompt_choice: der vollständige Prompt-Text, der dem User gezeigt wird */
  promptText?: string | null
  points: number
  /** Erklärung, die nach der Wahl eingeblendet wird */
  feedback?: string
  nextNode: string
}

export interface RecapLesson {
  craftElement: string
  text: string
}

export interface BranchNode {
  type: BranchNodeType
  /** Frage / Aufgabenstellung (prompt_choice, diagnosis) oder Erklärtext (info) */
  text?: string
  /** Vorab generierter KI-Output (output_review) */
  aiOutput?: string
  /** Bewertungsfrage zum Output (output_review) */
  question?: string
  options?: BranchOption[]
  /** Bei info-Nodes: direkter Folgeknoten */
  nextNode?: string
  /** Nur bei end-Nodes */
  recapIntro?: string
  expertPath?: string[]
  lessons?: RecapLesson[]
}

export interface BranchingGameJson {
  format: 'prompt_branching'
  scenario: { intro: string; personaNote?: string }
  startNode: string
  nodes: Record<string, BranchNode>
  scoring: { maxPoints: number; passingScore: number }
  aiContextNote?: string
  injectedError?: { node: string; claim: string; reason: string }
}
