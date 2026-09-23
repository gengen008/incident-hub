'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Inbox, Plus, MessageSquare, Menu } from 'lucide-react'

interface BottomNavProps {
  messageCount?: number
  onOpenMenu: () => void
}

export default function BottomNav({ messageCount = 0, onOpenMenu }: BottomNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    if (href === '/requests') return pathname === '/requests' || (pathname.startsWith('/requests/') && pathname !== '/requests/new')
    return pathname.startsWith(href)
  }

  const item = (href: string, Icon: typeof Inbox, label: string, badge = 0) => {
    const active = isActive(href)
    return (
      <Link href={href} className={`bottom-nav-item ${active ? 'active' : ''}`}>
        <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.5 : 2} />
        <span>{label}</span>
        {badge > 0 && <span className="nav-badge">{badge > 9 ? '9+' : badge}</span>}
      </Link>
    )
  }

  return (
    <nav className="bottom-nav">
      {item('/dashboard', LayoutDashboard, 'Home')}
      {item('/requests', Inbox, 'Requests')}
      <button className="bottom-nav-item bottom-nav-fab" onClick={() => router.push('/requests/new')} aria-label="New request">
        <span className="bottom-nav-fab-inner"><Plus className="h-6 w-6" strokeWidth={2.5} /></span>
      </button>
      {item('/chat', MessageSquare, 'Messages', messageCount)}
      <button className="bottom-nav-item" onClick={onOpenMenu} aria-label="Menu">
        <Menu className="h-[22px] w-[22px]" strokeWidth={2} />
        <span>More</span>
      </button>
    </nav>
  )
}
