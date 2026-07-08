'use client'

import { useEffect, useRef } from 'react'

interface Props {
  open: boolean
  onClose?: () => void
  variant?: 'neutral' | 'celebratory'
  title?: string
  children: React.ReactNode
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
}

// Small, dependency-free focus trap: keeps Tab/Shift+Tab cycling inside the
// popup and returns focus to whatever triggered it on close, since these
// popups interrupt gameplay and a lost focus ring is disorienting for
// keyboard/screen-reader users.
export default function GamePopup({ open, onClose, variant = 'neutral', title, children }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement
    const dialog = dialogRef.current
    const focusables = dialog?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    focusables?.[0]?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && onClose) {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !dialog) return
      const items = dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <style>{popupStyles}</style>
      <div className="gpop-backdrop" onClick={onClose}>
        <div
          ref={dialogRef}
          className={`gpop-dialog ${variant === 'celebratory' ? 'gpop-celebratory' : ''} ${prefersReducedMotion() ? 'gpop-no-anim' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={(e) => e.stopPropagation()}
        >
          {title && <div className="gpop-title">{title}</div>}
          <div className="gpop-content">{children}</div>
        </div>
      </div>
    </>
  )
}

const popupStyles = `
  .gpop-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(2,6,15,0.65);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    padding: 20px;
    animation: gpop-fade-in 0.18s ease;
  }
  .gpop-dialog {
    position: relative;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    max-width: 480px;
    width: 100%;
    max-height: 85vh;
    overflow-y: auto;
    padding: 24px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.45);
    animation: gpop-pop-in 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .gpop-dialog.gpop-celebratory {
    border-color: var(--accent);
    box-shadow: 0 20px 60px rgba(14,165,233,0.25);
  }
  .gpop-dialog.gpop-no-anim { animation: none; }
  .gpop-title {
    font-size: 17px;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 14px;
  }
  .gpop-content {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  @keyframes gpop-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes gpop-pop-in {
    from { opacity: 0; transform: scale(0.94) translateY(8px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .gpop-backdrop, .gpop-dialog { animation: none; }
  }
`
