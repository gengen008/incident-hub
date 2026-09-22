'use client'

import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  children,
  className,
  disabled,
  ...props
}, ref) => {
  const base = 'inline-flex items-center justify-center gap-2 font-sans font-semibold rounded-[var(--radius-md)] transition-all cursor-pointer border disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2'

  const variants = {
    primary: 'bg-[var(--color-brand)] text-white border-transparent hover:bg-[var(--color-brand-mid)] focus-visible:outline-[var(--color-brand)]',
    secondary: 'bg-white text-[var(--color-ink-2)] border-[var(--border-default)] hover:border-[var(--color-brand-light)] hover:text-[var(--color-brand)] focus-visible:outline-[var(--color-brand)]',
    danger: 'bg-[var(--color-danger)] text-white border-transparent hover:bg-[oklch(48%_0.22_25)] focus-visible:outline-[var(--color-danger)]',
    ghost: 'bg-transparent text-[var(--color-ink-3)] border-transparent hover:bg-[var(--surface-rail)] focus-visible:outline-[var(--color-brand)]',
  }

  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-9 px-4 text-sm',
    lg: 'h-11 px-6 text-sm',
  }

  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children && <span>{children}</span>}
      {iconRight && !loading && <span className="flex-shrink-0">{iconRight}</span>}
    </button>
  )
})
Button.displayName = 'Button'

export default Button
