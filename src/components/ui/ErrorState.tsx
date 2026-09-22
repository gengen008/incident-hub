import { AlertTriangle } from 'lucide-react'
import Button from './Button'

interface ErrorStateProps {
  title?: string
  detail?: string
  onRetry?: () => void
}

export default function ErrorState({
  title = 'Something went wrong',
  detail,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-xl)] bg-[var(--color-danger-light)] text-[var(--color-danger)]">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h3 className="font-display font-bold text-[var(--color-ink)]">{title}</h3>
      {detail && <p className="font-sans text-sm text-[var(--color-ink-3)] max-w-sm">{detail}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>
      )}
    </div>
  )
}
