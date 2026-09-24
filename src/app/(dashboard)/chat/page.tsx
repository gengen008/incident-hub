'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/hooks/useProfile'
import { useConversations } from '@/lib/hooks/useConversations'
import { getOrCreateDirectConversation } from '@/lib/chat'
import Avatar from '@/components/ui/Avatar'
import PageHeader from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { toastError } from '@/lib/toast'
import { timeAgo } from '@/lib/utils'
import type { Profile } from '@/types'

interface DeptGroup {
  name: string
  code: string
  members: Profile[]
}

export default function ChatListPage() {
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const { conversations, loading } = useConversations(profile?.id)
  const [people, setPeople] = useState<Profile[]>([])
  const [peopleLoading, setPeopleLoading] = useState(true)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('profiles')
      .select('id,full_name,job_title,role,avatar_url,department:departments(name,code)')
      .eq('is_active', true)
      .order('full_name')
      .then(({ data }) => {
        setPeople((data as unknown as Profile[]) ?? [])
        setPeopleLoading(false)
      })
  }, [])

  // People I already have a conversation with (skip them in the directory below)
  const inConversation = useMemo(() => {
    const s = new Set<string>()
    for (const c of conversations) if (c.other?.id) s.add(c.other.id)
    return s
  }, [conversations])

  const groups: DeptGroup[] = useMemo(() => {
    const byDept: Record<string, DeptGroup> = {}
    for (const p of people) {
      if (p.id === profile?.id) continue
      const dept = p.department as { name?: string; code?: string } | undefined
      const name = dept?.name ?? 'No department'
      const code = dept?.code ?? '—'
      if (!byDept[name]) byDept[name] = { name, code, members: [] }
      byDept[name].members.push(p)
    }
    return Object.values(byDept).sort((a, b) => a.name.localeCompare(b.name))
  }, [people, profile?.id])

  async function startChat(other: Profile) {
    if (!profile || starting) return
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

  if (profileLoading || loading || peopleLoading) return <PageLoader />

  return (
    <div className="max-w-3xl">
      <PageHeader title="Messages" subtitle="Chat with anyone — every colleague is listed below by department" />

      {/* Active conversations */}
      {conversations.length > 0 && (
        <div className="mb-6">
          <div className="dash-section-ruler"><span>Conversations</span></div>
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
        </div>
      )}

      {/* Everyone, grouped by department */}
      <div className="dash-section-ruler"><span>All colleagues</span></div>
      <div className="space-y-3">
        {groups.map(g => {
          const isCollapsed = collapsed[g.name]
          return (
            <div key={g.name} className="panel overflow-hidden">
              <button
                onClick={() => setCollapsed(prev => ({ ...prev, [g.name]: !prev[g.name] }))}
                className="panel-header w-full cursor-pointer select-none"
              >
                <span className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-brand)] font-mono text-[0.65rem] font-bold text-white">{g.code}</span>
                  <span className="font-display font-bold text-sm text-[var(--color-ink)]">{g.name}</span>
                  <span className="font-mono text-xs text-[var(--color-ink-4)]">{g.members.length}</span>
                </span>
                <ChevronDown className={`h-4 w-4 text-[var(--color-ink-4)] transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
              </button>
              {!isCollapsed && g.members.map(p => (
                <button key={p.id} onClick={() => startChat(p)} disabled={starting} className="conv-row w-full text-left">
                  <Avatar name={p.full_name} url={p.avatar_url} size="md" />
                  <div className="conv-row-body">
                    <div className="conv-row-top">
                      <span className="conv-row-name">{p.full_name}</span>
                      {inConversation.has(p.id) && <span className="font-mono text-[0.6rem] text-[var(--color-ink-4)]">chatted</span>}
                    </div>
                    <div className="conv-row-preview">{p.job_title ?? '—'}</div>
                  </div>
                  <MessageSquare className="h-4 w-4 shrink-0 text-[var(--color-brand-light)]" />
                </button>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
