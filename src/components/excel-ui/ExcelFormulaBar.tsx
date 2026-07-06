'use client'

interface Props {
  cellLabel: string
  cellValue: string
}

export default function ExcelFormulaBar({ cellLabel, cellValue }: Props) {
  return (
    <>
      <style>{formulaBarStyles}</style>
      <div className="xf-bar">
        <div className="xf-namebox">{cellLabel}</div>
        <div className="xf-fx">fx</div>
        <div className="xf-value">{cellValue}</div>
      </div>
    </>
  )
}

const formulaBarStyles = `
  .xf-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #ffffff;
    border-bottom: 1px solid #d0d0d0;
    padding: 5px 10px;
    flex-shrink: 0;
  }
  .xf-namebox {
    min-width: 64px;
    text-align: center;
    font-size: 12.5px;
    font-weight: 600;
    color: #217346;
    border: 1px solid #d0d0d0;
    border-radius: 3px;
    padding: 3px 8px;
    background: #f8f8f8;
  }
  .xf-fx {
    font-style: italic;
    color: #217346;
    font-size: 13px;
    font-weight: 700;
  }
  .xf-value {
    flex: 1;
    font-size: 12.5px;
    color: #222;
    padding: 3px 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`
