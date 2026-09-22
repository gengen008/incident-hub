'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (mounted) { setProfile(null); setLoading(false) } return }
      const { data, error } = await supabase
        .from('profiles')
        .select('*, department:departments(id,name,code)')
        .eq('id', user.id)
        .single()
      if (mounted) {
        if (error) setError(error.message)
        else setProfile(data as Profile)
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  return { profile, loading, error }
}
