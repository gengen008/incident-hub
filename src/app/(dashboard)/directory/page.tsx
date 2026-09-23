'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MessageSquare, Building2, Users2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/hooks/useProfile'
import { getOrCreateDirectConversation } from '@/lib/chat'
import Avatar from '@/components/ui/Avatar'
import PageHeader from '@/components/ui/PageHeader'
import { RoleBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { toastError } from '@/lib/toast'
import type { Department, Profile } from '@/types'

export default function DirectoryPage() {
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const [tab, setTab] = useState<'people' | 'departments'>('people')
  const [people, setPeople] = useState<Profile[]>([])
  const [depts, setDepts] = useState<Department[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: ppl }, { data: dp }] = await Promise.all([
        supabase.from('profiles').select('id,full_name,job_title,role,avatar_url,department:departments(name,code)').eq('is_active', true).order('full_name'),
        supabase.from('departments').select('*').eq('is_active', true).order('name'),
      ])
      setPeople((ppl as unknown as Profile[]) ?? [])
      setDepts((dp as Department[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filteredPeople = useMemo(() => people.filter(p =>
    !search || p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (p.job_title ?? '').toLowerCase().includes(search.toLowerCase()) ||
    ((p.department as { name?: string } | undefined)?.name ?? '').toLowerCase().includes(search.toLowerCase())
  ), [people, search])

  const countByDept = useMemo(() => {
    const m: Record<string, number> = {}
    for (const p of people) {
      const name = (p.department as { name?: string } | undefined)?.name
      if (name) m[name] = (m[name] ?? 0) + 1
    }
    return m
  }, [people])

  async function message(other: Profile) {
    if (!profile || other.id === profile.id) return
    setBusy(true)
    try {
      const supabase = createClient()
      const id = await getOrCreateDirectConversation(supabase, profile.id, other.id)
      router.push(`/chat/${id}`)
    } catch (e) { toastError('Could not open chat', (e as Error).message); setBusy(false) }
  }

  if (profileLoading || loading) return <PageLoader />

  return (
    <div>
      <PageHeader title="Directory" subtitle="People and departments across Labianca Company Limited" />

      <div className="segmented mb-4">
        <button className={tab === 'people' ? 'active' : ''} onClick={() => setTab('people')}>People</button>
        <button className={tab === 'departments' ? 'active' : ''} onClick={() => setTab('departments')}>Departments</button>
      </div>

      {tab === 'people' ? (
        <>
          <div className="filter-toolbar mb-4">
            <div className="filter-toolbar-search">
              <Search className="h-3.5 w-3.5" />
              <input type="text" placeholder="Search name, role, department…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="dir-grid">
            {filteredPeople.map(p => (
              <div key={p.id} className="dir-card">
                <Avatar name={p.full_name} url={p.avatar_url} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-sans text-sm font-bold text-[var(--color-ink)] truncate">{p.full_name}</p>
                    {p.role !== 'staff' && <RoleBadge role={p.role} />}
                  </div>
                  <p className="font-sans text-xs text-[var(--color-ink-3)] truncate">{p.job_title}</p>
                  <p className="font-sans text-[0.68rem] text-[var(--color-ink-4)] truncate">{(p.department as { name?: string } | undefined)?.name}</p>
                </div>
                {p.id !== profile?.id && (
                  <button onClick={() => message(p)} disabled={busy} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-subtle)] text-[var(--color-brand)] hover:bg-[var(--color-brand)] hover:text-white transition-colors" title={`Message ${p.full_name}`}>
                    <MessageSquare className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {filteredPeople.length === 0 && <p className="text-center py-10 font-sans text-sm text-[var(--color-ink-3)]">No people found.</p>}
        </>
      ) : (
        <div className="dir-grid">
          {depts.map(d => (
            <div key={d.id} className="dir-card">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-white font-mono font-bold text-sm" style={{ background: d.color ?? 'var(--color-brand)' }}>
                {d.code}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-sans text-sm font-bold text-[var(--color-ink)] truncate">{d.name}</p>
                <p className="font-sans text-xs text-[var(--color-ink-3)] line-clamp-1">{d.description}</p>
                <p className="font-sans text-[0.68rem] text-[var(--color-ink-4)] mt-0.5 flex items-center gap-1"><Users2 className="h-3 w-3" /> {countByDept[d.name] ?? 0} members</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
