'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquarePlus, Search, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/hooks/useProfile'
import { useConversations } from '@/lib/hooks/useConversations'
import { getOrCreateDirectConversation } from '@/lib/chat'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { toastError } from '@/lib/toast'
import { timeAgo } from '@/lib/utils'
import type { Profile } from '@/types'

export default function ChatListPage() {
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const { conversations, loading } = useConversations(profile?.id)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [people, setPeople] = useState<Profile[]>([])
  const [search, setSearch] = useState('')
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!pickerOpen || people.length) return
    const supabase = createClient()
    supabase.from('profiles').select('id,full_name,job_title,role,department:departments(name,code)').eq('is_active', true).order('full_name')
      .then(({ data }) => setPeople((data as unknown as Profile[] ?? []).filter(p => p.id !== profile?.id)))
  }, [pickerOpen, people.length, profile?.id])

  const filtered = useMemo(() => people.filter(p =>
    !search || p.full_name.toLowerCase().includes(search.toLowerCase()) || (p.job_title ?? '').toLowerCase().includes(search.toLowerCase())
  ), [people, search])

  async function startChat(other: Profile) {
    if (!profile) return
    setStarting(true)
    try {
      const supabase = createClient()
      const id = await getOrCreateDirectConversation(supabase, profile.id, other.id)
      router.push(`/chat/${id}`)
    } catch (e) {
      toastError('Could not start chat', (e as Error).message)
      setStarting(false)
    }
  }

  if (profileLoading) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle="Direct conversations with colleagues across departments"
        action={<Button variant="primary" icon={<MessageSquarePlus className="h-4 w-4" />} onClick={() => setPickerOpen(true)}>New message</Button>}
      />

      {loading ? (
        <div className="panel p-4"><div className="skeleton h-64" /></div>
      ) : conversations.length === 0 ? (
        <div className="panel">
          <EmptyState icon={<MessageSquare className="h-6 w-6" />} title="No conversations yet"
            description="Start a direct message with a colleague."
            action={<Button variant="primary" size="sm" icon={<MessageSquarePlus className="h-4 w-4" />} onClick={() => setPickerOpen(true)}>New message</Button>} />
        </div>
      ) : (
        <div className="panel overflow-hidden">
          {conversations.map(c => (
            <button key={c.id} onClick={() => router.push(`/chat/${c.id}`)} className="conv-row w-full text-left">
              <Avatar name={c.display_name} url={c.other?.avatar_url} size="md" />
              <div className="conv-row-body">
                <div className="conv-row-top">
                  <span className="conv-row-name">{c.display_name}</span>
                  {c.last_message_at && <span className="conv-row-time">{timeAgo(c.last_message_at)}</span>}
                </div>
                <div className="conv-row-preview">{c.last_message_preview ?? 'No messages yet'}</div>
              </div>
              {c.unread ? <span className="conv-unread-dot" /> : null}
            </button>
          ))}
        </div>
      )}

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="New message">
        <div className="mb-3">
          <div className="filter-toolbar-search">
            <Search className="h-3.5 w-3.5" />
            <input type="text" placeholder="Search colleagues…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-col gap-1 max-h-[50vh] overflow-y-auto">
          {filtered.map(p => (
            <button key={p.id} onClick={() => startChat(p)} disabled={starting} className="flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-2 hover:bg-[var(--surface-page)] text-left transition-colors">
              <Avatar name={p.full_name} url={p.avatar_url} size="sm" />
              <div className="min-w-0">
                <p className="font-sans text-sm font-semibold text-[var(--color-ink)] truncate">{p.full_name}</p>
                <p className="font-sans text-xs text-[var(--color-ink-3)] truncate">{p.job_title}{(p.department as { name?: string } | undefined)?.name ? ` · ${(p.department as { name?: string }).name}` : ''}</p>
              </div>
            </button>
          ))}
          {filtered.length === 0 && <p className="text-center py-6 font-sans text-sm text-[var(--color-ink-3)]">No colleagues found.</p>}
        </div>
      </Modal>
    </div>
  )
}
