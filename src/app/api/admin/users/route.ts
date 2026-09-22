import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { email, password, full_name, role, department_id } = body

  if (!email || !password || !full_name) {
    return NextResponse.json({ error: 'email, password, and full_name are required' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const admin = await createAdminClient()
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await admin.from('profiles').update({
    full_name,
    role: role ?? 'user',
    ...(department_id ? { department_id } : {}),
  }).eq('id', created.user.id)

  return NextResponse.json({ id: created.user.id })
}
