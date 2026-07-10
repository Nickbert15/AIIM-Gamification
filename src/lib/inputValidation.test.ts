import { describe, expect, it } from 'vitest'
import { validateCustomInput, validateCustomField, CustomInputPayload } from './inputValidation'

const base: CustomInputPayload = {
  technologyId: 'a1b2c3d4-uuid',
  technologyCustom: null,
  learningGoal: 'controlling',
  learningGoalCustom: null,
}

describe('validateCustomInput', () => {
  it('ignoriert Felder, deren Dropdown nicht "other" ist', () => {
    // technologyCustom ist Müll, wird aber nicht geprüft, weil technologyId != "other"
    const res = validateCustomInput({ ...base, technologyCustom: '<script>' })
    expect(res.valid).toBe(true)
    expect(res.errors).toEqual([])
  })

  it('akzeptiert plausiblen Freitext', () => {
    const res = validateCustomInput({
      ...base,
      technologyId: 'other',
      technologyCustom: 'Retrieval-Augmented Generation',
      learningGoal: 'other',
      learningGoalCustom: 'Anlagenbuchhaltung',
    })
    expect(res.valid).toBe(true)
    expect(res.errors).toEqual([])
  })

  it('meldet leeren Freitext (nach trim)', () => {
    const res = validateCustomInput({ ...base, technologyId: 'other', technologyCustom: '   ' })
    expect(res.valid).toBe(false)
    expect(res.errors.map((e) => e.field)).toContain('technologyCustom')
  })

  it('prüft beide gesetzten Custom-Felder', () => {
    const res = validateCustomInput({
      ...base,
      technologyId: 'other',
      technologyCustom: '',
      learningGoal: 'other',
      learningGoalCustom: '',
    })
    expect(res.valid).toBe(false)
    expect(res.errors.map((e) => e.field).sort()).toEqual(['learningGoalCustom', 'technologyCustom'])
  })
})

describe('validateCustomField', () => {
  it('lehnt zu kurze Eingaben ab', () => {
    expect(validateCustomField('f', 'ab')).not.toHaveLength(0)
  })

  it('lehnt zu lange Eingaben ab (>120)', () => {
    expect(validateCustomField('f', 'a'.repeat(121))).not.toHaveLength(0)
  })

  it('akzeptiert genau 3 und genau 120 Zeichen', () => {
    expect(validateCustomField('f', 'abc')).toEqual([])
    expect(validateCustomField('f', 'a'.repeat(120))).toEqual([])
  })

  it('verlangt mindestens einen Buchstaben', () => {
    expect(validateCustomField('f', '12345')).not.toHaveLength(0)
    expect(validateCustomField('f', '!!! ###')).not.toHaveLength(0)
  })

  it('akzeptiert Buchstaben mit Umlauten und Ziffern', () => {
    expect(validateCustomField('f', 'Kostenträgerrechnung 2')).toEqual([])
  })

  it('lehnt HTML-Tags / spitze Klammern ab', () => {
    expect(validateCustomField('f', '<script>alert(1)</script>')).not.toHaveLength(0)
    expect(validateCustomField('f', 'a < b')).not.toHaveLength(0)
  })

  it('lehnt Template-Klammern und Backticks ab', () => {
    expect(validateCustomField('f', 'Prompt {{ inject }}')).not.toHaveLength(0)
    expect(validateCustomField('f', 'code `rm -rf`')).not.toHaveLength(0)
  })

  it('lehnt Steuerzeichen ab', () => {
    // Steuerzeichen bewusst per fromCharCode einsetzen (kein Literal im Quelltext).
    const withNul = 'abc' + String.fromCharCode(0) + 'def'
    const withTab = 'abc' + String.fromCharCode(9) + 'def'
    expect(validateCustomField('f', withNul)).not.toHaveLength(0)
    expect(validateCustomField('f', withTab)).not.toHaveLength(0)
  })
})
