'use client'

import { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import BottomNav from '@/components/layout/BottomNav'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { useUnreadMessages } from '@/lib/hooks/useUnreadMessages'
import type { Profile } from '@/types'

interface DashboardShellProps {
  profile: Profile | null
  children: React.ReactNode
}

export default function DashboardShell({ profile, children }: DashboardShellProps) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(profile?.id)
  const { count: messageCount } = useUnreadMessages(profile?.id)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="app-shell">
      <Sidebar
        profile={profile}
        notificationCount={unreadCount}
        messageCount={messageCount}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <Topbar
        profile={profile}
        notifications={notifications}
        markRead={markRead}
        markAllRead={markAllRead}
        onOpenMenu={() => setMobileOpen(true)}
      />
      <main className="main-content">
        {children}
      </main>
      <BottomNav messageCount={messageCount} onOpenMenu={() => setMobileOpen(true)} />
    </div>
  )
}
