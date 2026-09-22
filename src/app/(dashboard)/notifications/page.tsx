'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, CheckCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/hooks/useProfile'
import Button from '@/components/ui/Button'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { timeAgo, formatDateTime } from '@/lib/utils'
import { toastSuccess } from '@/lib/toast'
import type { Notification } from '@/types'

export default function NotificationsPage() {
  const { profile, loading: profileLoading } = useProfile()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

  useEffect(() => {
    if (profileLoading || !profile) return
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(50)
      setNotifications((data as Notification[]) ?? [])
      setLoading(false)
    }
    load()
  }, [profileLoading, profile])

  async function markRead(id: string) {
    const supabase = createClient()
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  async function markAllRead() {
    if (!profile) return
    setMarkingAll(true)
    const supabase = createClient()
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    toastSuccess('All notifications marked as read')
    setMarkingAll(false)
  }

  const unread = notifications.filter(n => !n.is_read).length

  if (profileLoading || loading) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread notification${unread > 1 ? 's' : ''}` : 'All caught up'}
        action={
          unread > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              icon={<CheckCheck className="h-3.5 w-3.5" />}
              loading={markingAll}
              onClick={markAllRead}
            >
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={<BellOff className="h-10 w-10" />}
          title="No notifications yet"
          description="You'll see incident updates and assignments here."
        />
      ) : (
        <div className="panel">
          <div className="divide-y divide-[var(--border-default)]">
            {notifications.map(n => (
              <button
                key={n.id}
                onClick={() => { if (!n.is_read) markRead(n.id) }}
                className={`w-full text-left flex items-start gap-4 px-5 py-4 transition-colors hover:bg-[var(--surface-page)] ${!n.is_read ? 'bg-[oklch(98%_0.01_264)]' : ''}`}
              >
                <div
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: n.is_read ? 'var(--color-ink-6)' : 'oklch(95% 0.03 264)',
                    color:      n.is_read ? 'var(--color-ink-3)' : 'oklch(48% 0.17 264)',
                  }}
                >
                  <Bell className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-sm font-semibold text-[var(--color-ink)] mb-0.5">{n.title}</p>
                  {n.body && (
                    <p className="font-sans text-xs text-[var(--color-ink-3)] mb-1 line-clamp-2">{n.body}</p>
                  )}
                  <span
                    className="font-mono text-[10px] text-[var(--color-ink-4)]"
                    title={formatDateTime(n.created_at)}
                  >
                    {timeAgo(n.created_at)}
                  </span>
                </div>
                {!n.is_read && (
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[oklch(48%_0.17_264)]" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
