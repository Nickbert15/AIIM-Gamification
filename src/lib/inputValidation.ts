// LAYER 1 — deterministic gate for admin free-text input.
// Pure, testable function (same pattern as excelValidation.ts).
// Checks ONLY the set custom fields, purely structurally — semantic
// nonsense ("asdf") is NOT caught here, that's layer 2's job (LLM).

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

// Injection-relevant characters/patterns: HTML tags are already covered by < >.
const INJECTION_PATTERNS: RegExp[] = [/</, />/, /\{\{/, /\}\}/, /`/]

// Does the string contain at least one letter? Deliberately without a
// \p{L}/u regex (target-independent): a letter differs between upper and
// lower case (covers a-z, A-Z, umlauts, ß, accented letters).
function hasLetter(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const ch = s.charAt(i)
    if (ch.toLowerCase() !== ch.toUpperCase()) return true
  }
  return false
}

// Control characters (C0 range incl. tab/newline, plus DEL) — deliberately
// via char code instead of a regex literal, to avoid literal control
// characters in the source.
function hasControlChar(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i)
    if (code < 0x20 || code === 0x7f) return true
  }
  return false
}

// Structurally validates a single set free-text field.
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
