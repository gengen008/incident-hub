import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  label?: string
}

export default function LoadingSpinner({ size = 'md', className, label }: LoadingSpinnerProps) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <span
        className={cn(
          sizes[size],
          'rounded-full border-[3px] border-[var(--border-default)] border-t-[var(--color-brand)] animate-spin'
        )}
      />
      {label && (
        <span className="font-sans text-sm text-[var(--color-ink-3)]">{label}</span>
      )}
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <LoadingSpinner size="lg" label="Loading…" />
    </div>
  )
}

export function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn('skeleton h-4', className)} />
}
