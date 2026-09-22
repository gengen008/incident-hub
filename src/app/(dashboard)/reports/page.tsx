'use client'

// Department-head level reports — re-uses the admin reports component
// but scoped to the user's own department by RLS + profile.department_id
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/lib/hooks/useProfile'
import { isDeptHead, isAdmin } from '@/lib/auth'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import AdminReportsPage from '@/app/(dashboard)/admin/reports/page'

export default function DeptReportsPage() {
  const router = useRouter()
  const { profile, loading } = useProfile()

  useEffect(() => {
    if (loading) return
    if (!isDeptHead(profile?.role) && !isAdmin(profile?.role)) {
      router.replace('/dashboard')
    }
  }, [loading, profile, router])

  if (loading) return <PageLoader />
  // Render the same reports page — it auto-scopes by role + department_id
  return <AdminReportsPage />
}
