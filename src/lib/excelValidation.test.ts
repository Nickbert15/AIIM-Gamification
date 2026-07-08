import { describe, expect, it } from 'vitest'
import { containsForbiddenOperationLanguage } from './excelValidation'

describe('containsForbiddenOperationLanguage', () => {
  it('detects direct operation verbs', () => {
    expect(containsForbiddenOperationLanguage('Sortiere die Tabelle absteigend nach Umsatz.')).toContain('sortier')
    expect(containsForbiddenOperationLanguage('Lösche alle Nullzeilen.')).toContain('lösch')
    expect(containsForbiddenOperationLanguage('Berechne die Marge pro Zeile.')).toContain('berechn')
    expect(containsForbiddenOperationLanguage('Gruppiere nach Abteilung.')).toContain('gruppier')
  })

  it('detects "neue Spalte" style phrasing', () => {
    expect(containsForbiddenOperationLanguage('Ergänze eine Spalte "Marge".')).not.toHaveLength(0)
  })

  it('allows scenario-based task text with no operation verbs', () => {
    const task = 'Deine Kollegin aus dem Reporting bereitet die Monatsübersicht für die Geschäftsführung vor. ' +
      'Die Zahlen im Export kommen mit unterschiedlich vielen Nachkommastellen aus dem Vorsystem, was in der ' +
      'Präsentation unruhig wirkt. Sie hätte die Werte gerne in einer sauberen, glatten Form.'
    expect(containsForbiddenOperationLanguage(task)).toEqual([])
  })

  it('is case-insensitive', () => {
    expect(containsForbiddenOperationLanguage('SORTIERE die liste')).toContain('sortier')
  })
})
