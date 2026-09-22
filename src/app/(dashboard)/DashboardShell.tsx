'use client'

import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { useNotifications } from '@/lib/hooks/useNotifications'
import type { Profile } from '@/types'

interface DashboardShellProps {
  profile: Profile | null
  children: React.ReactNode
}

export default function DashboardShell({ profile, children }: DashboardShellProps) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(profile?.id)

  return (
    <div className="app-shell">
      <Sidebar profile={profile} notificationCount={unreadCount} />
      <Topbar
        profile={profile}
        notifications={notifications}
        markRead={markRead}
        markAllRead={markAllRead}
      />
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}
