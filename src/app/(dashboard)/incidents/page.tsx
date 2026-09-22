'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/hooks/useProfile'
import { isAdmin, isDeptHead } from '@/lib/auth'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import DataTable from '@/components/ui/DataTable'
import PageHeader from '@/components/ui/PageHeader'
import ErrorState from '@/components/ui/ErrorState'
import { formatDate, exportToCSV } from '@/lib/utils'
import type { Incident, IncidentStatus, IncidentPriority } from '@/types'
import { Suspense } from 'react'

const STATUSES: IncidentStatus[] = ['open', 'in_progress', 'resolved', 'closed']
const PRIORITIES: IncidentPriority[] = ['low', 'medium', 'high', 'critical']

function IncidentsContent() {
  const router = useRouter()
  const params = useSearchParams()
  const { profile, loading: profileLoading } = useProfile()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState(params.get('q') ?? '')
  const [searchInput, setSearchInput] = useState(params.get('q') ?? '')
  const [filterStatus, setFilterStatus] = useState<IncidentStatus | ''>(
    (params.get('status') as IncidentStatus) ?? ''
  )
  const [filterPriority, setFilterPriority] = useState<IncidentPriority | ''>(
    (params.get('priority') as IncidentPriority) ?? ''
  )
  const [exporting, setExporting] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [rowLimit, setRowLimit] = useState(100)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    if (profileLoading || !profile) return
    async function load() {
      setLoading(true)
      setError(false)
      const supabase = createClient()
      const admin = isAdmin(profile?.role)
      const head  = isDeptHead(profile?.role)

      let q = supabase
        .from('incidents')
        .select(`
          id,incident_number,title,status,priority,category,created_at,updated_at,
          department:departments(name,code),
          reporter:profiles!reported_by(full_name),
          assignee:profiles!assigned_to(full_name)
        `)
        .order('created_at', { ascending: false })

      if (!admin && head && profile?.department_id) q = q.eq('department_id', profile.department_id)
      if (!admin && !head) q = q.or(`reported_by.eq.${profile?.id},assigned_to.eq.${profile?.id}`)
      if (filterStatus) q = q.eq('status', filterStatus)
      if (filterPriority) q = q.eq('priority', filterPriority)
      if (search) {
        const t = search.replace(/[,()]/g, ' ').trim()
        if (t) q = q.or(`title.ilike.%${t}%,incident_number.ilike.%${t}%`)
      }

      const { data, error } = await q.limit(rowLimit)
      if (error) { setError(true); setLoading(false); return }
      setIncidents((data as unknown as Incident[]) ?? [])
      setLoading(false)
    }
    load()
  }, [profileLoading, profile, search, filterStatus, filterPriority, reloadKey, rowLimit])

  async function handleExport() {
    setExporting(true)
    const rows = incidents.map(i => ({
      'INC Number': i.incident_number,
      'Title': i.title,
      'Status': i.status,
      'Priority': i.priority,
      'Category': i.category,
      'Department': (i.department as { name: string } | undefined)?.name ?? '',
      'Reporter': (i.reporter as { full_name: string } | undefined)?.full_name ?? '',
      'Assigned To': (i.assignee as { full_name: string } | undefined)?.full_name ?? '',
      'Created': formatDate(i.created_at),
      'Updated': formatDate(i.updated_at),
    }))
    exportToCSV(rows as Record<string, unknown>[], 'incidents')
    setExporting(false)
  }

  const columns = [
    {
      key: 'incident_number', label: 'INC No.', sortable: true, width: '140px',
      render: (row: Incident) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-brand)' }}>
          {row.incident_number}
        </span>
      ),
    },
    {
      key: 'title', label: 'Title', sortable: true, primary: true,
      render: (row: Incident) => (
        <span style={{ fontWeight: 500, color: 'var(--color-ink)', fontSize: '0.875rem' }}>{row.title}</span>
      ),
    },
    {
      key: 'status', label: 'Status',
      render: (row: Incident) => <StatusBadge status={row.status} />,
    },
    {
      key: 'priority', label: 'Priority',
      render: (row: Incident) => <PriorityBadge priority={row.priority} />,
    },
    {
      key: 'department', label: 'Department',
      render: (row: Incident) => (
        <span style={{ color: 'var(--color-ink-3)', fontSize: '0.85rem' }}>
          {(row.department as { name: string } | undefined)?.name ?? '—'}
        </span>
      ),
    },
    {
      key: 'assignee', label: 'Assigned To',
      render: (row: Incident) => (
        <span style={{ color: 'var(--color-ink-3)', fontSize: '0.85rem' }}>
          {(row.assignee as { full_name: string } | undefined)?.full_name ?? 'Unassigned'}
        </span>
      ),
    },
    {
      key: 'created_at', label: 'Created', sortable: true,
      render: (row: Incident) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--color-ink-4)' }}>
          {formatDate(row.created_at)}
        </span>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Incidents"
        subtitle="All workplace incidents — logged, tracked, and resolved"
        action={
          <div className="flex items-center gap-2">
            {incidents.length > 0 && (
              <Button variant="secondary" size="sm" loading={exporting} onClick={handleExport}>
                Export CSV
              </Button>
            )}
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => router.push('/incidents/new')}>
              Report Incident
            </Button>
          </div>
        }
      />

      {/* Filter bar */}
      <div className="filter-toolbar mb-4">
        <div className="filter-toolbar-search">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search by title or INC number…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as IncidentStatus | '')}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value as IncidentPriority | '')}>
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {error ? (
        <ErrorState
          title="Incidents could not be loaded"
          detail="Check your connection and try again."
          onRetry={() => setReloadKey(k => k + 1)}
        />
      ) : (
        <>
          <DataTable<Incident & Record<string, unknown>>
            data={incidents as (Incident & Record<string, unknown>)[]}
            columns={columns as unknown as Parameters<typeof DataTable<Incident & Record<string, unknown>>>[0]['columns']}
            loading={loading}
            onRowClick={row => router.push(`/incidents/${row.id}`)}
            emptyMessage="No incidents found. Try adjusting your filters or report a new incident."
          />
          {!loading && !error && incidents.length === rowLimit && (
            <div className="flex justify-center mt-4">
              <Button variant="secondary" size="sm" onClick={() => setRowLimit(n => n + 100)}>
                Load more incidents
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function IncidentsPage() {
  return (
    <Suspense fallback={<div className="card"><div className="skeleton h-64" /></div>}>
      <IncidentsContent />
    </Suspense>
  )
}
