'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const [showPass, setShowPass] = useState(false)
  const [authError, setAuthError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setAuthError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password })
    if (error) { setAuthError(error.message); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="flex flex-col items-center text-center mb-6">
          <span className="brand-mark mb-3" style={{ width: 56, height: 56 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/labianca-logo.jpg" alt="Labianca" />
          </span>
          <h1 className="font-display text-2xl font-extrabold text-[var(--color-ink)] tracking-tight">Labianca Desk</h1>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[var(--color-ink-4)] mt-1">Company Limited</p>
        </div>

        <h2 className="font-display text-lg font-bold text-[var(--color-ink)] mb-1">Sign in</h2>
        <p className="font-sans text-sm text-[var(--color-ink-3)] mb-5">Use your Labianca work account to continue.</p>

        {authError && (
          <div className="flex items-start gap-3 rounded-[var(--radius-md)] bg-[var(--color-danger-light)] border border-red-200 px-4 py-3 mb-5">
            <AlertTriangle className="h-4 w-4 text-[var(--color-danger)] mt-0.5 shrink-0" />
            <span className="font-sans text-sm text-[var(--color-danger)]">{authError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="field-label">Email address</label>
            <input {...register('email')} type="email" placeholder="name@labianca.com" className="field-input" autoComplete="email" />
            {errors.email && <p className="field-error">{errors.email.message}</p>}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="field-label" style={{ marginBottom: 0 }}>Password</label>
              <Link href="/forgot-password" className="font-sans text-xs font-semibold text-[var(--color-brand)] hover:underline">Forgot password?</Link>
            </div>
            <div className="relative">
              <input {...register('password')} type={showPass ? 'text' : 'password'} placeholder="••••••••" className="field-input pr-10" autoComplete="current-password" />
              <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-4)] hover:text-[var(--color-ink-2)]">
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="field-error">{errors.password.message}</p>}
          </div>
          <Button type="submit" variant="primary" size="lg" loading={isSubmitting} className="w-full mt-1">Sign in</Button>
        </form>

        <p className="mt-5 text-center font-sans text-xs text-[var(--color-ink-4)]">
          Accounts are created by your administrator. Contact IT if you need access.
        </p>
      </div>
    </div>
  )
}
