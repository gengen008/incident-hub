'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, Check, Settings, LogOut, Menu, ChevronLeft } from 'lucide-react'
import { timeAgo, roleLabel } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Notification, Profile } from '@/types'
import Logo from '@/components/ui/Logo'

const BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: 'Dashboard', requests: 'Requests', new: 'New Request',
  chat: 'Messages', directory: 'Directory', admin: 'Admin',
  departments: 'Departments', users: 'Users', notifications: 'Notifications',
  settings: 'Settings',
}

const NOTIF_COLORS: Record<string, string> = {
  request_assigned: 'bg-blue-500',
  status_update:    'bg-amber-500',
  request_comment:  'bg-violet-500',
  message:          'bg-emerald-500',
}

interface TopbarProps {
  notifications?: Notification[]
  markRead?: (id: string) => Promise<void>
  markAllRead?: () => Promise<void>
  profile?: Profile | null
  onOpenMenu?: () => void
}

export default function Topbar({ notifications = [], markRead, markAllRead, profile, onOpenMenu }: TopbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const segments = pathname.split('/').filter(Boolean)
  const unread = notifications.filter(n => !n.is_read).length
  const [bellOpen, setBellOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const bellRef = useRef<HTMLButtonElement>(null)
  const bellPanelRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!bellOpen && !profileOpen) return
    function onDown(e: MouseEvent) {
      if (bellPanelRef.current?.contains(e.target as Node) || bellRef.current?.contains(e.target as Node)) return
      if (profileRef.current?.contains(e.target as Node)) return
      setBellOpen(false); setProfileOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [bellOpen, profileOpen])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function handleNotifClick(n: Notification) {
    if (!n.is_read) markRead?.(n.id)
    if (n.link) { router.push(n.link); setBellOpen(false) }
  }

  const isSub = segments.length >= 2

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/90 px-3 sm:px-6 backdrop-blur-md">
      {/* Left */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Mobile: hamburger + logo */}
        <button onClick={onOpenMenu} className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <div className="lg:hidden min-w-0"><Logo showText={false} size={30} /></div>

        {/* Desktop: breadcrumbs / back */}
        <div className="hidden lg:flex items-center gap-2 min-w-0">
          {isSub && (
            <button onClick={() => router.back()} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50" aria-label="Back">
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <nav className="flex items-center gap-1.5 overflow-hidden min-w-0">
            <Link href="/dashboard" className="shrink-0 font-sans text-sm font-medium text-slate-500 hover:text-slate-800">Labianca Desk</Link>
            {segments.map((seg, i) => {
              const isLast = i === segments.length - 1
              const label = BREADCRUMB_LABELS[seg] ?? seg.replace(/-/g, ' ')
              const href = '/' + segments.slice(0, i + 1).join('/')
              return (
                <span key={seg} className="flex items-center gap-1.5 min-w-0">
                  <span className="text-slate-300">/</span>
                  {isLast ? (
                    <span className="truncate font-sans text-sm font-semibold text-slate-900 capitalize">
                      {/^[0-9a-f-]{36}$/.test(seg) ? 'Detail' : label}
                    </span>
                  ) : (
                    <Link href={href} className="whitespace-nowrap font-sans text-sm text-slate-500 hover:text-slate-800 capitalize">{label}</Link>
                  )}
                </span>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Right */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 pl-2">
        <div className="relative">
          <button ref={bellRef} onClick={() => { setBellOpen(o => !o); setProfileOpen(false) }}
            className={`relative flex h-9 w-9 items-center justify-center rounded-lg border transition-all ${bellOpen ? 'border-slate-300 bg-slate-100 text-slate-900' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
            <Bell className="h-[18px] w-[18px]" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 font-mono text-[9px] font-bold text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {bellOpen && (
            <div ref={bellPanelRef} className="absolute right-0 mt-2 flex w-[min(360px,calc(100vw-1.5rem))] origin-top-right flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-elevated)]" style={{ animation: 'notif-drop 0.18s ease' }}>
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-4 py-3">
                <span className="font-sans text-sm font-bold text-slate-900">Notifications</span>
                {unread > 0 && <button onClick={() => markAllRead?.()} className="font-sans text-xs font-semibold text-[var(--color-brand)] hover:underline">Mark all read</button>}
              </div>
              <div className="max-h-[380px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                    <Check className="mb-2 h-7 w-7 text-emerald-400" />
                    <p className="font-sans text-sm font-semibold text-slate-700">All caught up</p>
                  </div>
                ) : notifications.slice(0, 20).map(n => (
                  <div key={n.id} onClick={() => handleNotifClick(n)}
                    className={`flex items-start gap-3 border-b border-slate-100 p-4 ${n.link ? 'cursor-pointer' : ''} ${n.is_read ? 'hover:bg-slate-50' : 'bg-blue-50/40 hover:bg-blue-50/70'}`}>
                    <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.is_read ? 'bg-slate-300' : (NOTIF_COLORS[n.type] ?? 'bg-slate-400')}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`font-sans text-sm leading-snug ${n.is_read ? 'font-medium text-slate-600' : 'font-bold text-slate-900'}`}>{n.title}</p>
                      {n.body && <p className="mt-0.5 line-clamp-2 font-sans text-xs text-slate-500">{n.body}</p>}
                      <p className="mt-1 font-mono text-[10px] text-slate-400">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/notifications" onClick={() => setBellOpen(false)} className="border-t border-slate-100 px-4 py-2.5 font-sans text-xs font-semibold text-[var(--color-brand)] hover:underline">
                View all →
              </Link>
            </div>
          )}
        </div>

        <div ref={profileRef} className="relative">
          <button onClick={() => { setProfileOpen(o => !o); setBellOpen(false) }}
            className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all ${profileOpen ? 'border-[var(--color-brand)]' : 'border-slate-200 hover:border-slate-300'}`}
            style={{ background: profileOpen ? 'var(--color-brand)' : 'var(--sidebar-bg)' }}>
            <span className="font-mono text-[11px] font-bold tracking-wider text-white">
              {profile?.full_name ? profile.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?'}
            </span>
          </button>
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-elevated)]" style={{ animation: 'notif-drop 0.18s ease' }}>
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                <p className="truncate font-sans text-sm font-bold text-slate-900">{profile?.full_name ?? 'User'}</p>
                <p className="truncate font-mono text-xs font-semibold text-slate-400 mt-0.5">{profile?.role ? roleLabel(profile.role) : ''}</p>
              </div>
              <div className="p-1">
                <button onClick={() => { setProfileOpen(false); router.push('/settings') }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-sans text-sm text-slate-700 hover:bg-slate-100">
                  <Settings className="h-4 w-4 text-slate-400" /> Settings
                </button>
                <div className="my-1 h-px bg-slate-100" />
                <button onClick={handleLogout} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-sans text-sm text-red-600 hover:bg-red-50">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
