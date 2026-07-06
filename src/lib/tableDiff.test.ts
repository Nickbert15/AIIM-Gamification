import { describe, expect, it } from 'vitest'
import { computeTableDiff } from './tableDiff'
import { ExcelTableState } from '@/types/game'

describe('computeTableDiff', () => {
  it('reports no changes for an identical table', () => {
    const table: ExcelTableState = {
      headers: ['Kostenstelle', 'Betrag'],
      rows: [['A', 10], ['B', 20], ['C', 30]],
    }
    const diff = computeTableDiff(table, table)
    expect(diff.removedRowIndices).toEqual([])
    expect(diff.addedRowIndices).toEqual([])
    expect(diff.movedRows).toEqual([])
    expect(diff.changedCells).toEqual([])
    expect(diff.addedColumns).toEqual([])
    expect(diff.removedColumns).toEqual([])
  })

  it('detects a changed cell via the stable key column', () => {
    const oldTable: ExcelTableState = {
      headers: ['Kostenstelle', 'Betrag'],
      rows: [['A', 10], ['B', 20], ['C', 30]],
    }
    const newTable: ExcelTableState = {
      headers: ['Kostenstelle', 'Betrag'],
      rows: [['A', 10], ['B', 25], ['C', 30]],
    }
    const diff = computeTableDiff(oldTable, newTable)
    expect(diff.keyColumnIndex).toBe(0)
    expect(diff.removedRowIndices).toEqual([])
    expect(diff.addedRowIndices).toEqual([])
    expect(diff.changedCells).toEqual([{ rowKey: JSON.stringify('B'), colIndex: 1, oldValue: 20, newValue: 25 }])
  })

  it('detects a deleted row', () => {
    const oldTable: ExcelTableState = {
      headers: ['Kostenstelle', 'Betrag'],
      rows: [['A', 10], ['B', 20], ['C', 30]],
    }
    const newTable: ExcelTableState = {
      headers: ['Kostenstelle', 'Betrag'],
      rows: [['A', 10], ['C', 30]],
    }
    const diff = computeTableDiff(oldTable, newTable)
    expect(diff.removedRowIndices).toEqual([1])
    expect(diff.addedRowIndices).toEqual([])
    expect(diff.movedRows).toEqual([{ oldIndex: 2, newIndex: 1 }])
    expect(diff.changedCells).toEqual([])
  })

  it('detects a new row', () => {
    const oldTable: ExcelTableState = {
      headers: ['Kostenstelle', 'Betrag'],
      rows: [['A', 10], ['C', 30]],
    }
    const newTable: ExcelTableState = {
      headers: ['Kostenstelle', 'Betrag'],
      rows: [['A', 10], ['B', 20], ['C', 30]],
    }
    const diff = computeTableDiff(oldTable, newTable)
    expect(diff.addedRowIndices).toEqual([1])
    expect(diff.removedRowIndices).toEqual([])
  })

  it('detects reordered rows with unchanged content as moves, not changes', () => {
    const oldTable: ExcelTableState = {
      headers: ['Kostenstelle', 'Betrag'],
      rows: [['A', 10], ['B', 20], ['C', 30]],
    }
    const newTable: ExcelTableState = {
      headers: ['Kostenstelle', 'Betrag'],
      rows: [['C', 30], ['B', 20], ['A', 10]],
    }
    const diff = computeTableDiff(oldTable, newTable)
    expect(diff.changedCells).toEqual([])
    expect(diff.removedRowIndices).toEqual([])
    expect(diff.addedRowIndices).toEqual([])
    expect(diff.movedRows).toEqual(
      expect.arrayContaining([
        { oldIndex: 0, newIndex: 2 },
        { oldIndex: 2, newIndex: 0 },
      ])
    )
    expect(diff.movedRows).not.toContainEqual({ oldIndex: 1, newIndex: 1 })
  })

  it('detects an added column without affecting existing row matching', () => {
    const oldTable: ExcelTableState = {
      headers: ['Kostenstelle', 'Betrag'],
      rows: [['A', 10], ['B', 20]],
    }
    const newTable: ExcelTableState = {
      headers: ['Kostenstelle', 'Betrag', 'Marge'],
      rows: [['A', 10, 0.1], ['B', 20, 0.2]],
    }
    const diff = computeTableDiff(oldTable, newTable)
    expect(diff.addedColumns).toEqual([2])
    expect(diff.removedColumns).toEqual([])
    expect(diff.removedRowIndices).toEqual([])
    expect(diff.addedRowIndices).toEqual([])
  })

  it('detects a removed column', () => {
    const oldTable: ExcelTableState = {
      headers: ['Kostenstelle', 'Betrag', 'Marge'],
      rows: [['A', 10, 0.1], ['B', 20, 0.2]],
    }
    const newTable: ExcelTableState = {
      headers: ['Kostenstelle', 'Betrag'],
      rows: [['A', 10], ['B', 20]],
    }
    const diff = computeTableDiff(oldTable, newTable)
    expect(diff.removedColumns).toEqual([2])
    expect(diff.addedColumns).toEqual([])
  })

  it('falls back to removed+added when no column is a reliable stable key', () => {
    const oldTable: ExcelTableState = {
      headers: ['Abteilung', 'Status'],
      rows: [['Vertrieb', 'aktiv'], ['Vertrieb', 'aktiv']],
    }
    const newTable: ExcelTableState = {
      headers: ['Abteilung', 'Status'],
      rows: [['Vertrieb', 'inaktiv'], ['Vertrieb', 'inaktiv']],
    }
    const diff = computeTableDiff(oldTable, newTable)
    expect(diff.keyColumnIndex).toBeNull()
    expect(diff.removedRowIndices).toEqual([0, 1])
    expect(diff.addedRowIndices).toEqual([0, 1])
  })
})
