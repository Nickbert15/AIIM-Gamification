import { describe, expect, it } from 'vitest'
import { computeSimilarity, isPromptTooSimilarToTask } from './promptSimilarity'

const TASK = 'Deine Kollegin aus dem Reporting bereitet die Monatsübersicht für die Geschäftsführung vor. ' +
  'Die Zahlen im Export kommen mit unterschiedlich vielen Nachkommastellen aus dem Vorsystem, was in der ' +
  'Präsentation unruhig und unprofessionell wirkt. Sie hätte die Werte gerne in einer sauberen, glatten Form, ' +
  'wie man sie auch auf einer Folie zeigen würde. Kannst du die Tabelle so aufbereiten, dass sie direkt ' +
  'kopierfertig für die Präsentation ist?'

describe('isPromptTooSimilarToTask', () => {
  it('blocks an exact copy of the task text', () => {
    expect(isPromptTooSimilarToTask(TASK, TASK)).toBe(true)
  })

  it('blocks a lightly reworded copy (word order / minor synonym swaps)', () => {
    const reworded = 'Deine Kollegin aus dem Controlling bereitet die Monatsübersicht für die Geschäftsführung vor. ' +
      'Die Zahlen im Export kommen mit unterschiedlich vielen Nachkommastellen aus dem Vorsystem, was in der ' +
      'Präsentation unruhig und unprofessionell wirkt. Sie hätte die Werte gerne in einer sauberen, glatten Form, ' +
      'wie man sie auch auf einer Folie zeigen würde. Kannst du die Übersicht so aufbereiten, dass sie direkt ' +
      'kopierfertig für die Präsentation ist?'
    expect(isPromptTooSimilarToTask(reworded, TASK)).toBe(true)
  })

  it('allows a genuinely own-formulated prompt about the same topic/columns', () => {
    const ownPrompt = 'Runde alle Werte in der Spalte Betrag auf ganze Zahlen ohne Nachkommastellen.'
    expect(isPromptTooSimilarToTask(ownPrompt, TASK)).toBe(false)
  })

  it('allows a short, unrelated prompt', () => {
    expect(isPromptTooSimilarToTask('Sortiere nach Datum.', TASK)).toBe(false)
  })

  it('computeSimilarity returns 0 for empty input', () => {
    expect(computeSimilarity('', TASK)).toBe(0)
    expect(computeSimilarity('irgendein Text', '')).toBe(0)
  })
})
