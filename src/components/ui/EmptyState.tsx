import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export default function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center gap-3', className)}>
      {icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-xl)] bg-[var(--color-ink-6)] text-[var(--color-ink-4)] mb-1">
          {icon}
        </div>
      )}
      <h3 className="font-display font-bold text-[var(--color-ink)] text-base">{title}</h3>
      {description && (
        <p className="font-sans text-sm text-[var(--color-ink-3)] max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
