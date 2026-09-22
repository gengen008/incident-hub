'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [show, setShow]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [done, setDone]         = useState(false)

  async function handleReset() {
    setError('')
    if (password.length < 8)          { setError('Password must be at least 8 characters'); return }
    if (password !== confirm)          { setError('Passwords do not match'); return }
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) { setError(err.message); setLoading(false); return }
    setDone(true)
    setTimeout(() => router.push('/dashboard'), 2500)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface-page)] p-4">
      <div className="w-full max-w-sm">
        <div className="card">
          {done ? (
            <div className="text-center py-6">
              <CheckCircle2 className="h-12 w-12 text-[var(--color-success)] mx-auto mb-4" />
              <h2 className="font-display text-xl font-extrabold tracking-tight text-[var(--color-ink)] mb-1">Password updated</h2>
              <p className="font-sans text-sm text-[var(--color-ink-3)]">Redirecting to your dashboard…</p>
            </div>
          ) : (
            <>
              <h2 className="font-display text-xl font-extrabold tracking-tight text-[var(--color-ink)] mb-1">Set new password</h2>
              <p className="font-sans text-sm text-[var(--color-ink-3)] mb-6">Choose a strong password to protect your account.</p>

              <div className="space-y-4">
                <div>
                  <label className="field-label">New Password</label>
                  <div className="relative">
                    <input
                      type={show ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="field-input pr-10"
                      placeholder="Min 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShow(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-4)] hover:text-[var(--color-ink)] transition-colors"
                    >
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="field-label">Confirm Password</label>
                  <input
                    type={show ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    className="field-input"
                    onKeyDown={e => e.key === 'Enter' && handleReset()}
                  />
                </div>
                {error && <p className="field-error">{error}</p>}
              </div>

              <Button
                variant="primary"
                className="w-full mt-6"
                loading={loading}
                onClick={handleReset}
                disabled={!password || !confirm}
              >
                Set Password
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
