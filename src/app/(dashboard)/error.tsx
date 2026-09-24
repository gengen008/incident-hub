'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCw, Home } from 'lucide-react'
import Button from '@/components/ui/Button'

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('Dashboard error:', error) }, [error])

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-xl)] bg-[var(--color-danger-light)] text-[var(--color-danger)] mb-4">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h1 className="font-display text-xl font-bold text-[var(--color-ink)] mb-1">Something went wrong</h1>
      <p className="font-sans text-sm text-[var(--color-ink-3)] max-w-sm mb-5">
        This page hit an unexpected error. Try again, or head back to your dashboard.
      </p>
      <div className="flex items-center gap-2">
        <Button variant="primary" icon={<RotateCw className="h-4 w-4" />} onClick={() => reset()}>Try again</Button>
        <Button variant="secondary" icon={<Home className="h-4 w-4" />} onClick={() => { window.location.href = '/dashboard' }}>Dashboard</Button>
      </div>
    </div>
  )
}
