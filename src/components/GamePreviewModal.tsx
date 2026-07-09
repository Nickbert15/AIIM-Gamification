'use client'

import { Game } from '@/types/game'
import ExcelGamePlayer from './ExcelGamePlayer'

interface Props {
  game: Game | null
  onClose: () => void
}

export default function GamePreviewModal({ game, onClose }: Props) {
  if (!game) return null

  // Dispatch auf game.format (Discriminant-Spalte) BEVOR ein game_json-Feld gelesen wird.
  if (game.format === 'excel_challenge' && game.game_json.task && game.game_json.initialData) {
    return (
      <>
        <style>{`
          .gpm-overlay {
            position: fixed; inset: 0; background: rgba(0,0,0,0.8);
            backdrop-filter: blur(4px); display: flex;
            align-items: center; justify-content: center;
            z-index: 1000; padding: 16px;
          }
          .gpm-card {
            background: var(--bg-card); border: 1px solid var(--border);
            border-radius: var(--radius); width: 100%;
            max-height: 90vh; overflow: hidden; display: flex; flex-direction: column;
          }
          .gpm-header {
            display: flex; align-items: flex-start; justify-content: space-between;
            gap: 16px; padding: 14px 20px; border-bottom: 1px solid var(--border);
            flex-shrink: 0; background: var(--bg-card);
          }
          .gpm-title { font-size: 16px; font-weight: 700; color: var(--text); margin: 0; line-height: 1.4; }
          .gpm-subtitle { font-size: 12px; color: var(--text-muted); margin-top: 3px; }
          .gpm-close {
            background: none; border: 1px solid var(--border); border-radius: 6px;
            color: var(--text-muted); cursor: pointer; font-size: 18px; line-height: 1;
            padding: 4px 10px; flex-shrink: 0; font-family: inherit;
          }
          .gpm-close:hover { color: var(--text); border-color: var(--accent); }
        `}</style>
        <div className="gpm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
          <div className="gpm-card" style={{ maxWidth: '96vw' }}>
            <div className="gpm-header">
              <div>
                <h2 className="gpm-title">{game.title}</h2>
                <div className="gpm-subtitle">Excel Challenge · {game.difficulty}</div>
              </div>
              <button className="gpm-close" onClick={onClose}>×</button>
            </div>
            <ExcelGamePlayer
              gameId={game.id}
              task={game.game_json.task ?? ''}
              initialData={game.game_json.initialData}
              maxAttempts={game.game_json.maxAttempts ?? 3}
              playerId={null}
              onComplete={(r) => console.log('preview result:', r)}
              onClose={onClose}
            />
          </div>
        </div>
      </>
    )
  }

  // Unbekanntes/fehlendes Format oder unvollständige Excel-Daten → Hinweis statt Crash.
  return (
    <PreviewMessage
      title={game.title}
      subtitle={[game.format || '—', game.difficulty].filter(Boolean).join(' · ')}
      message={`Spieltyp nicht verfügbar${game.format ? ` (Format „${game.format}“)` : ''}.`}
      onClose={onClose}
    />
  )
}

// Fallback-Ansicht für Formate ohne Preview (unbekannt/fehlend, unvollständige Daten).
function PreviewMessage({
  title,
  subtitle,
  message,
  onClose,
}: {
  title: string
  subtitle: string
  message: string
  onClose: () => void
}) {
  return (
    <>
      <style>{`
        .gpm-msg-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.8);
          backdrop-filter: blur(4px); display: flex;
          align-items: center; justify-content: center; z-index: 1000; padding: 16px;
        }
        .gpm-msg-card {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--radius); width: 100%; max-width: 480px;
          display: flex; flex-direction: column;
        }
        .gpm-msg-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 16px; padding: 20px 24px 16px; border-bottom: 1px solid var(--border);
        }
        .gpm-msg-title { font-size: 16px; font-weight: 700; color: var(--text); margin: 0; line-height: 1.4; }
        .gpm-msg-subtitle { font-size: 12px; color: var(--text-muted); margin-top: 3px; }
        .gpm-msg-close {
          background: none; border: 1px solid var(--border); border-radius: 6px;
          color: var(--text-muted); cursor: pointer; font-size: 18px; line-height: 1;
          padding: 4px 10px; flex-shrink: 0; font-family: inherit;
        }
        .gpm-msg-close:hover { color: var(--text); border-color: var(--accent); }
        .gpm-msg-body { padding: 28px 24px; text-align: center; color: var(--text-dim); font-size: 14px; line-height: 1.6; }
        .gpm-msg-actions { display: flex; justify-content: flex-end; padding: 0 24px 20px; }
      `}</style>
      <div className="gpm-msg-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <div className="gpm-msg-card">
          <div className="gpm-msg-header">
            <div>
              <h2 className="gpm-msg-title">{title}</h2>
              {subtitle && <div className="gpm-msg-subtitle">{subtitle}</div>}
            </div>
            <button className="gpm-msg-close" onClick={onClose}>×</button>
          </div>
          <div className="gpm-msg-body">{message}</div>
          <div className="gpm-msg-actions">
            <button className="btn btn-ghost" onClick={onClose}>Schließen</button>
          </div>
        </div>
      </div>
    </>
  )
}
