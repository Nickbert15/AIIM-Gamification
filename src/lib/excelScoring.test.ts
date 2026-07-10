import { describe, expect, it } from 'vitest'
import { computeExcelPoints } from './excelScoring'

describe('computeExcelPoints', () => {
  it('awards full base points plus the max attempt-bonus on the first attempt', () => {
    expect(computeExcelPoints(100, 1, 3, 100)).toBe(120)
  })

  it('scales base points down proportionally to the score', () => {
    expect(computeExcelPoints(50, 1, 3, 100)).toBe(60)
  })

  it('reduces the bonus as more attempts are used', () => {
    expect(computeExcelPoints(100, 2, 3, 100)).toBe(110)
    expect(computeExcelPoints(100, 3, 3, 100)).toBe(100)
  })

  it('never awards a bonus when maxAttempts is 1', () => {
    expect(computeExcelPoints(100, 1, 1, 100)).toBe(100)
  })
})
