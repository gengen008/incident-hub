'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Building2, ShieldAlert, TrendingUp, ArrowRight, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/hooks/useProfile'
import { isAdmin } from '@/lib/auth'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import ErrorState from '@/components/ui/ErrorState'
import PageHeader from '@/components/ui/PageHeader'
import { formatDate, timeAgo } from '@/lib/utils'
import type { Incident } from '@/types'

interface AdminStats {
  totalIncidents: number
  openIncidents: number
  inProgressIncidents: number
  resolvedThisMonth: number
  totalUsers: number
  totalDepartments: number
  criticalOpen: number
}

export default function AdminPage() {
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [recent, setRecent] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (profileLoading) return
    if (!isAdmin(profile?.role)) { router.replace('/dashboard'); return }

    async function load() {
      const supabase = createClient()
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const [
        { count: total },
        { count: open },
        { count: inProg },
        { count: resolved },
        { count: users },
        { count: depts },
        { count: critical },
        { data: recentIncs },
      ] = await Promise.all([
        supabase.from('incidents').select('*', { count: 'exact', head: true }),
        supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
        supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'resolved').gte('resolved_at', monthStart),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('departments').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('priority', 'critical').in('status', ['open', 'in_progress']),
        supabase.from('incidents')
          .select('id,incident_number,title,status,priority,created_at,department:departments(name),assignee:profiles!assigned_to(full_name)')
          .order('created_at', { ascending: false })
          .limit(8),
      ])

      setStats({
        totalIncidents:     total ?? 0,
        openIncidents:      open ?? 0,
        inProgressIncidents:inProg ?? 0,
        resolvedThisMonth:  resolved ?? 0,
        totalUsers:         users ?? 0,
        totalDepartments:   depts ?? 0,
        criticalOpen:       critical ?? 0,
      })
      setRecent((recentIncs as unknown as Incident[]) ?? [])
      setLoading(false)
    }
    load().catch(() => { setError(true); setLoading(false) })
  }, [profileLoading, profile, router])

  if (profileLoading || loading) return <PageLoader />
  if (error) return <ErrorState title="Could not load admin data" onRetry={() => window.location.reload()} />

  const kpis = [
    { label: 'Total Incidents',     value: stats?.totalIncidents ?? 0,     icon: <ShieldAlert className="h-5 w-5" />, color: 'oklch(48% 0.17 264)', sub: 'all time' },
    { label: 'Open',                value: stats?.openIncidents ?? 0,       icon: <TrendingUp className="h-5 w-5" />,  color: 'oklch(52% 0.22 25)',  sub: 'need attention' },
    { label: 'In Progress',         value: stats?.inProgressIncidents ?? 0, icon: <Clock className="h-5 w-5" />,       color: 'oklch(65% 0.17 65)',  sub: 'being worked' },
    { label: 'Resolved This Month', value: stats?.resolvedThisMonth ?? 0,   icon: <TrendingUp className="h-5 w-5" />,  color: 'oklch(55% 0.15 155)', sub: 'closed out' },
    { label: 'Active Users',        value: stats?.totalUsers ?? 0,          icon: <Users className="h-5 w-5" />,       color: 'oklch(62% 0.16 248)', sub: 'registered' },
    { label: 'Departments',         value: stats?.totalDepartments ?? 0,    icon: <Building2 className="h-5 w-5" />,   color: 'oklch(62% 0.16 248)', sub: 'active' },
  ]

  return (
    <div>
      <PageHeader
        title="Administration"
        subtitle="Company-wide incident overview and system management"
      />

      {stats?.criticalOpen ? (
        <div className="mb-6 flex items-center gap-3 rounded-[var(--radius-md)] border border-[oklch(52%_0.22_25)] bg-[oklch(96%_0.04_25)] px-4 py-3">
          <ShieldAlert className="h-4 w-4 text-[oklch(52%_0.22_25)] shrink-0" />
          <span className="font-sans text-sm font-semibold text-[oklch(40%_0.22_25)]">
            {stats.criticalOpen} critical incident{stats.criticalOpen > 1 ? 's' : ''} require immediate attention
          </span>
          <button
            onClick={() => router.push('/incidents?priority=critical&status=open')}
            className="ml-auto flex items-center gap-1 font-sans text-xs text-[oklch(52%_0.22_25)] hover:underline"
          >
            View <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      ) : null}

      {/* KPI strip */}
      <div className="kpi-strip mb-6">
        {kpis.map(k => (
          <div key={k.label} className="kpi-card">
            <div className="flex items-center justify-between mb-3">
              <span className="font-sans text-xs text-[var(--color-ink-3)] font-medium uppercase tracking-wider">{k.label}</span>
              <span style={{ color: k.color }}>{k.icon}</span>
            </div>
            <div className="font-display text-3xl font-extrabold tracking-tight" style={{ color: k.color }}>{k.value}</div>
            <div className="font-sans text-xs text-[var(--color-ink-4)] mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Admin sections */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        {[
          { href: '/admin/departments', icon: <Building2 className="h-6 w-6" />, title: 'Departments', desc: 'Manage company departments, assign heads, and organize teams' },
          { href: '/admin/users',       icon: <Users className="h-6 w-6" />,       title: 'Users',       desc: 'Onboard, deactivate, and manage user roles and access' },
          { href: '/admin/reports',     icon: <TrendingUp className="h-6 w-6" />,   title: 'Reports',     desc: 'Company-wide analytics, charts, and export tools' },
        ].map(item => (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className="card text-left hover:shadow-elevated transition-shadow group"
          >
            <div
              className="mb-4 flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] text-white"
              style={{ background: 'var(--color-brand)' }}
            >
              {item.icon}
            </div>
            <h3 className="font-display font-bold text-[var(--color-ink)] mb-1 group-hover:text-[var(--color-brand)] transition-colors">{item.title}</h3>
            <p className="font-sans text-xs text-[var(--color-ink-3)]">{item.desc}</p>
          </button>
        ))}
      </div>

      {/* Recent incidents */}
      <div className="panel">
        <div className="panel-header">
          <span className="font-display font-bold text-sm text-[var(--color-ink)]">Recent Incidents</span>
          <button
            onClick={() => router.push('/incidents')}
            className="flex items-center gap-1 font-sans text-xs text-[var(--color-brand)] hover:underline"
          >
            View all <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <div className="divide-y divide-[var(--border-default)]">
          {recent.map(inc => (
            <button
              key={inc.id}
              onClick={() => router.push(`/incidents/${inc.id}`)}
              className="incident-feed-row w-full text-left"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-mono text-xs font-bold text-[var(--color-brand)]">{inc.incident_number}</span>
                    <StatusBadge status={inc.status} />
                    <PriorityBadge priority={inc.priority} />
                  </div>
                  <p className="font-sans text-sm text-[var(--color-ink)] truncate">{inc.title}</p>
                  <p className="font-sans text-xs text-[var(--color-ink-3)] mt-0.5">
                    {(inc.department as { name: string } | undefined)?.name ?? ''} ·{' '}
                    {(inc.assignee as { full_name: string } | undefined)?.full_name ?? 'Unassigned'}
                  </p>
                </div>
              </div>
              <span className="font-mono text-xs text-[var(--color-ink-4)] shrink-0">{timeAgo(inc.created_at)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
