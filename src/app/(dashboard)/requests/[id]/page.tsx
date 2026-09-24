'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Hash, Flag, Building2, User, UserCheck, Calendar, MapPin, Tag,
  Edit2, MessageSquare, Send, Clock, CheckCircle2, ArrowRightLeft, ImagePlus, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/hooks/useProfile'
import { isAdmin } from '@/lib/auth'
import { getOrCreateDirectConversation } from '@/lib/chat'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import Modal from '@/components/ui/Modal'
import ImageUpload, { type UploadedImage } from '@/components/ui/ImageUpload'
import PageHeader from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import ErrorState from '@/components/ui/ErrorState'
import { formatDateTime, formatDate, timeAgo, statusLabel } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import type { Request, RequestActivity, RequestStatus, Profile, RequestAttachment } from '@/types'

const STATUS_OPTIONS: { value: RequestStatus; label: string; color: string }[] = [
  { value: 'open', label: 'Open', color: 'oklch(52% 0.22 25)' },
  { value: 'in_progress', label: 'In Progress', color: 'oklch(65% 0.17 65)' },
  { value: 'on_hold', label: 'On Hold', color: 'oklch(60% 0.03 264)' },
  { value: 'resolved', label: 'Resolved', color: 'oklch(55% 0.15 155)' },
  { value: 'closed', label: 'Closed', color: 'var(--color-ink-4)' },
]

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const [req, setReq] = useState<Request | null>(null)
  const [activity, setActivity] = useState<RequestActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const [statusModal, setStatusModal] = useState(false)
  const [newStatus, setNewStatus] = useState<RequestStatus>('in_progress')
  const [reason, setReason] = useState('')
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)

  const [reassignModal, setReassignModal] = useState(false)
  const [members, setMembers] = useState<Profile[]>([])
  const [selectedUser, setSelectedUser] = useState('')
  const [savingAssign, setSavingAssign] = useState(false)

  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const [messaging, setMessaging] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [addPhotos, setAddPhotos] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true); setError(false)
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('requests')
      .select(`*,
        raiser:profiles!raised_by(id,full_name,job_title,role,department_id),
        assignee:profiles!assigned_to(id,full_name,job_title,role),
        target_department:departments!target_dept(id,name,code),
        raised_department:departments!raised_dept(id,name,code),
        attachments:request_attachments(*),
        activity:request_activity(*, actor:profiles!actor_id(id,full_name,avatar_url,role))`)
      .eq('id', id).single()
    if (err || !data) { setError(true); setLoading(false); return }
    const r = data as unknown as Request
    const acts = [...(r.activity ?? [])].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    setReq(r); setActivity(acts); setLoading(false)
  }, [id])

  useEffect(() => { if (!profileLoading) load() }, [profileLoading, load, reloadKey])

  useEffect(() => {
    if (!reassignModal || !req) return
    const supabase = createClient()
    supabase.from('profiles').select('id,full_name,role,job_title').eq('department_id', req.target_dept).eq('is_active', true).order('full_name')
      .then(({ data }) => setMembers((data as Profile[]) ?? []))
  }, [reassignModal, req])

  async function saveStatus() {
    if (!req || !profile) return
    if (!reason.trim()) { toastError('Reason required', 'Briefly say why the status is changing'); return }
    setSavingStatus(true)
    const supabase = createClient()
    const { error } = await supabase.from('requests').update({
      status: newStatus,
      ...(newStatus === 'resolved' ? { resolved_at: new Date().toISOString(), resolution_notes: resolutionNotes.trim() || reason.trim() } : {}),
    }).eq('id', req.id)
    if (error) { toastError('Update failed', error.message); setSavingStatus(false); return }
    await supabase.from('request_activity').insert({
      request_id: req.id, actor_id: profile.id, type: 'status_change',
      from_status: req.status, to_status: newStatus, body: reason.trim(),
    })
    toastSuccess('Status updated')
    setStatusModal(false); setReason(''); setResolutionNotes(''); setSavingStatus(false); setReloadKey(k => k + 1)
  }

  async function saveAssign() {
    if (!req || !profile) return
    setSavingAssign(true)
    const supabase = createClient()
    const { error } = await supabase.from('requests').update({ assigned_to: selectedUser || null }).eq('id', req.id)
    if (error) { toastError('Reassign failed', error.message); setSavingAssign(false); return }
    const who = members.find(m => m.id === selectedUser)
    await supabase.from('request_activity').insert({
      request_id: req.id, actor_id: profile.id, type: 'assignment',
      body: who ? `Assigned to ${who.full_name}` : 'Unassigned',
    })
    toastSuccess('Request reassigned')
    setReassignModal(false); setSavingAssign(false); setReloadKey(k => k + 1)
  }

  async function sendComment() {
    if (!comment.trim() || !req || !profile) return
    setSending(true)
    const supabase = createClient()
    const { data, error } = await supabase.from('request_activity').insert({
      request_id: req.id, actor_id: profile.id, type: 'comment', body: comment.trim(),
    }).select('*, actor:profiles!actor_id(id,full_name,avatar_url,role)').single()
    setSending(false)
    if (error) { toastError('Could not post', error.message); return }
    setActivity(prev => [...prev, data as RequestActivity])
    setComment('')
  }

  async function savePhotos(images: UploadedImage[]) {
    if (!req || !profile || !images.length) return
    const supabase = createClient()
    const { error } = await supabase.from('request_attachments').insert(
      images.map(p => ({ request_id: req.id, url: p.url, file_name: p.file_name ?? null, file_size: p.file_size ?? null, uploaded_by: profile.id }))
    )
    if (error) { toastError('Could not attach photos', error.message); return }
    toastSuccess('Photos added')
    setAddPhotos(false)
    setReloadKey(k => k + 1)
  }

  async function messagePerson(otherId?: string | null) {
    if (!otherId || !profile) return
    setMessaging(true)
    try {
      const supabase = createClient()
      const convId = await getOrCreateDirectConversation(supabase, profile.id, otherId)
      router.push(`/chat/${convId}`)
    } catch (e) {
      toastError('Could not open chat', (e as Error).message)
      setMessaging(false)
    }
  }

  if (profileLoading || loading) return <PageLoader />
  if (error || !req) return <ErrorState title="Request not found" detail="It may not exist or you may not have access." onRetry={() => setReloadKey(k => k + 1)} />

  const raiser = req.raiser as Profile | undefined
  const assignee = req.assignee as Profile | null | undefined
  const canManage = isAdmin(profile?.role) || assignee?.id === profile?.id || (profile?.department_id && profile.department_id === req.target_dept)
  const isOwner = req.raised_by === profile?.id

  return (
    <>
      <PageHeader
        title={req.request_number}
        subtitle={req.title}
        back
        action={
          <div className="flex items-center gap-2 flex-wrap">
            {(canManage || isOwner) && (
              <Button variant="secondary" size="sm" icon={<Edit2 className="h-3.5 w-3.5" />} onClick={() => { setNewStatus(req.status); setStatusModal(true) }}>Update Status</Button>
            )}
            {canManage && (
              <Button variant="secondary" size="sm" icon={<ArrowRightLeft className="h-3.5 w-3.5" />} onClick={() => { setSelectedUser(req.assigned_to ?? ''); setReassignModal(true) }}>Reassign</Button>
            )}
          </div>
        }
      />

      <div className="incident-view-grid">
        {/* Left */}
        <div className="space-y-6 min-w-0">
          <div className="card">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <StatusBadge status={req.status} />
              <PriorityBadge priority={req.priority} />
              <span className="badge badge-staff">{req.category}</span>
              <span className="font-mono text-xs text-[var(--color-ink-4)] ml-auto">{timeAgo(req.created_at)}</span>
            </div>
            <h2 className="font-display text-xl font-extrabold tracking-tight text-[var(--color-ink)] mb-2">{req.title}</h2>
            <p className="font-sans text-sm text-[var(--color-ink-2)] leading-relaxed whitespace-pre-wrap">{req.description}</p>
            {req.resolution_notes && (
              <div className="mt-4 rounded-[var(--radius-md)] border border-[oklch(90%_0.04_155)] bg-[oklch(97%_0.03_155)] px-4 py-3">
                <p className="font-sans text-xs font-bold uppercase tracking-wider text-[oklch(45%_0.15_155)] mb-1 flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Resolution</p>
                <p className="font-sans text-sm text-[var(--color-ink-2)] whitespace-pre-wrap">{req.resolution_notes}</p>
              </div>
            )}
          </div>

          {/* Photos */}
          <div className="panel">
            <div className="panel-header">
              <span className="font-display font-bold text-sm text-[var(--color-ink)]">
                Photos {((req.attachments as RequestAttachment[] | undefined)?.length ?? 0) > 0 && <span className="font-mono text-xs text-[var(--color-ink-3)] ml-1">{(req.attachments as RequestAttachment[]).length}</span>}
              </span>
              <button onClick={() => setAddPhotos(true)} className="panel-view-all-btn"><ImagePlus className="h-3.5 w-3.5" /> Add photos</button>
            </div>
            {((req.attachments as RequestAttachment[] | undefined)?.length ?? 0) === 0 ? (
              <p className="px-4 py-6 text-center font-sans text-sm text-[var(--color-ink-3)]">No photos attached yet.</p>
            ) : (
              <div className="evidence-grid p-4">
                {(req.attachments as RequestAttachment[]).map(a => (
                  <button key={a.id} onClick={() => setLightbox(a.url)} className="relative rounded-[var(--radius-md)] overflow-hidden border border-[var(--border-default)] aspect-square bg-[var(--color-ink-6)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.url} alt={a.file_name ?? 'photo'} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Activity + comments */}
          <div className="panel">
            <div className="panel-header">
              <span className="font-display font-bold text-sm text-[var(--color-ink)]">Activity &amp; discussion</span>
            </div>
            <div className="p-4 space-y-4">
              {activity.length === 0 && <p className="text-center py-6 font-sans text-sm text-[var(--color-ink-3)]">No activity yet.</p>}
              {activity.map(a => <ActivityItem key={a.id} a={a} />)}
            </div>
            <div className="px-4 py-4 border-t border-[var(--border-default)] bg-[var(--surface-page)]">
              <div className="flex items-end gap-3">
                <Avatar name={profile?.full_name} size="sm" />
                <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendComment() }}
                  placeholder="Add a comment… (Ctrl+Enter to send)" className="field-input text-sm flex-1" style={{ resize: 'none' }} />
                <Button variant="primary" size="sm" loading={sending} disabled={!comment.trim()} icon={<Send className="h-3.5 w-3.5" />} onClick={sendComment}>Send</Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <div className="panel">
            <div className="panel-header"><span className="font-display font-bold text-xs uppercase tracking-wider text-[var(--color-ink)]">Details</span></div>
            <div className="divide-y divide-[var(--border-default)]">
              <Meta icon={<Hash className="h-3.5 w-3.5" />} label="Request No."><span className="font-mono text-sm font-bold text-[var(--color-brand)]">{req.request_number}</span></Meta>
              <Meta icon={<Tag className="h-3.5 w-3.5" />} label="Category"><span className="font-sans text-xs text-[var(--color-ink-2)]">{req.category}</span></Meta>
              <Meta icon={<Flag className="h-3.5 w-3.5" />} label="Priority"><PriorityBadge priority={req.priority} /></Meta>
              <Meta icon={<Building2 className="h-3.5 w-3.5" />} label="Handled by">
                <span className="font-sans text-xs text-[var(--color-ink-2)]">{(req.target_department as { name?: string } | undefined)?.name ?? '—'}</span>
              </Meta>
              <Meta icon={<User className="h-3.5 w-3.5" />} label="Raised by">
                <div className="flex items-center gap-1.5">
                  <Avatar name={raiser?.full_name} size="xs" />
                  <span className="font-sans text-xs text-[var(--color-ink-2)]">{raiser?.full_name ?? '—'}</span>
                </div>
              </Meta>
              <Meta icon={<UserCheck className="h-3.5 w-3.5" />} label="Assigned to">
                {assignee ? (
                  <div className="flex items-center gap-1.5"><Avatar name={assignee.full_name} size="xs" /><span className="font-sans text-xs text-[var(--color-ink-2)]">{assignee.full_name}</span></div>
                ) : <span className="font-sans text-xs italic text-[var(--color-ink-4)]">Unassigned</span>}
              </Meta>
              {req.location && <Meta icon={<MapPin className="h-3.5 w-3.5" />} label="Location"><span className="font-sans text-xs text-[var(--color-ink-2)]">{req.location}</span></Meta>}
              {req.due_date && <Meta icon={<Calendar className="h-3.5 w-3.5" />} label="Needed by"><span className="font-mono text-xs text-[var(--color-ink-2)]">{formatDate(req.due_date)}</span></Meta>}
              <Meta icon={<Clock className="h-3.5 w-3.5" />} label="Created"><span className="font-mono text-xs text-[var(--color-ink-3)]" title={formatDateTime(req.created_at)}>{formatDate(req.created_at)}</span></Meta>
            </div>
          </div>

          {/* Contact actions */}
          <div className="panel">
            <div className="panel-header"><span className="font-display font-bold text-xs uppercase tracking-wider text-[var(--color-ink)]">Talk to</span></div>
            <div className="p-3 space-y-2">
              {raiser && raiser.id !== profile?.id && (
                <button onClick={() => messagePerson(raiser.id)} disabled={messaging} className="w-full flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] text-sm font-medium text-[var(--color-ink-2)] hover:bg-[var(--surface-page)] hover:text-[var(--color-brand)] transition-colors">
                  <MessageSquare className="h-4 w-4" /> Message {raiser.full_name?.split(' ')[0]} (raiser)
                </button>
              )}
              {assignee && assignee.id !== profile?.id && (
                <button onClick={() => messagePerson(assignee.id)} disabled={messaging} className="w-full flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] text-sm font-medium text-[var(--color-ink-2)] hover:bg-[var(--surface-page)] hover:text-[var(--color-brand)] transition-colors">
                  <MessageSquare className="h-4 w-4" /> Message {assignee.full_name?.split(' ')[0]} (assignee)
                </button>
              )}
              {(!raiser || raiser.id === profile?.id) && (!assignee || assignee.id === profile?.id) && (
                <p className="px-3 py-2 font-sans text-xs text-[var(--color-ink-4)]">No one else to message on this request yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status modal */}
      <Modal open={statusModal} onClose={() => { setStatusModal(false); setReason('') }} size="sm" title="Update status">
        <div className="space-y-5">
          <div>
            <label className="field-label">New status</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {STATUS_OPTIONS.map(s => (
                <button key={s.value} type="button" onClick={() => setNewStatus(s.value)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-[var(--radius-md)] border-2 text-left transition-all"
                  style={{ borderColor: newStatus === s.value ? s.color : 'var(--border-default)', background: newStatus === s.value ? `${s.color}18` : 'white' }}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="font-sans text-sm font-medium" style={{ color: newStatus === s.value ? s.color : 'var(--color-ink-2)' }}>{s.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="field-label">Reason <span className="text-[var(--color-danger)]">*</span></label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} className="field-input" rows={3} style={{ resize: 'none' }} placeholder="Why is the status changing?" />
          </div>
          {newStatus === 'resolved' && (
            <div>
              <label className="field-label">Resolution notes</label>
              <textarea value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} className="field-input" rows={3} style={{ resize: 'none' }} placeholder="What was done to resolve it?" />
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => { setStatusModal(false); setReason('') }}>Cancel</Button>
            <Button variant="primary" loading={savingStatus} disabled={!reason.trim() || newStatus === req.status} onClick={saveStatus}>Update</Button>
          </div>
        </div>
      </Modal>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25" onClick={() => setLightbox(null)}>
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="attachment" className="max-h-[90vh] max-w-full rounded-lg object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Add photos modal */}
      <Modal open={addPhotos} onClose={() => setAddPhotos(false)} size="md" title="Add photos">
        <AddPhotosBody onSave={savePhotos} onCancel={() => setAddPhotos(false)} />
      </Modal>

      {/* Reassign modal */}
      <Modal open={reassignModal} onClose={() => setReassignModal(false)} size="sm" title="Reassign request">
        <div className="space-y-5">
          <div>
            <label className="field-label">Assign to (in {(req.target_department as { name?: string } | undefined)?.name})</label>
            <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="field-input">
              <option value="">Unassigned</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.full_name}{m.job_title ? ` — ${m.job_title}` : ''}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setReassignModal(false)}>Cancel</Button>
            <Button variant="primary" loading={savingAssign} onClick={saveAssign}>Reassign</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

function AddPhotosBody({ onSave, onCancel }: { onSave: (imgs: UploadedImage[]) => void; onCancel: () => void }) {
  const [images, setImages] = useState<UploadedImage[]>([])
  return (
    <div className="space-y-4">
      <ImageUpload value={images} onChange={setImages} folder="requests" maxFiles={6} />
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" disabled={!images.length} onClick={() => onSave(images)}>Attach {images.length > 0 ? `(${images.length})` : ''}</Button>
      </div>
    </div>
  )
}

function Meta({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="text-[var(--color-ink-3)] mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-sans text-[10px] uppercase tracking-wider text-[var(--color-ink-4)] mb-0.5">{label}</p>
        {children}
      </div>
    </div>
  )
}

function ActivityItem({ a }: { a: RequestActivity }) {
  const actor = a.actor as Profile | undefined
  if (a.type === 'comment') {
    return (
      <div className="flex items-start gap-3">
        <Avatar name={actor?.full_name} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-sans text-sm font-bold text-[var(--color-ink)]">{actor?.full_name ?? 'Unknown'}</span>
            <span className="font-mono text-[10px] text-[var(--color-ink-4)]" title={formatDateTime(a.created_at)}>{timeAgo(a.created_at)}</span>
          </div>
          <p className="prose-comment">{a.body}</p>
        </div>
      </div>
    )
  }
  // status_change / assignment / created — rendered as a system line
  let text = a.body ?? ''
  if (a.type === 'status_change') text = `changed status ${a.from_status ? `from ${statusLabel(a.from_status)} ` : ''}to ${statusLabel(a.to_status ?? '')}`
  if (a.type === 'created') text = 'created this request'
  return (
    <div className="flex items-center gap-3 pl-1">
      <span className="h-2 w-2 rounded-full bg-[var(--color-brand-light)] shrink-0" />
      <p className="font-sans text-xs text-[var(--color-ink-3)]">
        <span className="font-semibold text-[var(--color-ink-2)]">{actor?.full_name ?? 'Someone'}</span> {text}
        {a.type === 'status_change' && a.body ? ` — “${a.body}”` : ''}
        <span className="text-[var(--color-ink-4)]"> · {timeAgo(a.created_at)}</span>
      </p>
    </div>
  )
}
