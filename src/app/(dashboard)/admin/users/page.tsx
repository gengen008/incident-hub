'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, UserX, KeyRound, Search } from 'lucide-react'
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
import { formatDate } from '@/lib/utils'
import type { Profile, Department, UserRole } from '@/types'

const ROLES: UserRole[] = ['user', 'department_head', 'admin']

interface UserRow extends Profile {
  dept?: Department | null
}

export default function UsersPage() {
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const [users, setUsers] = useState<UserRow[]>([])
  const [depts, setDepts] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [search, setSearch] = useState('')

  // Modals
  const [modal, setModal] = useState<'edit' | 'deactivate' | 'reset' | null>(null)
  const [target, setTarget] = useState<UserRow | null>(null)
  const [saving, setSaving] = useState(false)

  // Edit form
  const [editRole, setEditRole] = useState<UserRole>('user')
  const [editDeptId, setEditDeptId] = useState('')
  const [editFullName, setEditFullName] = useState('')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (profileLoading) return
    if (!isAdmin(profile?.role)) { router.replace('/dashboard'); return }
    load()
  }, [profileLoading, profile, router, reloadKey])

  async function load() {
    setLoading(true); setError(false)
    const supabase = createClient()
    const [{ data: usrs }, { data: deptData }] = await Promise.all([
      supabase.from('profiles').select('*, dept:departments(id,name,code)').order('full_name'),
      supabase.from('departments').select('id,name,code').eq('is_active', true).order('name'),
    ])
    if (!usrs) { setError(true); setLoading(false); return }
    setUsers((usrs as unknown as UserRow[]) ?? [])
    setDepts((deptData as Department[]) ?? [])
    setLoading(false)
  }

  function openEdit(u: UserRow) {
    setTarget(u)
    setEditRole(u.role); setEditDeptId(u.department_id ?? ''); setEditFullName(u.full_name ?? ''); setFormError('')
    setModal('edit')
  }

  async function saveEdit() {
    if (!target) return
    setFormError('')
    if (!editFullName.trim()) { setFormError('Full name is required'); return }
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({
      full_name:     editFullName.trim(),
      role:          editRole,
      department_id: editDeptId || null,
    }).eq('id', target.id)
    if (error) { setFormError(error.message); setSaving(false); return }
    toastSuccess('User updated')
    setSaving(false); setModal(null); setReloadKey(k => k + 1)
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

  async function sendPasswordReset() {
    if (!target) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(target.email ?? '', {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/reset-password`,
    })
    if (error) { toastError('Reset failed', error.message); setSaving(false); return }
    toastSuccess('Password reset email sent', target.email ?? '')
    setSaving(false); setModal(null)
  }

  const filtered = users.filter(u =>
    !search ||
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  if (profileLoading || loading) return <PageLoader />
  if (error) return <ErrorState title="Could not load users" onRetry={() => setReloadKey(k => k + 1)} />

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Manage user accounts, roles, and department assignments"
        back
      />

      {/* Search */}
      <div className="filter-toolbar mb-4">
        <div className="filter-toolbar-search">
          <Search className="h-3.5 w-3.5" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<UserX className="h-10 w-10" />}
          title="No users found"
          description="No users match your search."
        />
      ) : (
        <div className="panel">
          <div className="divide-y divide-[var(--border-default)]">
            {filtered.map(u => (
              <div key={u.id} className="flex items-center gap-4 px-5 py-4 hover:bg-[var(--surface-page)] transition-colors group">
                <Avatar name={u.full_name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-sans text-sm font-bold text-[var(--color-ink)]">{u.full_name ?? '—'}</span>
                    <RoleBadge role={u.role} />
                    {!u.is_active && (
                      <span className="badge" style={{ background: 'var(--color-ink-6)', color: 'var(--color-ink-3)' }}>Inactive</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="font-sans text-xs text-[var(--color-ink-3)]">{u.email}</span>
                    {(u.dept as Department | undefined) && (
                      <span className="font-mono text-xs text-[var(--color-brand)]">{(u.dept as Department).name}</span>
                    )}
                    <span className="font-mono text-xs text-[var(--color-ink-4)]">since {formatDate(u.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => openEdit(u)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-ink-3)] hover:text-[var(--color-brand)] hover:bg-[var(--color-brand-subtle)] transition-colors"
                    title="Edit user"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => { setTarget(u); setModal('reset') }}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-ink-3)] hover:text-[var(--color-brand)] hover:bg-[var(--color-brand-subtle)] transition-colors"
                    title="Reset password"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => { setTarget(u); setModal('deactivate') }}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-ink-3)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] transition-colors"
                    title={u.is_active ? 'Deactivate' : 'Reactivate'}
                  >
                    <UserX className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <Modal open={modal === 'edit'} onClose={() => setModal(null)} size="sm" title="Edit User">
        <div className="p-5 space-y-4">
          <div>
            <label className="field-label">Full Name <span className="text-[var(--color-danger)]">*</span></label>
            <input value={editFullName} onChange={e => setEditFullName(e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label">Role</label>
            <select value={editRole} onChange={e => setEditRole(e.target.value as UserRole)} className="field-input">
              {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Department</label>
            <select value={editDeptId} onChange={e => setEditDeptId(e.target.value)} className="field-input">
              <option value="">No department</option>
              {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          {formError && <p className="field-error">{formError}</p>}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={saveEdit}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Deactivate Modal */}
      <Modal open={modal === 'deactivate'} onClose={() => setModal(null)} size="sm" title={target?.is_active ? 'Deactivate User' : 'Reactivate User'}>
        <div className="p-5 space-y-4">
          <p className="font-sans text-sm text-[var(--color-ink-2)]">
            {target?.is_active
              ? `Deactivating ${target?.full_name} will prevent them from logging in.`
              : `Reactivating ${target?.full_name} will restore their access.`}
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
            <Button variant={target?.is_active ? 'danger' : 'primary'} loading={saving} onClick={confirmDeactivate}>
              {target?.is_active ? 'Deactivate' : 'Reactivate'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Password Reset Modal */}
      <Modal open={modal === 'reset'} onClose={() => setModal(null)} size="sm" title="Send Password Reset">
        <div className="p-5 space-y-4">
          <p className="font-sans text-sm text-[var(--color-ink-2)]">
            A password reset link will be sent to <strong>{target?.email}</strong>.
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={sendPasswordReset}>Send Reset Email</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
