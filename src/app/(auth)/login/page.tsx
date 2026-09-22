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
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (error) {
      setAuthError(error.message)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'oklch(96.5% 0.004 264)' }}>
      {/* Left Brand Panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 p-12"
        style={{ background: 'oklch(16% 0.06 264)' }}
      >
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-transparent opacity-75 w-[420px]" />
        <div>
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-white font-display font-black text-xl mb-6"
            style={{ background: 'oklch(34% 0.20 264)' }}
          >
            IH
          </div>
          <h1 className="font-display text-4xl font-extrabold text-white tracking-tight leading-tight mb-3">
            IncidentHub
          </h1>
          <p className="font-sans text-base text-blue-200/70 leading-relaxed max-w-xs">
            Corporate incident management — report, track, and resolve workplace issues across every department.
          </p>
        </div>
        <div className="space-y-4">
          {[
            { stat: '< 2 min', label: 'Average incident log time' },
            { stat: '4 roles', label: 'Granular access control' },
            { stat: 'Real-time', label: 'Status notifications' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-4" style={{ borderLeft: '2px solid oklch(34% 0.20 264)', paddingLeft: '16px' }}>
              <span className="font-display font-extrabold text-white text-lg">{item.stat}</span>
              <span className="font-sans text-sm text-blue-200/60">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <div
              className="inline-flex h-12 w-12 items-center justify-center rounded-xl text-white font-display font-black text-xl mb-3"
              style={{ background: 'oklch(34% 0.20 264)' }}
            >
              IH
            </div>
            <h1 className="font-display text-2xl font-extrabold text-[var(--color-ink)] tracking-tight">IncidentHub</h1>
          </div>

          <div className="card">
            <h2 className="font-display text-xl font-bold text-[var(--color-ink)] tracking-tight mb-1">Sign in to your account</h2>
            <p className="font-sans text-sm text-[var(--color-ink-3)] mb-6">Enter your corporate email and password to continue.</p>

            {authError && (
              <div className="flex items-start gap-3 rounded-[var(--radius-md)] bg-[var(--color-danger-light)] border border-red-200 px-4 py-3 mb-5">
                <AlertTriangle className="h-4 w-4 text-[var(--color-danger)] mt-0.5 shrink-0" />
                <span className="font-sans text-sm text-[var(--color-danger)]">{authError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="field-label">Email address</label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="you@company.com"
                  className="field-input"
                  autoComplete="email"
                />
                {errors.email && <p className="field-error">{errors.email.message}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="field-label" style={{ marginBottom: 0 }}>Password</label>
                  <Link href="/forgot-password" className="font-sans text-xs font-semibold text-[var(--color-brand)] hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="field-input pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-4)] hover:text-[var(--color-ink-2)] transition-colors"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="field-error">{errors.password.message}</p>}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isSubmitting}
                className="w-full mt-2"
              >
                Sign in
              </Button>
            </form>

            <p className="mt-5 text-center font-sans text-sm text-[var(--color-ink-3)]">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-semibold text-[var(--color-brand)] hover:underline">
                Request access
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
