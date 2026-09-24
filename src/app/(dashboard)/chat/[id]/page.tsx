'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Send, ImagePlus, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/hooks/useProfile'
import Avatar from '@/components/ui/Avatar'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { formatDate } from '@/lib/utils'
import type { Message, Profile, Conversation } from '@/types'

export default function ChatThreadPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const [conv, setConv] = useState<Conversation | null>(null)
  const [other, setOther] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const markRead = useCallback(async () => {
    if (!id || !profile) return
    const supabase = createClient()
    await supabase.from('conversation_members').update({ last_read_at: new Date().toISOString() }).eq('conversation_id', id).eq('user_id', profile.id)
  }, [id, profile])

  useEffect(() => {
    if (profileLoading || !profile || !id) return
    async function load() {
      const supabase = createClient()
      const [{ data: c }, { data: mem }, { data: msgs }] = await Promise.all([
        supabase.from('conversations').select('*').eq('id', id).single(),
        supabase.from('conversation_members').select('user:profiles(id,full_name,avatar_url,job_title)').eq('conversation_id', id).neq('user_id', profile!.id),
        supabase.from('messages').select('*, sender:profiles!sender_id(id,full_name,avatar_url)').eq('conversation_id', id).order('created_at', { ascending: true }).limit(200),
      ])
      setConv(c as Conversation)
      setOther(((mem as unknown as { user: Profile }[]) ?? [])[0]?.user ?? null)
      setMessages((msgs as unknown as Message[]) ?? [])
      setLoading(false)
      markRead()
    }
    load()
  }, [profileLoading, profile, id, markRead])

  // realtime
  useEffect(() => {
    if (!id || !profile) return
    const supabase = createClient()
    const channel = supabase
      .channel(`messages:${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, async payload => {
        const m = payload.new as Message
        // fetch sender name (payload doesn't include join)
        const { data: sender } = await supabase.from('profiles').select('id,full_name,avatar_url').eq('id', m.sender_id).single()
        setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, { ...m, sender: sender as Profile }])
        if (m.sender_id !== profile.id) markRead()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, profile, markRead])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function send(attachmentUrl?: string) {
    const body = text.trim() || (attachmentUrl ? '📷 Photo' : '')
    if (!body || !profile || !id || sending) return
    setText(''); setSending(true)
    const supabase = createClient()
    const { data, error } = await supabase.from('messages')
      .insert({ conversation_id: id, sender_id: profile.id, body, attachment_url: attachmentUrl ?? null })
      .select('*, sender:profiles!sender_id(id,full_name,avatar_url)').single()
    setSending(false)
    if (error) { setText(body === '📷 Photo' ? '' : body); return }
    setMessages(prev => prev.some(x => x.id === (data as Message).id) ? prev : [...prev, data as Message])
    markRead()
  }

  async function sendImage(files: FileList | null) {
    if (!files?.length || uploading) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', files[0])
    fd.append('folder', 'chat')
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (res.ok) await send(json.url)
    } catch { /* network error — leave composer as-is */ }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  if (profileLoading || loading) return <PageLoader />

  const title = conv?.type === 'group' ? (conv.title ?? 'Group chat') : (other?.full_name ?? 'Conversation')

  let lastDay = ''

  return (
    <div style={{ height: 'calc(100vh - var(--topbar-height) - 2.5rem)', display: 'flex', flexDirection: 'column' }} className="chat-thread card !p-0 overflow-hidden">
      <div className="chat-thread-header">
        <button onClick={() => router.push('/chat')} className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <Avatar name={title} url={other?.avatar_url} size="sm" />
        <div className="min-w-0">
          <p className="font-display font-bold text-sm text-[var(--color-ink)] truncate">{title}</p>
          {other?.job_title && <p className="font-sans text-xs text-[var(--color-ink-3)] truncate">{other.job_title}</p>}
        </div>
      </div>

      <div ref={scrollRef} className="chat-messages">
        {messages.length === 0 && <p className="text-center my-auto font-sans text-sm text-[var(--color-ink-3)]">No messages yet. Say hello 👋</p>}
        {messages.map(m => {
          const mine = m.sender_id === profile?.id
          const day = formatDate(m.created_at, 'dd MMM yyyy')
          const showDay = day !== lastDay
          lastDay = day
          const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          return (
            <div key={m.id}>
              {showDay && <div className="flex justify-center"><span className="msg-day-sep">{day}</span></div>}
              <div className={`msg-row ${mine ? 'me' : 'them'}`}>
                <div className="msg-bubble">
                  {!mine && conv?.type === 'group' && <div className="msg-sender">{(m.sender as Profile | undefined)?.full_name}</div>}
                  {m.attachment_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.attachment_url} alt="photo" className="mb-1.5 max-h-56 w-full cursor-pointer rounded-lg object-cover" onClick={() => setLightbox(m.attachment_url!)} />
                  )}
                  {(!m.attachment_url || m.body !== '📷 Photo') && m.body}
                  <div className="msg-meta">{time}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="chat-composer">
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={e => sendImage(e.target.files)} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-subtle)] text-[var(--color-brand)] disabled:opacity-40" aria-label="Send photo">
          {uploading ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <ImagePlus className="h-[18px] w-[18px]" />}
        </button>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          rows={1}
          placeholder="Type a message…"
        />
        <button onClick={() => send()} disabled={!text.trim() || sending} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand)] text-white disabled:opacity-40" aria-label="Send">
          <Send className="h-[18px] w-[18px]" />
        </button>
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25" onClick={() => setLightbox(null)}>
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="photo" className="max-h-[90vh] max-w-full rounded-lg object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}
