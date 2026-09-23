'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Conversation, Profile } from '@/types'

export function useConversations(userId?: string) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId) return
    const supabase = createClient()
    const { data: mem } = await supabase
      .from('conversation_members')
      .select('conversation_id, last_read_at, conversation:conversations!inner(id,type,title,last_message_at,last_message_preview,updated_at)')
      .eq('user_id', userId)
    if (!mem) { setLoading(false); return }

    const rows = mem as unknown as {
      conversation_id: string; last_read_at: string
      conversation: Conversation
    }[]
    const convIds = rows.map(r => r.conversation_id)

    // other members (for naming direct chats + avatars)
    const otherByConv: Record<string, Profile> = {}
    if (convIds.length) {
      const { data: others } = await supabase
        .from('conversation_members')
        .select('conversation_id, user:profiles(id,full_name,avatar_url,job_title)')
        .in('conversation_id', convIds)
        .neq('user_id', userId)
      for (const o of (others as unknown as { conversation_id: string; user: Profile }[]) ?? []) {
        if (!otherByConv[o.conversation_id]) otherByConv[o.conversation_id] = o.user
      }
    }

    const list: Conversation[] = rows.map(r => {
      const c = r.conversation
      const other = otherByConv[r.conversation_id] ?? null
      const unread = c.last_message_at && new Date(c.last_message_at) > new Date(r.last_read_at) ? 1 : 0
      return {
        ...c,
        other,
        display_name: c.type === 'group' ? (c.title ?? 'Group chat') : (other?.full_name ?? 'Conversation'),
        unread,
      }
    })
    list.sort((a, b) => new Date(b.last_message_at ?? b.updated_at).getTime() - new Date(a.last_message_at ?? a.updated_at).getTime())
    setConversations(list)
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!userId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`conv-list:${userId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, () => load())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_members', filter: `user_id=eq.${userId}` }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, load])

  return { conversations, loading, refresh: load }
}
