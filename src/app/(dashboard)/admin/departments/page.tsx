'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/hooks/useProfile'
import { isAdmin } from '@/lib/auth'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import ErrorState from '@/components/ui/ErrorState'
import { toastError, toastSuccess } from '@/lib/toast'
import type { Department } from '@/types'

export default function DepartmentsPage() {
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const [depts, setDepts] = useState<Department[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [target, setTarget] = useState<Department | null>(null)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (profileLoading) return
    if (!isAdmin(profile?.role)) { router.replace('/dashboard'); return }
    load()
  }, [profileLoading, profile, router, reloadKey])

  async function load() {
    setLoading(true); setError(false)
    const supabase = createClient()
    const [{ data: dp, error: e }, { data: ppl }] = await Promise.all([
      supabase.from('departments').select('*').order('name'),
      supabase.from('profiles').select('department_id'),
    ])
    if (e) { setError(true); setLoading(false); return }
    setDepts((dp as Department[]) ?? [])
    const c: Record<string, number> = {}
    for (const p of (ppl as { department_id: string | null }[]) ?? []) if (p.department_id) c[p.department_id] = (c[p.department_id] ?? 0) + 1
    setCounts(c); setLoading(false)
  }

  function openCreate() { setTarget(null); setName(''); setCode(''); setDescription(''); setFormError(''); setModal('create') }
  function openEdit(d: Department) { setTarget(d); setName(d.name); setCode(d.code); setDescription(d.description ?? ''); setFormError(''); setModal('edit') }

  async function save() {
    setFormError('')
    if (!name.trim() || !code.trim()) { setFormError('Name and code are required'); return }
    setSaving(true)
    const supabase = createClient()
    const payload = { name: name.trim(), code: code.trim().toUpperCase(), description: description.trim() || null }
    const { error } = target
      ? await supabase.from('departments').update(payload).eq('id', target.id)
      : await supabase.from('departments').insert(payload)
    if (error) { setFormError(error.message); setSaving(false); return }
    toastSuccess(target ? 'Department updated' : 'Department created')
    setSaving(false); setModal(null); setReloadKey(k => k + 1)
  }

  if (profileLoading || loading) return <PageLoader />
  if (error) return <ErrorState title="Could not load departments" onRetry={() => setReloadKey(k => k + 1)} />

  return (
    <div>
      <PageHeader title="Departments" subtitle="Company departments and teams" back
        action={<Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>New Department</Button>} />

      <div className="dir-grid">
        {depts.map(d => (
          <div key={d.id} className="dir-card">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-white font-mono font-bold text-sm" style={{ background: d.color ?? 'var(--color-brand)' }}>{d.code}</div>
            <div className="min-w-0 flex-1">
              <p className="font-sans text-sm font-bold text-[var(--color-ink)] truncate">{d.name}</p>
              <p className="font-sans text-xs text-[var(--color-ink-3)] line-clamp-1">{d.description}</p>
              <p className="font-sans text-[0.68rem] text-[var(--color-ink-4)] mt-0.5">{counts[d.id] ?? 0} members</p>
            </div>
            <button onClick={() => openEdit(d)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-ink-3)] hover:text-[var(--color-brand)] hover:bg-[var(--color-brand-subtle)]" title="Edit"><Edit2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>

      <Modal open={modal !== null} onClose={() => setModal(null)} size="sm" title={target ? 'Edit department' : 'New department'}>
        <div className="space-y-4">
          <div><label className="field-label">Name <span className="text-[var(--color-danger)]">*</span></label><input value={name} onChange={e => setName(e.target.value)} className="field-input" placeholder="e.g. Operations" /></div>
          <div><label className="field-label">Code <span className="text-[var(--color-danger)]">*</span></label><input value={code} onChange={e => setCode(e.target.value)} className="field-input" placeholder="e.g. OPS" maxLength={5} /></div>
          <div><label className="field-label">Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} className="field-input" rows={3} style={{ resize: 'none' }} /></div>
          {formError && <p className="field-error">{formError}</p>}
          <div className="flex justify-end gap-3 pt-1"><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>{target ? 'Save' : 'Create'}</Button></div>
        </div>
      </Modal>
    </div>
  )
}
