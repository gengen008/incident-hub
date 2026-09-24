import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX = 10 * 1024 * 1024 // 10MB

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file')
  const folder = (form.get('folder') as string) || 'misc'
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'Only JPG, PNG, WebP or GIF images are allowed' }, { status: 400 })
  if (file.size > MAX) return NextResponse.json({ error: 'Image must be under 10MB' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const safeFolder = folder.replace(/[^a-z0-9/_-]/gi, '')
  const path = `${safeFolder}/${user.id}-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`

  const admin = await createAdminClient()
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { error } = await admin.storage.from('attachments').upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const { data: pub } = admin.storage.from('attachments').getPublicUrl(path)
  return NextResponse.json({ url: pub.publicUrl, file_name: file.name, file_size: file.size })
}
