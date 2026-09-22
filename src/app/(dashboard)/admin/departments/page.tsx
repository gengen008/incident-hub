'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, UserCheck, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/hooks/useProfile'
import { isAdmin } from '@/lib/auth'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import ErrorState from '@/components/ui/ErrorState'
import EmptyState from '@/components/ui/EmptyState'
import { toastError, toastSuccess } from '@/lib/toast'
import type { Department, Profile } from '@/types'

interface DeptWithHead extends Department {
  head?: Profile | null
  incident_count?: number
}

export default function DepartmentsPage() {
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const [depts, setDepts] = useState<DeptWithHead[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  // Modal state
  const [modal, setModal] = useState<'create' | 'edit' | 'delete' | null>(null)
  const [target, setTarget] = useState<DeptWithHead | null>(null)
  const [saving, setSaving] = useState(false)

  // Form fields
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [headId, setHeadId] = useState('')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (profileLoading) return
    if (!isAdmin(profile?.role)) { router.replace('/dashboard'); return }
    load()
  }, [profileLoading, profile, router, reloadKey])

  async function load() {
    setLoading(true)
    setError(false)
    const supabase = createClient()
    const [{ data: deptData }, { data: usrData }] = await Promise.all([
      supabase
        .from('departments')
        .select('*, incident_count:incidents(count)')
        .order('name'),
      supabase
        .from('profiles')
        .select('id,full_name,role,department_id')
        .eq('is_active', true)
        .in('role', ['admin', 'department_head'])
        .order('full_name'),
    ])

    if (!deptData) { setError(true); setLoading(false); return }

    // Fetch dept heads from user_departments
    const { data: heads } = await supabase
      .from('user_departments')
      .select('department_id, user:profiles(id,full_name,role)')
      .eq('is_head', true)

    const headMap = new Map<string, Profile>()
    heads?.forEach(h => {
      const u = h.user as unknown as Profile | undefined
      if (u) headMap.set(h.department_id, u)
    })

    const enriched: DeptWithHead[] = (deptData as unknown as Department[]).map(d => ({
      ...d,
      head: headMap.get(d.id) ?? null,
      incident_count: 0,
    }))
    setDepts(enriched)
    setUsers((usrData as Profile[]) ?? [])
    setLoading(false)
  }

  function openCreate() {
    setName(''); setCode(''); setDescription(''); setHeadId(''); setFormError('')
    setModal('create')
  }

  function openEdit(d: DeptWithHead) {
    setTarget(d)
    setName(d.name); setCode(d.code ?? ''); setDescription(d.description ?? ''); setHeadId(d.head?.id ?? ''); setFormError('')
    setModal('edit')
  }

  function openDelete(d: DeptWithHead) { setTarget(d); setModal('delete') }

  async function saveCreate() {
    setFormError('')
    if (!name.trim()) { setFormError('Name is required'); return }
    if (!code.trim() || code.length > 4) { setFormError('Code must be 1–4 characters'); return }
    setSaving(true)
    const supabase = createClient()
    const { data: dept, error } = await supabase
      .from('departments')
      .insert({ name: name.trim(), code: code.trim().toUpperCase(), description: description.trim() || null })
      .select('*')
      .single()
    if (error) { setFormError(error.message); setSaving(false); return }
    if (headId && dept) {
      await supabase.from('user_departments').upsert({ user_id: headId, department_id: dept.id, is_head: true })
      await supabase.from('profiles').update({ department_id: dept.id }).eq('id', headId)
    }
    toastSuccess('Department created', name)
    setSaving(false); setModal(null); setReloadKey(k => k + 1)
  }

  async function saveEdit() {
    if (!target) return
    setFormError('')
    if (!name.trim()) { setFormError('Name is required'); return }
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('departments')
      .update({ name: name.trim(), code: code.trim().toUpperCase(), description: description.trim() || null })
      .eq('id', target.id)
    if (error) { setFormError(error.message); setSaving(false); return }

    // Update head: remove old, set new
    await supabase.from('user_departments').update({ is_head: false }).eq('department_id', target.id).eq('is_head', true)
    if (headId) {
      await supabase.from('user_departments').upsert({ user_id: headId, department_id: target.id, is_head: true })
      await supabase.from('profiles').update({ department_id: target.id }).eq('id', headId)
    }
    toastSuccess('Department updated', name)
    setSaving(false); setModal(null); setReloadKey(k => k + 1)
  }

  async function confirmDelete() {
    if (!target) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('departments').update({ is_active: false }).eq('id', target.id)
    if (error) { toastError('Could not delete department', error.message); setSaving(false); return }
    toastSuccess('Department deactivated', target.name)
    setSaving(false); setModal(null); setReloadKey(k => k + 1)
  }

  if (profileLoading || loading) return <PageLoader />
  if (error) return <ErrorState title="Could not load departments" onRetry={() => setReloadKey(k => k + 1)} />

  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle="Manage company departments and their department heads"
        back
        action={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            Add Department
          </Button>
        }
      />

      {depts.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-10 w-10" />}
          title="No departments yet"
          description="Create your first department to start routing incidents."
          action={<Button variant="primary" onClick={openCreate}>Add Department</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {depts.filter(d => d.is_active).map(d => (
            <div key={d.id} className="card group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-white font-mono text-xs font-bold shrink-0"
                    style={{ background: 'var(--color-brand)' }}
                  >
                    {d.code ?? d.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm text-[var(--color-ink)]">{d.name}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(d)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-ink-3)] hover:text-[var(--color-brand)] hover:bg-[var(--color-brand-subtle)] transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => openDelete(d)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-ink-3)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] transition-colors"
                    title="Deactivate"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {d.description && (
                <p className="font-sans text-xs text-[var(--color-ink-3)] mb-3 line-clamp-2">{d.description}</p>
              )}

              <div className="flex items-center gap-2 pt-3 border-t border-[var(--border-default)]">
                <UserCheck className="h-3.5 w-3.5 text-[var(--color-ink-4)] shrink-0" />
                {d.head ? (
                  <span className="font-sans text-xs text-[var(--color-ink-2)]">{d.head.full_name}</span>
                ) : (
                  <span className="font-sans text-xs text-[var(--color-ink-4)] italic">No head assigned</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modal === 'create' || modal === 'edit'}
        onClose={() => setModal(null)}
        size="sm"
        title={modal === 'create' ? 'New Department' : 'Edit Department'}
      >
        <div className="p-5 space-y-4">
          <div>
            <label className="field-label">Name <span className="text-[var(--color-danger)]">*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} className="field-input" placeholder="e.g. Information Technology" />
          </div>
          <div>
            <label className="field-label">Code <span className="text-[var(--color-danger)]">*</span></label>
            <input value={code} onChange={e => setCode(e.target.value.toUpperCase().slice(0, 4))} className="field-input font-mono" placeholder="e.g. IT" maxLength={4} />
            <p className="font-sans text-xs text-[var(--color-ink-4)] mt-1">1–4 character shortcode used in reports</p>
          </div>
          <div>
            <label className="field-label">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="field-input" rows={2} style={{ resize: 'none' }} />
          </div>
          <div>
            <label className="field-label">Department Head</label>
            <select value={headId} onChange={e => setHeadId(e.target.value)} className="field-input">
              <option value="">No head assigned</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.role.replace('_', ' ')})</option>)}
            </select>
          </div>
          {formError && <p className="field-error">{formError}</p>}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={modal === 'create' ? saveCreate : saveEdit}>
              {modal === 'create' ? 'Create Department' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal open={modal === 'delete'} onClose={() => setModal(null)} size="sm" title="Deactivate Department">
        <div className="p-5 space-y-4">
          <p className="font-sans text-sm text-[var(--color-ink-2)]">
            Are you sure you want to deactivate <strong>{target?.name}</strong>? Existing incidents will not be affected.
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
            <Button variant="danger" loading={saving} onClick={confirmDelete}>Deactivate</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
