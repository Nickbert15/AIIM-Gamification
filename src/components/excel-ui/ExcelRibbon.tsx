'use client'

import { useState } from 'react'
import { useI18n } from '@/lib/i18n'

const TABS = [
  { id: 'home', labelKey: 'excel.tab.home' },
  { id: 'insert', labelKey: 'excel.tab.insert' },
  { id: 'formulas', labelKey: 'excel.tab.formulas' },
  { id: 'data', labelKey: 'excel.tab.data' },
  { id: 'view', labelKey: 'excel.tab.view' },
] as const
type Tab = typeof TABS[number]['id']

const GROUPS: Record<Tab, { labelKey: string; icons: string[] }[]> = {
  home: [
    { labelKey: 'excel.grp.clipboard', icons: ['📋', '✂', '📄'] },
    { labelKey: 'excel.grp.font', icons: ['B', 'I', 'U'] },
    { labelKey: 'excel.grp.alignment', icons: ['◧', '▤', '◨'] },
    { labelKey: 'excel.grp.number', icons: ['123', '%', '€'] },
  ],
  insert: [
    { labelKey: 'excel.grp.tables', icons: ['▦', '📊'] },
    { labelKey: 'excel.grp.illustrations', icons: ['🖼', '🔷'] },
    { labelKey: 'excel.grp.charts', icons: ['📈', '📉'] },
  ],
  formulas: [
    { labelKey: 'excel.grp.functionLibrary', icons: ['ƒx', 'Σ', '∅'] },
    { labelKey: 'excel.grp.definedNames', icons: ['🏷'] },
  ],
  data: [
    { labelKey: 'excel.grp.sortFilter', icons: ['⇅', '▼'] },
    { labelKey: 'excel.grp.dataTools', icons: ['⎘', '⚙'] },
  ],
  view: [
    { labelKey: 'excel.grp.sheetView', icons: ['⊞', '▥'] },
    { labelKey: 'excel.grp.zoom', icons: ['🔍'] },
  ],
}

export default function ExcelRibbon() {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<Tab>('home')
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
              key={tab.id}
              className={`xr-tab ${activeTab === tab.id ? 'xr-tab-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
        <div className="xr-groups">
          {GROUPS[activeTab].map(group => (
            <div key={group.labelKey} className="xr-group">
              <div className="xr-icons">
                {group.icons.map((icon, i) => (
                  <button key={i} className="xr-icon-btn" onClick={handleIconClick}>{icon}</button>
                ))}
              </div>
              <div className="xr-group-label">{t(group.labelKey)}</div>
            </div>
          ))}
          {showHint && <div className="xr-hint">{t('excel.ribbonDisabled')}</div>}
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
