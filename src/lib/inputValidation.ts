// SCHICHT 1 — deterministischer Gate für Admin-Freitexteingaben.
// Reine, testbare Funktion (gleiches Muster wie excelValidation.ts).
// Prüft NUR die gesetzten Custom-Felder rein strukturell — semantischer
// Unsinn ("asdf") wird hier NICHT abgefangen, das macht Schicht 2 (LLM).

export interface CustomInputPayload {
  technologyId: string
  technologyCustom: string | null
  learningGoal: string
  learningGoalCustom: string | null
}

export interface FieldError {
  field: string
  message: string
}

export interface CustomInputValidationResult {
  valid: boolean
  errors: FieldError[]
}

const MIN_LENGTH = 3
const MAX_LENGTH = 120

// Injection-relevante Zeichen/Muster: HTML-Tags werden bereits durch < > abgedeckt.
const INJECTION_PATTERNS: RegExp[] = [/</, />/, /\{\{/, /\}\}/, /`/]

// Enthält der String mindestens einen Buchstaben? Bewusst ohne \p{L}/u-Regex
// (Target-unabhängig): ein Buchstabe unterscheidet sich in Groß-/Kleinschreibung
// (deckt a-z, A-Z, Umlaute, ß, akzentuierte Buchstaben ab).
function hasLetter(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const ch = s.charAt(i)
    if (ch.toLowerCase() !== ch.toUpperCase()) return true
  }
  return false
}

// Steuerzeichen (C0-Bereich inkl. Tab/Newline sowie DEL) — bewusst per Char-Code
// statt Regex-Literal, um keine literalen Steuerzeichen im Quelltext zu haben.
function hasControlChar(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i)
    if (code < 0x20 || code === 0x7f) return true
  }
  return false
}

// Prüft ein einzelnes gesetztes Freitextfeld strukturell.
export function validateCustomField(field: string, raw: string): FieldError[] {
  const errors: FieldError[] = []
  const value = raw.trim()

  if (value.length === 0) {
    errors.push({ field, message: 'Bitte gib einen Wert ein.' })
    return errors
  }

  if (value.length < MIN_LENGTH || value.length > MAX_LENGTH) {
    errors.push({
      field,
      message: `Die Eingabe muss zwischen ${MIN_LENGTH} und ${MAX_LENGTH} Zeichen lang sein.`,
    })
  }

  if (!hasLetter(value)) {
    errors.push({ field, message: 'Die Eingabe muss mindestens einen Buchstaben enthalten.' })
  }

  if (hasControlChar(value) || INJECTION_PATTERNS.some((p) => p.test(value))) {
    errors.push({
      field,
      message: 'Die Eingabe enthält unerlaubte Zeichen (< > { } ` oder Steuerzeichen).',
    })
  }

  return errors
}

export function validateCustomInput(payload: CustomInputPayload): CustomInputValidationResult {
  const errors: FieldError[] = []

  if (payload.technologyId === 'other') {
    errors.push(...validateCustomField('technologyCustom', payload.technologyCustom ?? ''))
  }

  if (payload.learningGoal === 'other') {
    errors.push(...validateCustomField('learningGoalCustom', payload.learningGoalCustom ?? ''))
  }

  return { valid: errors.length === 0, errors }
}
