'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Search, Inbox, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/hooks/useProfile'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import { SkeletonLine } from '@/components/ui/LoadingSpinner'
import { timeAgo } from '@/lib/utils'
import type { Request, RequestStatus, RequestPriority } from '@/types'

type View = 'all' | 'raised' | 'assigned' | 'dept'
const STATUSES: RequestStatus[] = ['open', 'in_progress', 'on_hold', 'resolved', 'closed']
const PRIORITIES: RequestPriority[] = ['low', 'medium', 'high', 'urgent']

const SELECT =
  'id,request_number,title,status,priority,category,created_at,updated_at,' +
  'raiser:profiles!raised_by(full_name),assignee:profiles!assigned_to(full_name),' +
  'target_department:departments!target_dept(name,code),raised_department:departments!raised_dept(name,code)'

function RequestsContent() {
  const router = useRouter()
  const params = useSearchParams()
  const { profile, loading: profileLoading } = useProfile()
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>((params.get('view') as View) || 'all')
  const [status, setStatus] = useState<RequestStatus | ''>((params.get('status') as RequestStatus) || '')
  const [priority, setPriority] = useState<RequestPriority | ''>('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    if (profileLoading || !profile) return
    async function load() {
      setLoading(true)
      const supabase = createClient()
      let q = supabase.from('requests').select(SELECT).order('created_at', { ascending: false })
      if (view === 'raised') q = q.eq('raised_by', profile!.id)
      else if (view === 'assigned') q = q.eq('assigned_to', profile!.id)
      else if (view === 'dept' && profile!.department_id) q = q.eq('target_dept', profile!.department_id)
      if (status) q = q.eq('status', status)
      if (priority) q = q.eq('priority', priority)
      if (search) {
        const t = search.replace(/[,()]/g, ' ').trim()
        if (t) q = q.or(`title.ilike.%${t}%,request_number.ilike.%${t}%`)
      }
      const { data } = await q.limit(100)
      setRequests((data as unknown as Request[]) ?? [])
      setLoading(false)
    }
    load()
  }, [profileLoading, profile, view, status, priority, search])

  const views: { key: View; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'assigned', label: 'Assigned to me' },
    { key: 'raised', label: 'Raised by me' },
    ...(profile?.department_id ? [{ key: 'dept' as View, label: 'My department' }] : []),
  ]

  return (
    <div>
      <PageHeader
        title="Requests"
        subtitle="Log, route, and resolve requests across departments"
        action={<Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => router.push('/requests/new')}>New Request</Button>}
      />

      <div className="segmented mb-4 max-w-full overflow-x-auto scrollbar-none">
        {views.map(v => (
          <button key={v.key} className={view === v.key ? 'active' : ''} onClick={() => setView(v.key)}>{v.label}</button>
        ))}
      </div>

      <div className="filter-toolbar mb-4">
        <div className="filter-toolbar-search">
          <Search className="h-3.5 w-3.5" />
          <input type="text" placeholder="Search title or request no…" value={searchInput} onChange={e => setSearchInput(e.target.value)} />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value as RequestStatus | '')}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select value={priority} onChange={e => setPriority(e.target.value as RequestPriority | '')}>
          <option value="">All priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="panel p-4 space-y-3">
          {[...Array(6)].map((_, i) => <SkeletonLine key={i} className={i % 2 ? 'w-3/4' : 'w-full'} />)}
        </div>
      ) : requests.length === 0 ? (
        <div className="panel">
          <EmptyState icon={<Inbox className="h-6 w-6" />} title="No requests found" description="Try a different view or filter, or create a new request." />
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {requests.map(r => (
            <button key={r.id} onClick={() => router.push(`/requests/${r.id}`)} className="card text-left hover:border-[var(--color-brand-light)] transition-colors" style={{ padding: '14px 16px' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="incident-feed-id">{r.request_number}</span>
                    <StatusBadge status={r.status} />
                    <PriorityBadge priority={r.priority} />
                  </div>
                  <p className="font-display font-bold text-[0.95rem] text-[var(--color-ink)] leading-snug">{r.title}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap font-sans text-xs text-[var(--color-ink-3)]">
                    <span className="dept-chip">{(r.target_department as { code?: string } | undefined)?.code ?? '—'}</span>
                    <span>{(r.target_department as { name?: string } | undefined)?.name}</span>
                    <span className="text-[var(--color-ink-5)]">·</span>
                    <span>{timeAgo(r.created_at)}</span>
                    {r.assignee ? (
                      <><span className="text-[var(--color-ink-5)]">·</span><span>{(r.assignee as { full_name?: string }).full_name}</span></>
                    ) : (
                      <><span className="text-[var(--color-ink-5)]">·</span><span className="italic text-[var(--color-ink-4)]">Unassigned</span></>
                    )}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[var(--color-ink-4)] shrink-0 mt-1" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function RequestsPage() {
  return (
    <Suspense fallback={<div className="panel p-4"><div className="skeleton h-64" /></div>}>
      <RequestsContent />
    </Suspense>
  )
}
