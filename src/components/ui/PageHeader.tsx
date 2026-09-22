'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
  breadcrumb?: React.ReactNode
  back?: boolean
}

export default function PageHeader({ title, subtitle, action, className, breadcrumb, back }: PageHeaderProps) {
  const router = useRouter()
  return (
    <div className={cn('mb-6', className)}>
      {back && (
        <button
          onClick={() => router.back()}
          className="mb-3 flex items-center gap-1.5 font-sans text-xs text-[var(--color-ink-3)] hover:text-[var(--color-ink)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
      )}
      {breadcrumb && <div className="mb-1">{breadcrumb}</div>}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold text-[var(--color-ink)] tracking-tight leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 font-sans text-sm text-[var(--color-ink-3)] max-w-xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="flex-shrink-0 flex items-center gap-2">{action}</div>}
      </div>
    </div>
  )
}
