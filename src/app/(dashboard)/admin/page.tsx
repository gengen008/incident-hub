'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users2, Building2, Inbox, CheckCircle2, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/hooks/useProfile'
import { isAdmin } from '@/lib/auth'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import type { Department } from '@/types'

export default function AdminOverviewPage() {
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const [stats, setStats] = useState({ users: 0, depts: 0, open: 0, resolved: 0, total: 0 })
  const [deptRows, setDeptRows] = useState<{ dept: Department; open: number; total: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profileLoading) return
    if (!isAdmin(profile?.role)) { router.replace('/dashboard'); return }
    async function load() {
      const supabase = createClient()
      const [users, depts, open, resolved, total, allReqs] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('departments').select('*').order('name'),
        supabase.from('requests').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
        supabase.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'resolved'),
        supabase.from('requests').select('id', { count: 'exact', head: true }),
        supabase.from('requests').select('target_dept,status'),
      ])
      const deptList = (depts.data as Department[]) ?? []
      const reqs = (allReqs.data as { target_dept: string; status: string }[]) ?? []
      const rows = deptList.map(d => {
        const forDept = reqs.filter(r => r.target_dept === d.id)
        return { dept: d, total: forDept.length, open: forDept.filter(r => r.status === 'open' || r.status === 'in_progress').length }
      }).sort((a, b) => b.open - a.open)
      setStats({
        users: users.count ?? 0, depts: deptList.length,
        open: open.count ?? 0, resolved: resolved.count ?? 0, total: total.count ?? 0,
      })
      setDeptRows(rows)
      setLoading(false)
    }
    load()
  }, [profileLoading, profile, router])

  if (profileLoading || loading) return <PageLoader />

  const kpis = [
    { label: 'Total requests', value: stats.total, Icon: Inbox, color: 'var(--color-brand)' },
    { label: 'Open', value: stats.open, Icon: Inbox, color: 'oklch(52% 0.22 25)' },
    { label: 'Resolved', value: stats.resolved, Icon: CheckCircle2, color: 'oklch(55% 0.15 155)' },
    { label: 'Departments', value: stats.depts, Icon: Building2, color: 'var(--color-accent)' },
    { label: 'Users', value: stats.users, Icon: Users2, color: 'var(--color-brand-mid)' },
  ]

  return (
    <div>
      <PageHeader
        title="Admin Overview"
        subtitle="Company-wide activity across Labianca Desk"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => router.push('/admin/users')}>Users</Button>
            <Button variant="secondary" size="sm" onClick={() => router.push('/admin/departments')}>Departments</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {kpis.map(k => (
          <div key={k.label} className="kpi-card">
            <div className="kpi-tile-header">
              <span className="kpi-tile-label">{k.label}</span>
              <div className="kpi-tile-icon" style={{ background: 'var(--color-brand-subtle)' }}><k.Icon className="h-3.5 w-3.5" style={{ color: k.color }} strokeWidth={2.5} /></div>
            </div>
            <div className="kpi-tile-value" style={{ fontSize: '2rem' }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="dash-section-ruler"><span>Requests by department</span></div>
      <div className="panel">
        <div className="divide-y divide-[var(--border-default)]">
          {deptRows.map(({ dept, open, total }) => (
            <div key={dept.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-white font-mono font-bold text-xs" style={{ background: dept.color ?? 'var(--color-brand)' }}>{dept.code}</div>
              <div className="flex-1 min-w-0">
                <p className="font-sans text-sm font-semibold text-[var(--color-ink)] truncate">{dept.name}</p>
                <p className="font-sans text-xs text-[var(--color-ink-3)]">{total} total · {open} open</p>
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--color-ink-4)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
