'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts'
import { Download, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/hooks/useProfile'
import { isAdmin, isDeptHead } from '@/lib/auth'
import Button from '@/components/ui/Button'
import PageHeader from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import ErrorState from '@/components/ui/ErrorState'
import { exportToCSV, formatDate } from '@/lib/utils'
import type { Incident } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  open:        'oklch(52% 0.22 25)',
  in_progress: 'oklch(65% 0.17 65)',
  resolved:    'oklch(55% 0.15 155)',
  closed:      'oklch(45% 0.02 264)',
}

const PRIORITY_COLORS: Record<string, string> = {
  low:      'oklch(55% 0.15 155)',
  medium:   'oklch(62% 0.16 248)',
  high:     'oklch(65% 0.17 65)',
  critical: 'oklch(52% 0.22 25)',
}

export default function ReportsPage() {
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (profileLoading) return
    const canView = isAdmin(profile?.role) || isDeptHead(profile?.role)
    if (!canView) { router.replace('/dashboard'); return }
    load()
  }, [profileLoading, profile, router])

  async function load() {
    setLoading(true); setError(false)
    const supabase = createClient()
    const admin = isAdmin(profile?.role)

    let q = supabase
      .from('incidents')
      .select('id,incident_number,title,status,priority,category,created_at,resolved_at,department:departments(name,code)')
      .order('created_at', { ascending: false })

    if (!admin && profile?.department_id) q = q.eq('department_id', profile.department_id)

    const { data, error } = await q.limit(1000)
    if (error) { setError(true); setLoading(false); return }
    setIncidents((data as unknown as Incident[]) ?? [])
    setLoading(false)
  }

  function exportAll() {
    setExporting(true)
    const rows = incidents.map(i => ({
      'INC Number': i.incident_number,
      'Title':      i.title,
      'Status':     i.status,
      'Priority':   i.priority,
      'Category':   i.category,
      'Department': (i.department as { name: string } | undefined)?.name ?? '',
      'Created':    formatDate(i.created_at),
      'Resolved':   i.resolved_at ? formatDate(i.resolved_at) : '',
    }))
    exportToCSV(rows as Record<string, unknown>[], 'incident-report')
    setExporting(false)
  }

  if (profileLoading || loading) return <PageLoader />
  if (error) return <ErrorState title="Could not load report data" onRetry={load} />

  // Compute chart data
  const statusCounts = Object.entries(
    incidents.reduce<Record<string, number>>((acc, i) => { acc[i.status] = (acc[i.status] ?? 0) + 1; return acc }, {})
  ).map(([name, value]) => ({ name: name.replace('_', ' '), value, fill: STATUS_COLORS[name] }))

  const priorityCounts = Object.entries(
    incidents.reduce<Record<string, number>>((acc, i) => { acc[i.priority] = (acc[i.priority] ?? 0) + 1; return acc }, {})
  ).map(([name, value]) => ({ name, value, fill: PRIORITY_COLORS[name] }))

  const categoryCounts = Object.entries(
    incidents.reduce<Record<string, number>>((acc, i) => { acc[i.category] = (acc[i.category] ?? 0) + 1; return acc }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }))

  // Monthly trend (last 6 months)
  const now = new Date()
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const label = d.toLocaleString('default', { month: 'short' })
    const count = incidents.filter(inc => {
      const created = new Date(inc.created_at)
      return created.getFullYear() === d.getFullYear() && created.getMonth() === d.getMonth()
    }).length
    return { month: label, incidents: count }
  })

  const totalResolved = incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length
  const resolutionRate = incidents.length ? Math.round((totalResolved / incidents.length) * 100) : 0

  const avgResolutionMs = incidents
    .filter(i => i.resolved_at)
    .reduce((acc, i) => acc + (new Date(i.resolved_at!).getTime() - new Date(i.created_at).getTime()), 0)
  const avgResolutionDays = incidents.filter(i => i.resolved_at).length
    ? Math.round(avgResolutionMs / incidents.filter(i => i.resolved_at).length / 86400000)
    : null

  const kpis = [
    { label: 'Total Incidents', value: incidents.length, color: 'oklch(48% 0.17 264)' },
    { label: 'Resolution Rate', value: `${resolutionRate}%`, color: 'oklch(55% 0.15 155)' },
    { label: 'Avg Resolution', value: avgResolutionDays !== null ? `${avgResolutionDays}d` : '—', color: 'oklch(62% 0.16 248)' },
    { label: 'Open Now', value: incidents.filter(i => i.status === 'open').length, color: 'oklch(52% 0.22 25)' },
  ]

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Incident analytics, trends, and exportable data"
        back={isAdmin(profile?.role)}
        action={
          <Button
            variant="secondary"
            icon={<Download className="h-3.5 w-3.5" />}
            loading={exporting}
            onClick={exportAll}
          >
            Export CSV
          </Button>
        }
      />

      {/* KPI strip */}
      <div className="kpi-strip mb-6">
        {kpis.map(k => (
          <div key={k.label} className="kpi-card">
            <div className="font-sans text-xs text-[var(--color-ink-3)] font-medium uppercase tracking-wider mb-2">{k.label}</div>
            <div className="font-display text-3xl font-extrabold tracking-tight" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly trend */}
        <div className="panel">
          <div className="panel-header mb-4">
            <span className="font-display font-bold text-sm text-[var(--color-ink)]">Monthly Incident Trend</span>
          </div>
          <div className="px-2 pb-2">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--color-ink-3)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--color-ink-3)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontFamily: 'var(--font-sans)', fontSize: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'white' }}
                  cursor={{ stroke: 'var(--color-brand)', strokeWidth: 1, strokeDasharray: '3 3' }}
                />
                <Line type="monotone" dataKey="incidents" stroke="oklch(48% 0.17 264)" strokeWidth={2.5} dot={{ fill: 'oklch(48% 0.17 264)', r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority distribution */}
        <div className="panel">
          <div className="panel-header mb-4">
            <span className="font-display font-bold text-sm text-[var(--color-ink)]">Priority Distribution</span>
          </div>
          <div className="flex items-center gap-4 px-4 pb-4">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={priorityCounts} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {priorityCounts.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ fontFamily: 'var(--font-sans)', fontSize: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {priorityCounts.map(p => (
                <div key={p.name} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: p.fill }} />
                  <span className="font-sans text-xs text-[var(--color-ink-2)] capitalize">{p.name}</span>
                  <span className="font-mono text-xs text-[var(--color-ink-3)] ml-auto">{p.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Status breakdown */}
        <div className="panel">
          <div className="panel-header mb-4">
            <span className="font-display font-bold text-sm text-[var(--color-ink)]">Status Breakdown</span>
          </div>
          <div className="px-2 pb-2">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={statusCounts} barSize={28}>
                <XAxis dataKey="name" tick={{ fontFamily: 'var(--font-sans)', fontSize: 11, fill: 'var(--color-ink-3)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--color-ink-3)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontFamily: 'var(--font-sans)', fontSize: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'white' }}
                  cursor={{ fill: 'var(--surface-page)' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {statusCounts.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top categories */}
        <div className="panel">
          <div className="panel-header mb-4">
            <span className="font-display font-bold text-sm text-[var(--color-ink)]">Top Categories</span>
          </div>
          <div className="px-2 pb-2">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={categoryCounts} layout="vertical" barSize={14}>
                <XAxis type="number" tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--color-ink-3)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontFamily: 'var(--font-sans)', fontSize: 11, fill: 'var(--color-ink-2)' }} axisLine={false} tickLine={false} width={100} />
                <Tooltip
                  contentStyle={{ fontFamily: 'var(--font-sans)', fontSize: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'white' }}
                  cursor={{ fill: 'var(--surface-page)' }}
                />
                <Bar dataKey="value" fill="oklch(48% 0.17 264)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
