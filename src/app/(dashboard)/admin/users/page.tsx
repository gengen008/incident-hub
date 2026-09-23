'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, UserX, KeyRound, Search, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/hooks/useProfile'
import { isAdmin } from '@/lib/auth'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Avatar from '@/components/ui/Avatar'
import PageHeader from '@/components/ui/PageHeader'
import { RoleBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import ErrorState from '@/components/ui/ErrorState'
import EmptyState from '@/components/ui/EmptyState'
import { toastError, toastSuccess } from '@/lib/toast'
import type { Profile, Department, UserRole } from '@/types'

const ROLES: UserRole[] = ['staff', 'head', 'admin']

export default function UsersPage() {
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const [users, setUsers] = useState<Profile[]>([])
  const [depts, setDepts] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [search, setSearch] = useState('')

  const [modal, setModal] = useState<'edit' | 'deactivate' | 'reset' | 'invite' | null>(null)
  const [target, setTarget] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)

  const [editRole, setEditRole] = useState<UserRole>('staff')
  const [editDeptId, setEditDeptId] = useState('')
  const [editFullName, setEditFullName] = useState('')
  const [editJobTitle, setEditJobTitle] = useState('')
  const [formError, setFormError] = useState('')

  const [invEmail, setInvEmail] = useState('')
  const [invPassword, setInvPassword] = useState('')
  const [invName, setInvName] = useState('')
  const [invTitle, setInvTitle] = useState('')
  const [invRole, setInvRole] = useState<UserRole>('staff')
  const [invDept, setInvDept] = useState('')
  const [invError, setInvError] = useState('')

  useEffect(() => {
    if (profileLoading) return
    if (!isAdmin(profile?.role)) { router.replace('/dashboard'); return }
    load()
  }, [profileLoading, profile, router, reloadKey])

  async function load() {
    setLoading(true); setError(false)
    const supabase = createClient()
    const [{ data: usrs }, { data: deptData }] = await Promise.all([
      supabase.from('profiles').select('*, department:departments(id,name,code)').order('full_name'),
      supabase.from('departments').select('id,name,code').eq('is_active', true).order('name'),
    ])
    if (!usrs) { setError(true); setLoading(false); return }
    setUsers(usrs as unknown as Profile[])
    setDepts((deptData as Department[]) ?? [])
    setLoading(false)
  }

  function openEdit(u: Profile) {
    setTarget(u); setEditRole(u.role); setEditDeptId(u.department_id ?? '')
    setEditFullName(u.full_name ?? ''); setEditJobTitle(u.job_title ?? ''); setFormError('')
    setModal('edit')
  }

  async function saveEdit() {
    if (!target) return
    setFormError('')
    if (!editFullName.trim()) { setFormError('Full name is required'); return }
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({
      full_name: editFullName.trim(), role: editRole,
      department_id: editDeptId || null, job_title: editJobTitle.trim() || null,
    }).eq('id', target.id)
    if (error) { setFormError(error.message); setSaving(false); return }
    toastSuccess('User updated'); setSaving(false); setModal(null); setReloadKey(k => k + 1)
  }

  async function confirmDeactivate() {
    if (!target) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({ is_active: !target.is_active }).eq('id', target.id)
    if (error) { toastError('Failed', error.message); setSaving(false); return }
    toastSuccess(target.is_active ? 'User deactivated' : 'User reactivated')
    setSaving(false); setModal(null); setReloadKey(k => k + 1)
  }

  async function sendReset() {
    if (!target) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(target.email ?? '', {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin}/reset-password`,
    })
    if (error) { toastError('Reset failed', error.message); setSaving(false); return }
    toastSuccess('Password reset email sent', target.email ?? ''); setSaving(false); setModal(null)
  }

  async function invite() {
    setInvError('')
    if (!invEmail.trim() || !invPassword || !invName.trim()) { setInvError('Name, email and password are required'); return }
    setSaving(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: invEmail.trim(), password: invPassword, full_name: invName.trim(), role: invRole, department_id: invDept || undefined, job_title: invTitle.trim() || undefined }),
    })
    const json = await res.json()
    if (!res.ok) { setInvError(json.error ?? 'Failed to create user'); setSaving(false); return }
    toastSuccess('User created', invEmail)
    setSaving(false); setModal(null)
    setInvEmail(''); setInvPassword(''); setInvName(''); setInvTitle(''); setInvRole('staff'); setInvDept('')
    setReloadKey(k => k + 1)
  }

  const filtered = users.filter(u => !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))

  if (profileLoading || loading) return <PageLoader />
  if (error) return <ErrorState title="Could not load users" onRetry={() => setReloadKey(k => k + 1)} />

  return (
    <div>
      <PageHeader title="Users" subtitle="Manage accounts, roles and departments" back
        action={<Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => { setInvError(''); setModal('invite') }}>Add User</Button>} />

      <div className="filter-toolbar mb-4">
        <div className="filter-toolbar-search">
          <Search className="h-3.5 w-3.5" />
          <input type="text" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<UserX className="h-10 w-10" />} title="No users found" description="No users match your search." />
      ) : (
        <div className="panel">
          <div className="divide-y divide-[var(--border-default)]">
            {filtered.map(u => (
              <div key={u.id} className="flex items-center gap-4 px-4 py-3 hover:bg-[var(--surface-page)] transition-colors group">
                <Avatar name={u.full_name} url={u.avatar_url} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-sans text-sm font-bold text-[var(--color-ink)]">{u.full_name ?? '—'}</span>
                    <RoleBadge role={u.role} />
                    {!u.is_active && <span className="badge badge-staff">Inactive</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap font-sans text-xs text-[var(--color-ink-3)]">
                    <span className="truncate">{u.email}</span>
                    {(u.department as Department | undefined) && <span className="dept-chip">{(u.department as Department).code}</span>}
                    {u.job_title && <span>{u.job_title}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(u)} className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-ink-3)] hover:text-[var(--color-brand)] hover:bg-[var(--color-brand-subtle)]" title="Edit"><Edit2 className="h-3.5 w-3.5" /></button>
                  <button onClick={() => { setTarget(u); setModal('reset') }} className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-ink-3)] hover:text-[var(--color-brand)] hover:bg-[var(--color-brand-subtle)]" title="Reset password"><KeyRound className="h-3.5 w-3.5" /></button>
                  <button onClick={() => { setTarget(u); setModal('deactivate') }} className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-ink-3)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-light)]" title={u.is_active ? 'Deactivate' : 'Reactivate'}><UserX className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit */}
      <Modal open={modal === 'edit'} onClose={() => setModal(null)} size="sm" title="Edit user">
        <div className="space-y-4">
          <div><label className="field-label">Full name <span className="text-[var(--color-danger)]">*</span></label><input value={editFullName} onChange={e => setEditFullName(e.target.value)} className="field-input" /></div>
          <div><label className="field-label">Job title</label><input value={editJobTitle} onChange={e => setEditJobTitle(e.target.value)} className="field-input" /></div>
          <div><label className="field-label">Role</label><select value={editRole} onChange={e => setEditRole(e.target.value as UserRole)} className="field-input">{ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
          <div><label className="field-label">Department</label><select value={editDeptId} onChange={e => setEditDeptId(e.target.value)} className="field-input"><option value="">No department</option>{depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
          {formError && <p className="field-error">{formError}</p>}
          <div className="flex justify-end gap-3 pt-1"><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button variant="primary" loading={saving} onClick={saveEdit}>Save</Button></div>
        </div>
      </Modal>

      {/* Deactivate */}
      <Modal open={modal === 'deactivate'} onClose={() => setModal(null)} size="sm" title={target?.is_active ? 'Deactivate user' : 'Reactivate user'}>
        <div className="space-y-4">
          <p className="font-sans text-sm text-[var(--color-ink-2)]">{target?.is_active ? `${target?.full_name} will no longer be able to sign in.` : `${target?.full_name} will regain access.`}</p>
          <div className="flex justify-end gap-3"><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button variant={target?.is_active ? 'danger' : 'primary'} loading={saving} onClick={confirmDeactivate}>{target?.is_active ? 'Deactivate' : 'Reactivate'}</Button></div>
        </div>
      </Modal>

      {/* Reset */}
      <Modal open={modal === 'reset'} onClose={() => setModal(null)} size="sm" title="Send password reset">
        <div className="space-y-4">
          <p className="font-sans text-sm text-[var(--color-ink-2)]">A reset link will be emailed to <strong>{target?.email}</strong>.</p>
          <div className="flex justify-end gap-3"><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button variant="primary" loading={saving} onClick={sendReset}>Send reset email</Button></div>
        </div>
      </Modal>

      {/* Invite */}
      <Modal open={modal === 'invite'} onClose={() => setModal(null)} size="sm" title="Add new user">
        <div className="space-y-4">
          <div><label className="field-label">Full name <span className="text-[var(--color-danger)]">*</span></label><input value={invName} onChange={e => setInvName(e.target.value)} className="field-input" placeholder="Kofi Mensah" /></div>
          <div><label className="field-label">Email <span className="text-[var(--color-danger)]">*</span></label><input value={invEmail} onChange={e => setInvEmail(e.target.value)} className="field-input" type="email" placeholder="name@labianca.com" /></div>
          <div><label className="field-label">Temporary password <span className="text-[var(--color-danger)]">*</span></label><input value={invPassword} onChange={e => setInvPassword(e.target.value)} className="field-input" type="password" placeholder="Min 8 characters" /></div>
          <div><label className="field-label">Job title</label><input value={invTitle} onChange={e => setInvTitle(e.target.value)} className="field-input" /></div>
          <div className="form-2col">
            <div><label className="field-label">Role</label><select value={invRole} onChange={e => setInvRole(e.target.value as UserRole)} className="field-input">{ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
            <div><label className="field-label">Department</label><select value={invDept} onChange={e => setInvDept(e.target.value)} className="field-input"><option value="">No department</option>{depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
          </div>
          {invError && <p className="field-error">{invError}</p>}
          <div className="flex justify-end gap-3 pt-1"><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button variant="primary" loading={saving} icon={<UserPlus className="h-4 w-4" />} onClick={invite}>Create user</Button></div>
        </div>
      </Modal>
    </div>
  )
}
