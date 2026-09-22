'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/hooks/useProfile'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import PageHeader from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { toastError, toastSuccess } from '@/lib/toast'
import { RoleBadge } from '@/components/ui/Badge'
import type { NotificationPreferences } from '@/types'

export default function SettingsPage() {
  const { profile, loading: profileLoading } = useProfile()

  // Profile form
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  // Password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  // Notification prefs
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null)
  const [savingPrefs, setSavingPrefs] = useState(false)

  useEffect(() => {
    if (!profile) return
    setFullName(profile.full_name ?? '')
    setPhone((profile as { phone?: string }).phone ?? '')

    const supabase = createClient()
    supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', profile.id)
      .single()
      .then(({ data }) => { if (data) setPrefs(data as NotificationPreferences) })
  }, [profile])

  async function saveProfile() {
    if (!profile || !fullName.trim()) return
    setSavingProfile(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), ...(phone ? { phone: phone.trim() } : {}) })
      .eq('id', profile.id)
    if (error) { toastError('Could not save profile', error.message) }
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
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    setSavingPassword(false)
  }

  async function savePrefs() {
    if (!profile || !prefs) return
    setSavingPrefs(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('notification_preferences')
      .upsert({ ...prefs, user_id: profile.id })
    if (error) toastError('Could not save preferences', error.message)
    else toastSuccess('Notification preferences saved')
    setSavingPrefs(false)
  }

  if (profileLoading) return <PageLoader />

  const NOTIF_TOGGLES: { key: keyof NotificationPreferences; label: string; desc: string }[] = [
    { key: 'email_on_assign',       label: 'Assigned to me',        desc: 'When an incident is assigned to you' },
    { key: 'email_on_status_change',label: 'Status changes',         desc: 'When an incident you own or are assigned to changes status' },
    { key: 'email_on_comment',      label: 'New comments',           desc: 'When someone comments on your incident' },
    { key: 'email_on_critical',     label: 'Critical incidents',     desc: 'When a critical priority incident is created in your department' },
    { key: 'push_on_assign',        label: 'In-app: assignments',    desc: 'Browser push notification when assigned' },
    { key: 'push_on_status_change', label: 'In-app: status changes', desc: 'Browser push notification on status change' },
  ]

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" subtitle="Manage your profile, security, and notification preferences" />

      {/* Profile card */}
      <div className="card mb-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar name={profile?.full_name} size="lg" />
          <div>
            <h3 className="font-display font-bold text-[var(--color-ink)]">{profile?.full_name ?? '—'}</h3>
            <p className="font-sans text-xs text-[var(--color-ink-3)]">{profile?.email}</p>
            {profile?.role && <RoleBadge role={profile.role} />}
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="field-label">Full Name <span className="text-[var(--color-danger)]">*</span></label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label">Phone (optional)</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} className="field-input" type="tel" placeholder="+1 555 000 0000" />
          </div>
        </div>
        <div className="flex justify-end mt-5">
          <Button variant="primary" loading={savingProfile} onClick={saveProfile} disabled={!fullName.trim()}>
            Save Profile
          </Button>
        </div>
      </div>

      {/* Password card */}
      <div className="card mb-6">
        <h3 className="font-display font-bold text-[var(--color-ink)] mb-4">Change Password</h3>
        <div className="space-y-4">
          <div>
            <label className="field-label">New Password</label>
            <input value={newPassword} onChange={e => setNewPassword(e.target.value)} className="field-input" type="password" placeholder="Min 8 characters" />
          </div>
          <div>
            <label className="field-label">Confirm New Password</label>
            <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="field-input" type="password" />
          </div>
          {passwordError && <p className="field-error">{passwordError}</p>}
        </div>
        <div className="flex justify-end mt-5">
          <Button variant="primary" loading={savingPassword} onClick={savePassword} disabled={!newPassword}>
            Change Password
          </Button>
        </div>
      </div>

      {/* Notification prefs */}
      {prefs && (
        <div className="card">
          <h3 className="font-display font-bold text-[var(--color-ink)] mb-1">Notification Preferences</h3>
          <p className="font-sans text-xs text-[var(--color-ink-3)] mb-5">Choose what you want to be notified about</p>
          <div className="space-y-3">
            {NOTIF_TOGGLES.map(({ key, label, desc }) => (
              <label key={key} className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    checked={!!prefs[key]}
                    onChange={e => setPrefs(prev => prev ? { ...prev, [key]: e.target.checked } : prev)}
                    className="sr-only peer"
                  />
                  <div className="h-5 w-9 rounded-full border-2 border-[var(--border-default)] bg-[var(--color-ink-6)] peer-checked:bg-[var(--color-brand)] peer-checked:border-[var(--color-brand)] transition-colors" />
                  <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4 shadow-sm" />
                </div>
                <div>
                  <p className="font-sans text-sm font-semibold text-[var(--color-ink)]">{label}</p>
                  <p className="font-sans text-xs text-[var(--color-ink-3)]">{desc}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex justify-end mt-6">
            <Button variant="primary" loading={savingPrefs} onClick={savePrefs}>Save Preferences</Button>
          </div>
        </div>
      )}
    </div>
  )
}
