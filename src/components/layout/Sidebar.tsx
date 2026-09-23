'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Inbox, Plus, MessageSquare, Users2,
  Bell, Settings, LogOut, Building2, ShieldCheck, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { isAdmin } from '@/lib/auth'
import { roleLabel } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import Logo from '@/components/ui/Logo'

function buildNavGroups(role?: string | null) {
  const admin = isAdmin(role as Profile['role'] | null)
  return [
    {
      label: 'Workspace',
      items: [
        { href: '/dashboard',     Icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/chat',          Icon: MessageSquare,   label: 'Messages' },
        { href: '/notifications', Icon: Bell,            label: 'Notifications' },
      ],
    },
    {
      label: 'Requests',
      items: [
        { href: '/requests',     Icon: Inbox, label: 'All Requests' },
        { href: '/requests/new', Icon: Plus,  label: 'New Request' },
      ],
    },
    {
      label: 'Company',
      items: [
        { href: '/directory', Icon: Users2, label: 'Directory' },
      ],
    },
    ...(admin ? [{
      label: 'Administration',
      items: [
        { href: '/admin/users',       Icon: Users2,      label: 'Users' },
        { href: '/admin/departments', Icon: Building2,   label: 'Departments' },
        { href: '/admin',             Icon: ShieldCheck, label: 'Overview' },
      ],
    }] : []),
    {
      label: 'Account',
      items: [
        { href: '/settings', Icon: Settings, label: 'Settings' },
      ],
    },
  ]
}

interface SidebarProps {
  profile?: Profile | null
  notificationCount?: number
  messageCount?: number
  mobileOpen?: boolean
  onCloseMobile?: () => void
}

export default function Sidebar({ profile, notificationCount = 0, messageCount = 0, mobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const navGroups = buildNavGroups(profile?.role)

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    if (href === '/admin') return pathname === '/admin'
    if (href === '/requests') return pathname === '/requests' || (pathname.startsWith('/requests/') && pathname !== '/requests/new')
    return pathname.startsWith(href)
  }

  function badgeFor(href: string) {
    if (href === '/notifications') return notificationCount
    if (href === '/chat') return messageCount
    return 0
  }

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const NavList = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {navGroups.map(group => (
        <div key={group.label} className="space-y-0.5">
          <div className="px-3 pb-1.5 font-sans text-[0.6rem] font-bold uppercase tracking-widest text-white/40">
            {group.label}
          </div>
          {group.items.map(item => {
            const active = isActive(item.href)
            const count = badgeFor(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className="relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all"
                style={{
                  color: active ? '#9cc4e6' : 'rgba(255,255,255,0.88)',
                  background: active ? 'rgba(255,255,255,0.10)' : 'transparent',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)' } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent' } }}
              >
                {active && <div className="absolute left-0 top-1/2 h-5 -translate-y-1/2 w-1 rounded-r-full" style={{ background: '#498fcb' }} />}
                <item.Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.5 : 2} />
                <span className={`font-sans text-sm flex-1 ${active ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
                {count > 0 && (
                  <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 font-mono text-[10px] font-bold text-white">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      ))}
    </>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col sticky top-0 h-screen w-64 shrink-0" style={{ background: 'var(--sidebar-bg)' }}>
        <div className="flex h-16 shrink-0 items-center px-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <Logo variant="light" />
        </div>
        <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none px-3 py-4 space-y-5">
          <NavList />
        </nav>
        <div className="shrink-0 p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3 rounded-xl p-2">
            <Avatar name={profile?.full_name} url={profile?.avatar_url} size="sm" />
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate font-sans text-sm font-semibold text-white">{profile?.full_name ?? 'Loading…'}</span>
              <span className="truncate font-sans text-[0.6rem] font-bold uppercase tracking-widest" style={{ color: '#9cc4e6' }}>
                {profile?.role ? roleLabel(profile.role) : '—'}
              </span>
            </div>
            <button onClick={handleLogout} disabled={loggingOut} className="shrink-0 rounded-lg p-2 text-white/50 transition-colors hover:text-red-400 hover:bg-red-500/10" title="Sign out">
              <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div onClick={onCloseMobile} className="lg:hidden fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm" style={{ animation: 'fadeIn 0.15s ease' }} />
          <aside className="lg:hidden fixed inset-y-0 left-0 z-[70] flex w-[82%] max-w-[320px] flex-col" style={{ background: 'var(--sidebar-bg)', animation: 'fadeIn 0.2s ease' }}>
            <div className="flex h-16 shrink-0 items-center justify-between px-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <Logo variant="light" />
              <button onClick={onCloseMobile} className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
              <NavList onNavigate={onCloseMobile} />
            </nav>
            <div className="shrink-0 p-3 pb-safe" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-red-300 hover:bg-red-500/10 transition-colors">
                <LogOut className="h-5 w-5 shrink-0" />
                <span className="font-sans text-sm font-bold">Sign Out</span>
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  )
}
