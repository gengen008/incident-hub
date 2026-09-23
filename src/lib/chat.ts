import type { SupabaseClient } from '@supabase/supabase-js'

// Find an existing 1:1 conversation between two users, or create one.
// Returns the conversation id.
export async function getOrCreateDirectConversation(
  supabase: SupabaseClient,
  meId: string,
  otherId: string,
): Promise<string> {
  // My direct-conversation ids
  const { data: mine } = await supabase
    .from('conversation_members')
    .select('conversation_id, conversation:conversations!inner(type)')
    .eq('user_id', meId)

  const myDirectIds = ((mine as unknown as { conversation_id: string; conversation: { type: string } }[]) ?? [])
    .filter(r => r.conversation?.type === 'direct')
    .map(r => r.conversation_id)

  if (myDirectIds.length) {
    const { data: shared } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', otherId)
      .in('conversation_id', myDirectIds)
    if (shared && shared.length) return (shared[0] as { conversation_id: string }).conversation_id
  }

  // Create new direct conversation
  const { data: conv, error } = await supabase
    .from('conversations')
    .insert({ type: 'direct', created_by: meId })
    .select('id')
    .single()
  if (error || !conv) throw error ?? new Error('Could not create conversation')

  const convId = (conv as { id: string }).id
  const { error: memErr } = await supabase.from('conversation_members').insert([
    { conversation_id: convId, user_id: meId },
    { conversation_id: convId, user_id: otherId },
  ])
  if (memErr) throw memErr
  return convId
}
