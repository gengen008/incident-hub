'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'

const schema = z.object({ email: z.string().email('Enter a valid email address') })
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [authError, setAuthError] = useState('')
  const [done, setDone] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setAuthError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/update-password`,
    })
    if (error) { setAuthError(error.message); return }
    setDone(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'oklch(96.5% 0.004 264)' }}>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl text-white font-display font-black text-xl mb-3" style={{ background: 'oklch(34% 0.20 264)' }}>IH</div>
          <h1 className="font-display text-2xl font-extrabold text-[var(--color-ink)] tracking-tight">IncidentHub</h1>
        </div>
        <div className="card">
          {done ? (
            <div className="text-center py-4">
              <CheckCircle2 className="h-10 w-10 text-[var(--color-success)] mx-auto mb-3" />
              <h2 className="font-display text-lg font-bold text-[var(--color-ink)] mb-2">Reset link sent</h2>
              <p className="font-sans text-sm text-[var(--color-ink-3)] mb-4">Check your email for the password reset link.</p>
              <Button variant="secondary" onClick={() => setDone(false)} className="w-full">Send again</Button>
            </div>
          ) : (
            <>
              <h2 className="font-display text-xl font-bold text-[var(--color-ink)] tracking-tight mb-1">Reset your password</h2>
              <p className="font-sans text-sm text-[var(--color-ink-3)] mb-6">Enter your email and we&apos;ll send a reset link.</p>
              {authError && (
                <div className="flex items-start gap-3 rounded-[var(--radius-md)] bg-[var(--color-danger-light)] border border-red-200 px-4 py-3 mb-5">
                  <AlertTriangle className="h-4 w-4 text-[var(--color-danger)] mt-0.5 shrink-0" />
                  <span className="font-sans text-sm text-[var(--color-danger)]">{authError}</span>
                </div>
              )}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="field-label">Email address</label>
                  <input {...register('email')} type="email" placeholder="you@company.com" className="field-input" autoComplete="email" />
                  {errors.email && <p className="field-error">{errors.email.message}</p>}
                </div>
                <Button type="submit" variant="primary" size="lg" loading={isSubmitting} className="w-full">Send reset link</Button>
              </form>
            </>
          )}
          <p className="mt-5 text-center font-sans text-sm text-[var(--color-ink-3)]">
            <Link href="/login" className="font-semibold text-[var(--color-brand)] hover:underline">← Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
