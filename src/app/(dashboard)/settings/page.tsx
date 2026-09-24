'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/hooks/useProfile'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import PageHeader from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { RoleBadge } from '@/components/ui/Badge'
import { toastError, toastSuccess } from '@/lib/toast'

export default function SettingsPage() {
  const { profile, loading: profileLoading } = useProfile()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    if (!profile) return
    setFullName(profile.full_name ?? '')
    setPhone(profile.phone ?? '')
    setJobTitle(profile.job_title ?? '')
  }, [profile])

  async function saveProfile() {
    if (!profile || !fullName.trim()) return
    setSavingProfile(true)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      job_title: jobTitle.trim() || null,
    }).eq('id', profile.id)
    if (error) toastError('Could not save profile', error.message)
    else toastSuccess('Profile updated')
    setSavingProfile(false)
  }

  async function savePassword() {
    setPasswordError('')
    if (newPassword.length < 8) { setPasswordError('Password must be at least 8 characters'); return }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match'); return }
    setSavingPassword(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { setPasswordError(error.message); setSavingPassword(false); return }
    toastSuccess('Password changed')
    setNewPassword(''); setConfirmPassword(''); setSavingPassword(false)
  }

  if (profileLoading) return <PageLoader />

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" subtitle="Manage your profile and security" />

      <div className="card mb-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar name={profile?.full_name} size="lg" />
          <div className="min-w-0">
            <h3 className="font-display font-bold text-[var(--color-ink)] truncate">{profile?.full_name ?? '—'}</h3>
            <p className="font-sans text-xs text-[var(--color-ink-3)] truncate">{profile?.email}</p>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              {profile?.role && <RoleBadge role={profile.role} />}
              {profile?.department?.name && <span className="dept-chip">{profile.department.name}</span>}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="field-label">Full name <span className="text-[var(--color-danger)]">*</span></label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} className="field-input" />
          </div>
          <div className="form-2col">
            <div>
              <label className="field-label">Job title</label>
              <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} className="field-input" placeholder="e.g. Operations Officer" />
            </div>
            <div>
              <label className="field-label">Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} className="field-input" type="tel" name="phone" autoComplete="tel" placeholder="+233 …" />
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-5">
          <Button variant="primary" loading={savingProfile} onClick={saveProfile} disabled={!fullName.trim()}>Save profile</Button>
        </div>
      </div>

      <div className="card">
        <h3 className="font-display font-bold text-[var(--color-ink)] mb-4">Change password</h3>
        <div className="space-y-4">
          <div>
            <label className="field-label">New password</label>
            <input value={newPassword} onChange={e => setNewPassword(e.target.value)} className="field-input" type="password" autoComplete="new-password" placeholder="Min 8 characters" />
          </div>
          <div>
            <label className="field-label">Confirm new password</label>
            <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="field-input" type="password" autoComplete="new-password" />
          </div>
          {passwordError && <p className="field-error">{passwordError}</p>}
        </div>
        <div className="flex justify-end mt-5">
          <Button variant="primary" loading={savingPassword} onClick={savePassword} disabled={!newPassword}>Change password</Button>
        </div>
      </div>
    </div>
  )
}
