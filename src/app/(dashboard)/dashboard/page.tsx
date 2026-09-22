'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Clock, CheckCircle2, XCircle, Plus, BarChart3, Users, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/hooks/useProfile'
import { isAdmin, isDeptHead } from '@/lib/auth'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { timeAgo, formatDate } from '@/lib/utils'
import type { DashboardStats, Incident } from '@/types'
import Link from 'next/link'

export default function DashboardPage() {
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recent, setRecent] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profileLoading || !profile) return
    async function load() {
      const supabase = createClient()
      const admin = isAdmin(profile?.role)
      const head  = isDeptHead(profile?.role)

      // Build base query
      let q = supabase.from('incidents').select('id,status,priority,created_at,resolved_at,department_id')
      if (!admin && head && profile?.department_id) q = q.eq('department_id', profile.department_id)
      if (!admin && !head) q = q.or(`reported_by.eq.${profile?.id},assigned_to.eq.${profile?.id}`)

      const { data: allInc } = await q
      const rows = (allInc ?? []) as { status: string; priority: string; created_at: string; resolved_at?: string | null }[]
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      const s: DashboardStats = {
        total:       rows.length,
        open:        rows.filter(r => r.status === 'open').length,
        in_progress: rows.filter(r => r.status === 'in_progress').length,
        resolved:    rows.filter(r => r.status === 'resolved').length,
        closed:      rows.filter(r => r.status === 'closed').length,
        critical:    rows.filter(r => r.priority === 'critical').length,
        this_month:  rows.filter(r => new Date(r.created_at) >= monthStart).length,
      }
      setStats(s)

      // Recent incidents
      let rq = supabase
        .from('incidents')
        .select('id,incident_number,title,status,priority,created_at,department:departments(name),reporter:profiles!reported_by(full_name),assignee:profiles!assigned_to(full_name)')
        .order('created_at', { ascending: false })
        .limit(8)
      if (!admin && head && profile?.department_id) rq = rq.eq('department_id', profile.department_id)
      if (!admin && !head) rq = rq.or(`reported_by.eq.${profile?.id},assigned_to.eq.${profile?.id}`)

      const { data: recentData } = await rq
      setRecent((recentData as unknown as Incident[]) ?? [])
      setLoading(false)
    }
    load()
  }, [profileLoading, profile])

  if (profileLoading || loading) return <PageLoader />

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div>
      {/* Header */}
      <div className="cmd-header">
        <div>
          <p className="font-mono text-xs text-[var(--color-ink-3)] mb-1">{formatDate(new Date().toISOString(), 'EEEE, dd MMMM yyyy')}</p>
          <h1 className="cmd-hero-title">{greeting()}, {profile?.full_name?.split(' ')[0] ?? 'there'}</h1>
          <p className="cmd-hero-sub">
            {stats ? `${stats.open} open incident${stats.open !== 1 ? 's' : ''} · ${stats.critical > 0 ? `${stats.critical} critical` : 'none critical'} · ${stats.this_month} this month` : 'Loading company-wide incident overview'}
          </p>
        </div>
        <div className="cmd-actions">
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => router.push('/incidents/new')}>
            Report Incident
          </Button>
          {isDeptHead(profile?.role) && (
            <Button variant="secondary" icon={<BarChart3 className="h-4 w-4" />} onClick={() => router.push('/reports')}>
              Reports
            </Button>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      {stats && (
        <div className="kpi-strip">
          <div className="kpi-tile kpi-tile--featured" onClick={() => router.push('/incidents')}>
            <div className="kpi-tile-header">
              <span className="kpi-tile-label">Total Incidents</span>
              <div className="kpi-tile-icon" style={{ background: 'rgba(255,255,255,0.12)' }}>
                <AlertTriangle className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <div className="kpi-tile-value">{stats.total}</div>
            <div className="kpi-tile-meta">
              <span className="kpi-tile-label-sub">{stats.this_month} this month</span>
            </div>
          </div>

          <div className="kpi-tile" onClick={() => router.push('/incidents?status=open')}>
            <div className="kpi-tile-header">
              <span className="kpi-tile-label">Open</span>
              <div className="kpi-tile-icon" style={{ background: 'oklch(96% 0.04 25)' }}>
                <AlertTriangle className="h-3.5 w-3.5" style={{ color: 'oklch(52% 0.22 25)' }} strokeWidth={2.5} />
              </div>
            </div>
            <div className="kpi-tile-value">{stats.open}</div>
            <div className="kpi-tile-meta">
              <span className="kpi-tile-label-sub">{stats.critical} critical</span>
            </div>
          </div>

          <div className="kpi-tile" onClick={() => router.push('/incidents?status=in_progress')}>
            <div className="kpi-tile-header">
              <span className="kpi-tile-label">In Progress</span>
              <div className="kpi-tile-icon" style={{ background: 'oklch(96% 0.05 65)' }}>
                <Clock className="h-3.5 w-3.5" style={{ color: 'oklch(65% 0.17 65)' }} strokeWidth={2.5} />
              </div>
            </div>
            <div className="kpi-tile-value">{stats.in_progress}</div>
            <div className="kpi-tile-meta">
              <span className="kpi-tile-label-sub">Being resolved</span>
            </div>
          </div>

          <div className="kpi-tile" onClick={() => router.push('/incidents?status=resolved')}>
            <div className="kpi-tile-header">
              <span className="kpi-tile-label">Resolved</span>
              <div className="kpi-tile-icon" style={{ background: 'oklch(96% 0.04 155)' }}>
                <CheckCircle2 className="h-3.5 w-3.5" style={{ color: 'oklch(55% 0.15 155)' }} strokeWidth={2.5} />
              </div>
            </div>
            <div className="kpi-tile-value">{stats.resolved}</div>
            <div className="kpi-tile-meta">
              <span className="kpi-tile-label-sub">{stats.closed} closed</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="cmd-strip mb-6">
        {[
          { icon: <Plus className="h-4 w-4 text-white" />, iconBg: 'var(--color-brand)', label: 'Report Incident', sub: 'Log a new issue immediately', href: '/incidents/new' },
          { icon: <AlertTriangle className="h-4 w-4" style={{ color: 'oklch(52% 0.22 25)' }} />, iconBg: 'oklch(96% 0.04 25)', label: 'Open Incidents', sub: `${stats?.open ?? 0} requiring attention`, href: '/incidents?status=open' },
          ...(isDeptHead(profile?.role) ? [
            { icon: <BarChart3 className="h-4 w-4" style={{ color: 'oklch(48% 0.16 248)' }} />, iconBg: 'oklch(96% 0.04 248)', label: 'Reports', sub: 'Analytics & exports', href: '/reports' },
          ] : []),
          ...(isAdmin(profile?.role) ? [
            { icon: <Users className="h-4 w-4" style={{ color: 'oklch(34% 0.20 264)' }} />, iconBg: 'oklch(96% 0.03 264)', label: 'Manage Users', sub: 'Add or edit accounts', href: '/admin/users' },
            { icon: <Building2 className="h-4 w-4" style={{ color: 'oklch(48% 0.17 264)' }} />, iconBg: 'oklch(96% 0.03 264)', label: 'Departments', sub: 'Create & manage', href: '/admin/departments' },
          ] : []),
        ].map((item, i, arr) => (
          <div key={item.href} className="contents">
            <Link href={item.href} className="cmd-strip-action">
              <div className="cmd-strip-action-icon" style={{ background: item.iconBg }}>{item.icon}</div>
              <div className="cmd-strip-action-text">
                <span className="cmd-strip-action-label">{item.label}</span>
                <span className="cmd-strip-action-sub">{item.sub}</span>
              </div>
            </Link>
            {i < arr.length - 1 && <div className="cmd-strip-sep" />}
          </div>
        ))}
      </div>

      {/* Recent Incidents */}
      <div>
        <div className="dash-section-ruler"><span>Recent Incidents</span></div>
        <div className="panel">
          <div className="panel-header">
            <span className="font-display font-bold text-sm text-[var(--color-ink)]">Latest Activity</span>
            <Link href="/incidents" className="panel-view-all-btn">View all →</Link>
          </div>
          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-8 w-8 text-[var(--color-success)] mb-3" />
              <p className="font-sans text-sm font-semibold text-[var(--color-ink)]">No incidents yet</p>
              <p className="font-sans text-xs text-[var(--color-ink-3)] mt-1">Use the button above to report your first incident.</p>
            </div>
          ) : (
            <div className="px-2">
              {recent.map((inc, idx) => (
                <div
                  key={inc.id}
                  className="incident-feed-row"
                  onClick={() => router.push(`/incidents/${inc.id}`)}
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter') router.push(`/incidents/${inc.id}`) }}
                >
                  <span className="incident-feed-index">{String(idx + 1).padStart(2, '0')}</span>
                  <div className="flex-1 min-w-0 py-1">
                    <div className="flex items-center gap-2">
                      <span className="incident-feed-id">{inc.incident_number}</span>
                      <StatusBadge status={inc.status} />
                      <PriorityBadge priority={inc.priority} />
                    </div>
                    <div className="incident-feed-title mt-0.5">{inc.title}</div>
                    <div className="incident-feed-meta">
                      <span>{(inc.department as { name: string } | undefined)?.name ?? '—'}</span>
                      <span className="incident-feed-dot">·</span>
                      <span>{timeAgo(inc.created_at)}</span>
                      {inc.assignee && (
                        <>
                          <span className="incident-feed-dot">·</span>
                          <span>{(inc.assignee as { full_name: string }).full_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
