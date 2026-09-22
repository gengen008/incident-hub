'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  footer?: React.ReactNode
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export default function Modal({ open, onClose, title, children, size = 'md', footer }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'oklch(10% 0.02 264 / 0.55)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.15s ease' }}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div
        className={cn('w-full bg-white rounded-[var(--radius-xl)] shadow-[var(--shadow-modal)] flex flex-col max-h-[90vh]', sizes[size])}
        style={{ animation: 'slide-up-fade 0.2s ease' }}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)] shrink-0">
            <h2 className="font-display text-lg font-bold text-[var(--color-ink)] tracking-tight">{title}</h2>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-ink-3)] hover:bg-[var(--surface-rail)] hover:text-[var(--color-ink)] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {children}
        </div>
        {footer && (
          <div className="shrink-0 px-6 py-4 border-t border-[var(--border-default)] flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
