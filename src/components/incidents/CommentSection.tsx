'use client'

import { useState } from 'react'
import { Send, Edit2, Trash2, Check, X } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import { timeAgo, formatDateTime } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import { createClient } from '@/lib/supabase/client'
import type { IncidentComment, Profile } from '@/types'

interface CommentSectionProps {
  incidentId: string
  comments: IncidentComment[]
  currentUser?: Profile | null
  onCommentsChange: (comments: IncidentComment[]) => void
}

export default function CommentSection({ incidentId, comments, currentUser, onCommentsChange }: CommentSectionProps) {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  async function submitComment() {
    if (!input.trim() || !currentUser) return
    setSending(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('incident_comments')
      .insert({ incident_id: incidentId, user_id: currentUser.id, content: input.trim() })
      .select('*, user:profiles(id,full_name,avatar_url,role)')
      .single()
    setSending(false)
    if (error) { toastError('Failed to add comment', error.message); return }
    setInput('')
    onCommentsChange([...comments, data as IncidentComment])
  }

  async function startEdit(c: IncidentComment) {
    // Only allow editing within 5 minutes
    const diffMin = (Date.now() - new Date(c.created_at).getTime()) / 60000
    if (diffMin > 5) { toastError('Cannot edit', 'Comments can only be edited within 5 minutes of posting'); return }
    setEditingId(c.id)
    setEditContent(c.content)
  }

  async function saveEdit(id: string) {
    if (!editContent.trim()) return
    const supabase = createClient()
    const { error } = await supabase
      .from('incident_comments')
      .update({ content: editContent.trim() })
      .eq('id', id)
    if (error) { toastError('Failed to update comment', error.message); return }
    onCommentsChange(comments.map(c => c.id === id ? { ...c, content: editContent.trim() } : c))
    setEditingId(null)
    toastSuccess('Comment updated')
  }

  async function deleteComment(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('incident_comments').update({ is_deleted: true }).eq('id', id)
    if (error) { toastError('Failed to delete comment', error.message); return }
    onCommentsChange(comments.map(c => c.id === id ? { ...c, is_deleted: true } : c))
    toastSuccess('Comment removed')
  }

  const visible = comments.filter(c => !c.is_deleted)

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="font-display font-bold text-sm text-[var(--color-ink)]">
          Comments <span className="font-mono text-xs text-[var(--color-ink-3)] ml-1">{visible.length}</span>
        </span>
      </div>

      <div className="divide-y divide-[var(--border-default)]">
        {visible.length === 0 && (
          <div className="px-5 py-8 text-center">
            <p className="font-sans text-sm text-[var(--color-ink-3)]">No comments yet. Add the first one below.</p>
          </div>
        )}
        {visible.map(c => {
          const user = c.user as (Profile & { avatar_url?: string }) | undefined
          const isOwn = c.user_id === currentUser?.id
          const isEditing = editingId === c.id
          return (
            <div key={c.id} className="px-5 py-4">
              <div className="flex items-start gap-3">
                <Avatar name={user?.full_name} url={user?.avatar_url} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-sans text-sm font-bold text-[var(--color-ink)]">{user?.full_name ?? 'Unknown'}</span>
                    <span className="font-mono text-[10px] text-[var(--color-ink-4)]" title={formatDateTime(c.created_at)}>{timeAgo(c.created_at)}</span>
                    {c.updated_at !== c.created_at && <span className="font-sans text-[10px] text-[var(--color-ink-4)] italic">edited</span>}
                  </div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        className="field-input text-sm"
                        rows={3}
                        style={{ resize: 'vertical' }}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="primary" icon={<Check className="h-3 w-3" />} onClick={() => saveEdit(c.id)}>Save</Button>
                        <Button size="sm" variant="ghost" icon={<X className="h-3 w-3" />} onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="prose-comment">{c.content}</p>
                  )}
                </div>
                {isOwn && !isEditing && (
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                    <button onClick={() => startEdit(c)} className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-ink-4)] hover:text-[var(--color-brand)] hover:bg-[var(--color-brand-subtle)] transition-colors" title="Edit">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => deleteComment(c.id)} className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-ink-4)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] transition-colors" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Input */}
      <div className="px-5 py-4 border-t border-[var(--border-default)] bg-[var(--surface-page)]">
        <div className="flex items-end gap-3">
          <Avatar name={currentUser?.full_name} size="sm" />
          <div className="flex-1">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitComment() }}
              placeholder="Add a comment… (Ctrl+Enter to submit)"
              className="field-input text-sm"
              rows={2}
              style={{ resize: 'none' }}
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            loading={sending}
            disabled={!input.trim()}
            icon={<Send className="h-3.5 w-3.5" />}
            onClick={submitComment}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}
