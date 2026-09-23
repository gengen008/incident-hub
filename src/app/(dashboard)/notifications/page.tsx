'use client'

import { useRouter } from 'next/navigation'
import { Bell, Check, CheckCheck } from 'lucide-react'
import { useProfile } from '@/lib/hooks/useProfile'
import { useNotifications } from '@/lib/hooks/useNotifications'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { timeAgo, formatDateTime } from '@/lib/utils'

export default function NotificationsPage() {
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const { notifications, loading, unreadCount, markRead, markAllRead } = useNotifications(profile?.id)

  if (profileLoading || loading) return <PageLoader />

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
        action={unreadCount > 0 ? <Button variant="secondary" size="sm" icon={<CheckCheck className="h-4 w-4" />} onClick={() => markAllRead()}>Mark all read</Button> : undefined}
      />

      {notifications.length === 0 ? (
        <div className="panel">
          <EmptyState icon={<Bell className="h-6 w-6" />} title="No notifications" description="Assignments, replies, status changes, and new messages will appear here." />
        </div>
      ) : (
        <div className="panel overflow-hidden">
          {notifications.map(n => (
            <button
              key={n.id}
              onClick={() => { if (!n.is_read) markRead(n.id); if (n.link) router.push(n.link) }}
              className={`flex w-full items-start gap-3 border-b border-[var(--color-ink-6)] p-4 text-left transition-colors last:border-none ${n.is_read ? 'hover:bg-[var(--surface-page)]' : 'bg-[var(--color-brand-subtle)] hover:bg-[oklch(95%_0.03_248)]'}`}
            >
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: n.is_read ? 'var(--color-ink-6)' : 'white', color: 'var(--color-brand)' }}>
                <Bell className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-sans text-sm font-semibold text-[var(--color-ink)] mb-0.5">{n.title}</p>
                {n.body && <p className="font-sans text-xs text-[var(--color-ink-3)] mb-1 line-clamp-2">{n.body}</p>}
                <span className="font-mono text-[10px] text-[var(--color-ink-4)]" title={formatDateTime(n.created_at)}>{timeAgo(n.created_at)}</span>
              </div>
              {!n.is_read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--color-brand)]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
