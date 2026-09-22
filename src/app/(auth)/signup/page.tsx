'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'

const schema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters').max(80),
  email: z.string().email('Enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
})
type FormData = z.infer<typeof schema>

export default function SignupPage() {
  const router = useRouter()
  const [showPass, setShowPass] = useState(false)
  const [authError, setAuthError] = useState('')
  const [done, setDone] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setAuthError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { full_name: data.full_name } },
    })
    if (error) { setAuthError(error.message); return }
    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'oklch(96.5% 0.004 264)' }}>
        <div className="card max-w-md w-full text-center">
          <CheckCircle2 className="h-12 w-12 text-[var(--color-success)] mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold text-[var(--color-ink)] mb-2">Check your email</h2>
          <p className="font-sans text-sm text-[var(--color-ink-3)] leading-relaxed mb-6">
            We sent a verification link to your email address. Click the link to activate your account.
          </p>
          <Button variant="secondary" onClick={() => router.push('/login')} className="w-full">Back to sign in</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'oklch(96.5% 0.004 264)' }}>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl text-white font-display font-black text-xl mb-3" style={{ background: 'oklch(34% 0.20 264)' }}>IH</div>
          <h1 className="font-display text-2xl font-extrabold text-[var(--color-ink)] tracking-tight">IncidentHub</h1>
        </div>
        <div className="card">
          <h2 className="font-display text-xl font-bold text-[var(--color-ink)] tracking-tight mb-1">Create your account</h2>
          <p className="font-sans text-sm text-[var(--color-ink-3)] mb-6">Join your organization&apos;s incident management system.</p>

          {authError && (
            <div className="flex items-start gap-3 rounded-[var(--radius-md)] bg-[var(--color-danger-light)] border border-red-200 px-4 py-3 mb-5">
              <AlertTriangle className="h-4 w-4 text-[var(--color-danger)] mt-0.5 shrink-0" />
              <span className="font-sans text-sm text-[var(--color-danger)]">{authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="field-label">Full name</label>
              <input {...register('full_name')} type="text" placeholder="Kwame Mensah" className="field-input" autoComplete="name" />
              {errors.full_name && <p className="field-error">{errors.full_name.message}</p>}
            </div>
            <div>
              <label className="field-label">Work email</label>
              <input {...register('email')} type="email" placeholder="you@company.com" className="field-input" autoComplete="email" />
              {errors.email && <p className="field-error">{errors.email.message}</p>}
            </div>
            <div>
              <label className="field-label">Password</label>
              <div className="relative">
                <input {...register('password')} type={showPass ? 'text' : 'password'} placeholder="Min. 8 chars with uppercase + number" className="field-input pr-10" autoComplete="new-password" />
                <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-4)] hover:text-[var(--color-ink-2)] transition-colors">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="field-error">{errors.password.message}</p>}
            </div>
            <div>
              <label className="field-label">Confirm password</label>
              <input {...register('confirm')} type={showPass ? 'text' : 'password'} placeholder="Repeat password" className="field-input" autoComplete="new-password" />
              {errors.confirm && <p className="field-error">{errors.confirm.message}</p>}
            </div>
            <Button type="submit" variant="primary" size="lg" loading={isSubmitting} className="w-full mt-2">Create account</Button>
          </form>

          <p className="mt-5 text-center font-sans text-sm text-[var(--color-ink-3)]">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-[var(--color-brand)] hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
