'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// Counts conversations that have a message newer than the member's last_read_at.
export function useUnreadMessages(userId?: string) {
  const [count, setCount] = useState(0)

  const refresh = useCallback(async () => {
    if (!userId) return
    const supabase = createClient()
    const { data } = await supabase
      .from('conversation_members')
      .select('last_read_at, conversation:conversations!inner(last_message_at)')
      .eq('user_id', userId)
    if (!data) return
    const unread = (data as unknown as { last_read_at: string; conversation: { last_message_at: string | null } }[])
      .filter(m => m.conversation?.last_message_at && new Date(m.conversation.last_message_at) > new Date(m.last_read_at))
      .length
    setCount(unread)
  }, [userId])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    if (!userId) return
    const supabase = createClient()
    // Any conversation I belong to that gets bumped (new message) triggers a refresh.
    const channel = supabase
      .channel(`unread:${userId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, () => refresh())
      .subscribe()
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => { supabase.removeChannel(channel); window.removeEventListener('focus', onFocus) }
  }, [userId, refresh])

  return { count, refresh }
}
