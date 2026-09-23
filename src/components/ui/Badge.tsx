import { cn } from '@/lib/utils'
import type { RequestStatus, RequestPriority, UserRole } from '@/types'
import { statusLabel, priorityLabel, roleLabel } from '@/lib/utils'

interface BadgeProps {
  value: string
  type?: 'status' | 'priority' | 'role' | 'category'
  label?: string
  className?: string
}

export default function Badge({ value, type, label, className }: BadgeProps) {
  const cls = type
    ? `badge badge-${value.toLowerCase().replace(/\s+/g, '_')}`
    : 'badge'

  return (
    <span className={cn(cls, className)}>
      {(type === 'status' || type === 'priority') && <span className="badge-dot" />}
      {label ?? value.replace(/_/g, ' ')}
    </span>
  )
}

export function StatusBadge({ status }: { status: RequestStatus }) {
  return <Badge value={status} type="status" label={statusLabel(status)} />
}

export function PriorityBadge({ priority }: { priority: RequestPriority }) {
  return <Badge value={priority} type="priority" label={priorityLabel(priority)} />
}

export function RoleBadge({ role }: { role: UserRole }) {
  return <Badge value={role} type="role" label={roleLabel(role)} />
}
