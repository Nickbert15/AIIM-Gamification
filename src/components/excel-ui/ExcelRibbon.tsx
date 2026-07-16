'use client'

import { useState } from 'react'

const TABS = ['Start', 'Einfügen', 'Formeln', 'Daten', 'Ansicht'] as const
type Tab = typeof TABS[number]

const GROUPS: Record<Tab, { label: string; icons: string[] }[]> = {
  'Start': [
    { label: 'Zwischenablage', icons: ['📋', '✂', '📄'] },
    { label: 'Schriftart', icons: ['B', 'I', 'U'] },
    { label: 'Ausrichtung', icons: ['◧', '▤', '◨'] },
    { label: 'Zahl', icons: ['123', '%', '€'] },
  ],
  'Einfügen': [
    { label: 'Tabellen', icons: ['▦', '📊'] },
    { label: 'Illustrationen', icons: ['🖼', '🔷'] },
    { label: 'Diagramme', icons: ['📈', '📉'] },
  ],
  'Formeln': [
    { label: 'Funktionsbibliothek', icons: ['ƒx', 'Σ', '∅'] },
    { label: 'Definierte Namen', icons: ['🏷'] },
  ],
  'Daten': [
    { label: 'Sortieren & Filtern', icons: ['⇅', '▼'] },
    { label: 'Datentools', icons: ['⎘', '⚙'] },
  ],
  'Ansicht': [
    { label: 'Blattansicht', icons: ['⊞', '▥'] },
    { label: 'Zoom', icons: ['🔍'] },
  ],
}

export default function ExcelRibbon() {
  const [activeTab, setActiveTab] = useState<Tab>('Start')
  const [showHint, setShowHint] = useState(false)

  function handleIconClick() {
    setShowHint(true)
    setTimeout(() => setShowHint(false), 1400)
  }

  return (
    <>
      <style>{ribbonStyles}</style>
      <div className="xr-ribbon">
        <div className="xr-tabbar">
          {TABS.map(tab => (
            <button
              key={tab}
              className={`xr-tab ${activeTab === tab ? 'xr-tab-active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="xr-groups">
          {GROUPS[activeTab].map(group => (
            <div key={group.label} className="xr-group">
              <div className="xr-icons">
                {group.icons.map((icon, i) => (
                  <button key={i} className="xr-icon-btn" onClick={handleIconClick}>{icon}</button>
                ))}
              </div>
              <div className="xr-group-label">{group.label}</div>
            </div>
          ))}
          {showHint && <div className="xr-hint">Im Spiel deaktiviert</div>}
        </div>
      </div>
    </>
  )
}

const ribbonStyles = `
  .xr-ribbon {
    background: #217346;
    flex-shrink: 0;
    user-select: none;
  }
  .xr-tabbar {
    display: flex;
    gap: 2px;
    padding: 6px 12px 0;
  }
  .xr-tab {
    background: transparent;
    border: none;
    color: rgba(255,255,255,0.85);
    font-size: 13px;
    padding: 7px 14px;
    border-radius: 4px 4px 0 0;
    cursor: pointer;
    font-family: inherit;
  }
  .xr-tab:hover { background: rgba(255,255,255,0.12); }
  .xr-tab-active {
    background: #ffffff;
    color: #14532d;
    font-weight: 600;
  }
  .xr-groups {
    background: #f3f2f1;
    display: flex;
    align-items: stretch;
    gap: 4px;
    padding: 6px 10px;
    position: relative;
  }
  .xr-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    padding: 2px 10px;
    border-right: 1px solid #d9d9d9;
  }
  .xr-group:last-of-type { border-right: none; }
  .xr-icons {
    display: flex;
    gap: 4px;
  }
  .xr-icon-btn {
    background: #ffffff;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 13px;
    cursor: pointer;
    color: #333;
    min-width: 30px;
  }
  .xr-icon-btn:hover { background: #e8f3ec; border-color: #217346; }
  .xr-group-label {
    font-size: 10px;
    color: #666;
    white-space: nowrap;
  }
  .xr-hint {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: #333;
    color: #fff;
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 4px;
  }

  /* Schmale Screens: Tab-Leiste und Gruppen horizontal scrollen lassen,
     statt zu überlaufen und abgeschnitten zu werden. */
  @media (max-width: 760px) {
    .xr-tabbar { overflow-x: auto; }
    .xr-groups { overflow-x: auto; }
    .xr-tab { white-space: nowrap; }
  }
`
