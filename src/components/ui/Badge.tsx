import { cn } from '@/lib/utils'
import type { IncidentStatus, IncidentPriority, UserRole } from '@/types'

interface BadgeProps {
  value: string
  type?: 'status' | 'priority' | 'role' | 'category'
  className?: string
}

export default function Badge({ value, type, className }: BadgeProps) {
  const cls = type
    ? `badge badge-${value.toLowerCase().replace(/\s+/g, '_')}`
    : 'badge'

  const label = value.replace(/_/g, ' ')

  return (
    <span className={cn(cls, className)}>
      {(type === 'status' || type === 'priority') && <span className="badge-dot" />}
      {label}
    </span>
  )
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return <Badge value={status} type="status" />
}

export function PriorityBadge({ priority }: { priority: IncidentPriority }) {
  return <Badge value={priority} type="priority" />
}

export function RoleBadge({ role }: { role: UserRole }) {
  return <Badge value={role} type="role" />
}
