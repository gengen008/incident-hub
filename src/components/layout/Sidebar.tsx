'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, AlertTriangle, Plus, Building2, Users,
  Bell, Settings, LogOut, ChevronRight, Menu, X, BarChart3,
  FileText, ShieldCheck,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { isAdmin, isDeptHead } from '@/lib/auth'
import Avatar from '@/components/ui/Avatar'

function buildNavGroups(role?: string | null) {
  const admin = isAdmin(role as Profile['role'] | null)
  const head = isDeptHead(role as Profile['role'] | null)
  return [
    {
      label: 'Workspace',
      items: [
        { href: '/dashboard', Icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/notifications',  Icon: Bell,           label: 'Notifications' },
      ],
    },
    {
      label: 'Incidents',
      items: [
        { href: '/incidents',     Icon: AlertTriangle, label: 'All Incidents' },
        { href: '/incidents/new', Icon: Plus,          label: 'Report Incident' },
      ],
    },
    ...(head ? [{
      label: 'Reports',
      items: [
        { href: '/reports', Icon: BarChart3, label: 'Analytics & Reports' },
      ],
    }] : []),
    ...(admin ? [{
      label: 'Administration',
      items: [
        { href: '/admin/departments', Icon: Building2,  label: 'Departments' },
        { href: '/admin/users',       Icon: Users,      label: 'Users' },
        { href: '/admin/reports',     Icon: FileText,   label: 'Reports' },
        { href: '/admin',             Icon: ShieldCheck, label: 'Admin Overview' },
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

const MOBILE_SHORTCUTS = [
  { href: '/dashboard',    Icon: LayoutDashboard, label: 'Home' },
  { href: '/incidents',    Icon: AlertTriangle,   label: 'Incidents' },
  { href: '/incidents/new',Icon: Plus,            label: 'Report' },
  { href: '/notifications',Icon: Bell,            label: 'Alerts' },
]

interface SidebarProps {
  profile?: Profile | null
  notificationCount?: number
}

export default function Sidebar({ profile, notificationCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const navGroups = buildNavGroups(profile?.role)

  useEffect(() => { setMobileOpen(false) }, [pathname])
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col sticky top-0 h-screen shrink-0 transition-all duration-300 ease-in-out ${collapsed ? 'w-[72px]' : 'w-64'}`}
        style={{ background: 'oklch(16% 0.06 264)' }}
      >
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-transparent opacity-75" />

        {/* Header */}
        <div className="flex h-16 shrink-0 items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white font-display font-black text-sm"
              style={{ background: 'oklch(34% 0.20 264)' }}
            >
              IH
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-display text-base font-extrabold leading-none tracking-tight text-white">IncidentHub</span>
                <span className="mt-0.5 font-sans text-[0.6rem] font-bold uppercase tracking-widest text-blue-300/80">Incident Management</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`flex shrink-0 items-center justify-center rounded-md p-1.5 transition-colors hover:bg-white/10 text-white/60 ${collapsed ? 'mx-auto' : ''}`}
          >
            <ChevronRight className={`h-4 w-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} strokeWidth={3} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none px-3 py-4 space-y-6">
          {navGroups.map(group => (
            <div key={group.label} className="space-y-0.5">
              {!collapsed && (
                <div className="px-3 pb-2 font-sans text-[0.6rem] font-bold uppercase tracking-widest text-white/40">
                  {group.label}
                </div>
              )}
              {group.items.map(item => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`relative flex items-center rounded-lg px-3 py-2.5 transition-all ${collapsed ? 'justify-center' : 'gap-3'}`}
                    style={{
                      color: active ? 'rgb(96,165,250)' : 'rgba(255,255,255,0.88)',
                      background: active ? 'rgba(255,255,255,0.10)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#fff' } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.88)' } }}
                  >
                    {active && !collapsed && (
                      <div className="absolute left-0 top-1/2 h-5 -translate-y-1/2 w-1 rounded-r-full bg-blue-400" />
                    )}
                    <item.Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.5 : 2} />
                    {!collapsed && (
                      <span className={`font-sans text-sm flex-1 ${active ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
                    )}
                    {item.href === '/notifications' && notificationCount > 0 && !collapsed && (
                      <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 font-mono text-[10px] font-bold text-white">
                        {notificationCount > 9 ? '9+' : notificationCount}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* User Footer */}
        <div className="shrink-0 p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className={`flex items-center rounded-xl p-2 ${collapsed ? 'justify-center' : 'gap-3'}`}>
            <Avatar name={profile?.full_name} url={profile?.avatar_url} size="sm" />
            {!collapsed && (
              <>
                <div className="flex flex-1 flex-col overflow-hidden">
                  <span className="truncate font-sans text-sm font-semibold text-white">{profile?.full_name ?? 'Loading…'}</span>
                  <span className="truncate font-sans text-[0.6rem] font-bold uppercase tracking-widest text-blue-300/70">
                    {profile?.role?.replace(/_/g, ' ') ?? '—'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="shrink-0 rounded-lg p-2 text-white/50 transition-colors hover:text-red-400 hover:bg-red-500/10"
                  title="Sign out"
                >
                  <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-slate-200 bg-white/95 px-2 pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur-md">
        {MOBILE_SHORTCUTS.map(item => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${active ? 'text-[var(--color-brand)]' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <div className="relative flex items-center justify-center">
                <item.Icon className="h-6 w-6" strokeWidth={active ? 2.5 : 2} />
                {item.href === '/notifications' && notificationCount > 0 && (
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
                )}
              </div>
              <span className={`font-sans text-[10px] ${active ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
            </Link>
          )
        })}
        <button
          onClick={() => setMobileOpen(v => !v)}
          className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${mobileOpen ? 'text-[var(--color-brand)]' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Menu className="h-6 w-6" strokeWidth={mobileOpen ? 2.5 : 2} />
          <span className={`font-sans text-[10px] ${mobileOpen ? 'font-bold' : 'font-medium'}`}>More</span>
        </button>
      </nav>

      {/* Mobile Full Drawer */}
      {mobileOpen && (
        <>
          <div onClick={() => setMobileOpen(false)} className="lg:hidden fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm" style={{ animation: 'fadeIn 0.15s ease' }} />
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[70] flex max-h-[85vh] flex-col rounded-t-2xl bg-white shadow-2xl" style={{ animation: 'drawer-in-bottom 0.2s ease' }}>
            <div className="flex w-full items-center justify-center pt-3 pb-1">
              <div className="h-1 w-12 rounded-full bg-slate-200" />
            </div>
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 pb-4 pt-2">
              <div className="flex items-center gap-3">
                <Avatar name={profile?.full_name} size="md" />
                <div>
                  <p className="font-sans text-sm font-bold text-slate-900">{profile?.full_name ?? '—'}</p>
                  <p className="font-sans text-[0.62rem] font-bold uppercase tracking-widest text-slate-400">{profile?.role?.replace(/_/g, ' ') ?? '—'}</p>
                </div>
              </div>
              <button onClick={() => setMobileOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
              {navGroups.map(group => (
                group.items.length > 0 && (
                  <div key={group.label} className="space-y-0.5">
                    <div className="px-4 pb-1.5 font-sans text-[0.6rem] font-bold uppercase tracking-widest text-slate-400">{group.label}</div>
                    {group.items.map(item => {
                      const active = isActive(item.href)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors ${active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                          <item.Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.5 : 2} />
                          <span className={`font-sans text-sm flex-1 ${active ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                          {item.href === '/notifications' && notificationCount > 0 && (
                            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 font-mono text-[10px] font-bold text-white">
                              {notificationCount > 9 ? '9+' : notificationCount}
                            </span>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                )
              ))}
              <div className="border-t border-slate-100 pt-2 pb-safe">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  <span className="font-sans text-sm font-bold">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
