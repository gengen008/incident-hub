'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Inbox, Send, CheckCircle2, Clock, Plus, MessageSquare, Users2, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/hooks/useProfile'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { timeAgo, formatDate } from '@/lib/utils'
import type { Request } from '@/types'

export default function DashboardPage() {
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const [stats, setStats] = useState({ raised: 0, assigned: 0, deptOpen: 0, resolvedMonth: 0 })
  const [needsMe, setNeedsMe] = useState<Request[]>([])
  const [recent, setRecent] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profileLoading || !profile) return
    async function load() {
      const supabase = createClient()
      const me = profile!.id
      const dept = profile!.department_id
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

      const sel = 'id,request_number,title,status,priority,category,created_at,updated_at,' +
        'raiser:profiles!raised_by(full_name),assignee:profiles!assigned_to(full_name),' +
        'target_department:departments!target_dept(name,code)'

      const [raised, assigned, deptOpen, resolvedMonth, needs, recentRes] = await Promise.all([
        supabase.from('requests').select('id', { count: 'exact', head: true }).eq('raised_by', me),
        supabase.from('requests').select('id', { count: 'exact', head: true }).eq('assigned_to', me).in('status', ['open', 'in_progress', 'on_hold']),
        dept ? supabase.from('requests').select('id', { count: 'exact', head: true }).eq('target_dept', dept).in('status', ['open', 'in_progress']) : Promise.resolve({ count: 0 }),
        supabase.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'resolved').gte('resolved_at', monthStart),
        supabase.from('requests').select(sel).eq('assigned_to', me).in('status', ['open', 'in_progress']).order('created_at', { ascending: false }).limit(5),
        supabase.from('requests').select(sel).order('created_at', { ascending: false }).limit(8),
      ])

      setStats({
        raised: raised.count ?? 0,
        assigned: assigned.count ?? 0,
        deptOpen: (deptOpen as { count: number }).count ?? 0,
        resolvedMonth: resolvedMonth.count ?? 0,
      })
      setNeedsMe((needs.data as unknown as Request[]) ?? [])
      setRecent((recentRes.data as unknown as Request[]) ?? [])
      setLoading(false)
    }
    load()
  }, [profileLoading, profile])

  if (profileLoading || loading) return <PageLoader />

  const greeting = () => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  return (
    <div>
      {/* Header */}
      <div className="cmd-header">
        <div>
          <p className="font-mono text-xs text-[var(--color-ink-3)] mb-1">{formatDate(new Date().toISOString(), 'EEEE, dd MMMM yyyy')}</p>
          <h1 className="cmd-hero-title">{greeting()}, {firstName}</h1>
          <p className="cmd-hero-sub">
            {stats.assigned > 0 ? `${stats.assigned} request${stats.assigned !== 1 ? 's' : ''} assigned to you` : 'Nothing assigned to you right now'}
            {profile?.department && ` · ${profile.department.name}`}
          </p>
        </div>
        <div className="cmd-actions">
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => router.push('/requests/new')}>
            New Request
          </Button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="kpi-strip">
        <button className="kpi-tile kpi-tile--featured text-left" onClick={() => router.push('/requests?view=assigned')} style={{ cursor: 'pointer' }}>
          <div className="kpi-tile-header">
            <span className="kpi-tile-label">Assigned to me</span>
            <div className="kpi-tile-icon" style={{ background: 'rgba(255,255,255,0.14)' }}><Inbox className="h-3.5 w-3.5 text-white" strokeWidth={2.5} /></div>
          </div>
          <div className="kpi-tile-value">{stats.assigned}</div>
          <div className="kpi-tile-meta"><span className="kpi-tile-label-sub">Open &amp; in progress</span></div>
        </button>

        <button className="kpi-tile text-left" onClick={() => router.push('/requests?view=raised')}>
          <div className="kpi-tile-header">
            <span className="kpi-tile-label">Raised by me</span>
            <div className="kpi-tile-icon" style={{ background: 'var(--color-brand-subtle)' }}><Send className="h-3.5 w-3.5" style={{ color: 'var(--color-brand)' }} strokeWidth={2.5} /></div>
          </div>
          <div className="kpi-tile-value">{stats.raised}</div>
          <div className="kpi-tile-meta"><span className="kpi-tile-label-sub">Total submitted</span></div>
        </button>

        <button className="kpi-tile text-left" onClick={() => router.push('/requests?view=dept')}>
          <div className="kpi-tile-header">
            <span className="kpi-tile-label">My dept queue</span>
            <div className="kpi-tile-icon" style={{ background: 'oklch(96% 0.05 65)' }}><Clock className="h-3.5 w-3.5" style={{ color: 'oklch(65% 0.17 65)' }} strokeWidth={2.5} /></div>
          </div>
          <div className="kpi-tile-value">{stats.deptOpen}</div>
          <div className="kpi-tile-meta"><span className="kpi-tile-label-sub">Awaiting action</span></div>
        </button>

        <button className="kpi-tile text-left" onClick={() => router.push('/requests?status=resolved')}>
          <div className="kpi-tile-header">
            <span className="kpi-tile-label">Resolved</span>
            <div className="kpi-tile-icon" style={{ background: 'oklch(96% 0.04 155)' }}><CheckCircle2 className="h-3.5 w-3.5" style={{ color: 'oklch(55% 0.15 155)' }} strokeWidth={2.5} /></div>
          </div>
          <div className="kpi-tile-value">{stats.resolvedMonth}</div>
          <div className="kpi-tile-meta"><span className="kpi-tile-label-sub">This month</span></div>
        </button>
      </div>

      {/* Quick actions */}
      <div className="cmd-strip mb-6">
        {[
          { icon: <Plus className="h-4 w-4 text-white" />, bg: 'var(--color-brand)', label: 'New Request', sub: 'Log a problem or ask', href: '/requests/new' },
          { icon: <MessageSquare className="h-4 w-4" style={{ color: 'var(--color-brand)' }} />, bg: 'var(--color-brand-subtle)', label: 'Messages', sub: 'Talk to a colleague', href: '/chat' },
          { icon: <Users2 className="h-4 w-4" style={{ color: 'var(--color-brand)' }} />, bg: 'var(--color-brand-subtle)', label: 'Directory', sub: 'Find people & teams', href: '/directory' },
        ].map((item, i, arr) => (
          <div key={item.href} className="contents">
            <Link href={item.href} className="cmd-strip-action">
              <div className="cmd-strip-action-icon" style={{ background: item.bg }}>{item.icon}</div>
              <div className="cmd-strip-action-text">
                <span className="cmd-strip-action-label">{item.label}</span>
                <span className="cmd-strip-action-sub">{item.sub}</span>
              </div>
            </Link>
            {i < arr.length - 1 && <div className="cmd-strip-sep" />}
          </div>
        ))}
      </div>

      {/* Needs me */}
      {needsMe.length > 0 && (
        <div className="mb-6">
          <div className="dash-section-ruler"><span>Needs your action</span></div>
          <div className="panel">
            <div className="px-2">
              {needsMe.map((r, idx) => <RequestRow key={r.id} r={r} idx={idx} onClick={() => router.push(`/requests/${r.id}`)} />)}
            </div>
          </div>
        </div>
      )}

      {/* Recent */}
      <div>
        <div className="dash-section-ruler"><span>Recent across the company</span></div>
        <div className="panel">
          <div className="panel-header">
            <span className="font-display font-bold text-sm text-[var(--color-ink)]">Latest requests</span>
            <Link href="/requests" className="panel-view-all-btn">View all <ArrowRight className="h-3 w-3" /></Link>
          </div>
          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Inbox className="h-8 w-8 text-[var(--color-ink-4)] mb-3" />
              <p className="font-sans text-sm font-semibold text-[var(--color-ink)]">No requests yet</p>
              <p className="font-sans text-xs text-[var(--color-ink-3)] mt-1">Create the first one with the button above.</p>
            </div>
          ) : (
            <div className="px-2">
              {recent.map((r, idx) => <RequestRow key={r.id} r={r} idx={idx} onClick={() => router.push(`/requests/${r.id}`)} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RequestRow({ r, idx, onClick }: { r: Request; idx: number; onClick: () => void }) {
  return (
    <div className="incident-feed-row" onClick={onClick} tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') onClick() }}>
      <span className="incident-feed-index">{String(idx + 1).padStart(2, '0')}</span>
      <div className="flex-1 min-w-0 py-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="incident-feed-id">{r.request_number}</span>
          <StatusBadge status={r.status} />
          <PriorityBadge priority={r.priority} />
        </div>
        <div className="incident-feed-title mt-0.5">{r.title}</div>
        <div className="incident-feed-meta">
          <span>{(r.target_department as { name?: string } | undefined)?.name ?? '—'}</span>
          <span className="incident-feed-dot">·</span>
          <span>{timeAgo(r.created_at)}</span>
          {r.assignee && (<><span className="incident-feed-dot">·</span><span>{(r.assignee as { full_name?: string }).full_name}</span></>)}
        </div>
      </div>
    </div>
  )
}
