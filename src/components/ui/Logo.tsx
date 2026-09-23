import { cn } from '@/lib/utils'

interface LogoProps {
  showText?: boolean
  size?: number
  className?: string
  variant?: 'default' | 'light'
}

export default function Logo({ showText = true, size = 34, className, variant = 'default' }: LogoProps) {
  return (
    <div className={cn('brand-lockup', className)}>
      <span className="brand-mark" style={{ width: size, height: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/labianca-logo.jpg" alt="Labianca" />
      </span>
      {showText && (
        <span>
          <span className="brand-name" style={variant === 'light' ? { color: 'white' } : undefined}>
            Labianca Desk
          </span>
          <span className="brand-name-sub" style={variant === 'light' ? { color: 'rgba(255,255,255,0.5)' } : undefined}>
            Company Limited
          </span>
        </span>
      )}
    </div>
  )
}
