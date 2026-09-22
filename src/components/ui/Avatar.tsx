import { getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface AvatarProps {
  name?: string | null
  url?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  xs: { wh: 'h-6 w-6', text: 'text-[9px]' },
  sm: { wh: 'h-8 w-8', text: 'text-xs' },
  md: { wh: 'h-10 w-10', text: 'text-sm' },
  lg: { wh: 'h-12 w-12', text: 'text-base' },
}

export default function Avatar({ name, url, size = 'sm', className }: AvatarProps) {
  const { wh, text } = sizeMap[size]
  const initials = name ? getInitials(name) : '?'

  return (
    <div
      className={cn(
        wh, text,
        'rounded-full flex items-center justify-center font-mono font-bold flex-shrink-0 overflow-hidden',
        'bg-[oklch(22%_0.06_264)] text-[rgb(96,165,250)]',
        className
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={initials} className="h-full w-full object-cover" />
      ) : initials}
    </div>
  )
}
