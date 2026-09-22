'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Edit2, UserCheck, Download, Clock, MapPin,
  Cpu, AlertTriangle, ChevronDown, X, ZoomIn, FileText,
  Calendar, Hash, Building2, User, Flag
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/hooks/useProfile'
import { isAdmin, isDeptHead, canManageIncidents } from '@/lib/auth'
import { StatusBadge, PriorityBadge, RoleBadge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import ErrorState from '@/components/ui/ErrorState'
import CommentSection from '@/components/incidents/CommentSection'
import StatusTimeline from '@/components/incidents/StatusTimeline'
import { formatDateTime, formatDate, timeAgo, exportToCSV } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import type { Incident, IncidentStatus, IncidentPhoto, IncidentComment, IncidentStatusHistory, Profile, Department } from '@/types'

const STATUS_OPTIONS: { value: IncidentStatus; label: string; color: string }[] = [
  { value: 'open',        label: 'Open',        color: 'oklch(52% 0.22 25)' },
  { value: 'in_progress', label: 'In Progress', color: 'oklch(65% 0.17 65)' },
  { value: 'resolved',    label: 'Resolved',    color: 'oklch(55% 0.15 155)' },
  { value: 'closed',      label: 'Closed',      color: 'oklch(45% 0.02 264)' },
]

type FullIncident = Incident & {
  department: Department
  reporter: Profile
  assignee: Profile | null
  photos: IncidentPhoto[]
  comments: IncidentComment[]
  history: IncidentStatusHistory[]
}

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const [incident, setIncident] = useState<FullIncident | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  // Lightbox
  const [lightbox, setLightbox] = useState<{ url: string; name: string } | null>(null)

  // Status change modal
  const [statusModal, setStatusModal] = useState(false)
  const [newStatus, setNewStatus] = useState<IncidentStatus>('open')
  const [statusReason, setStatusReason] = useState('')
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)

  // Reassign modal
  const [reassignModal, setReassignModal] = useState(false)
  const [assignableUsers, setAssignableUsers] = useState<Profile[]>([])
  const [selectedUser, setSelectedUser] = useState('')
  const [savingAssign, setSavingAssign] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(false)
    const supabase = createClient()

    const { data, error: err } = await supabase
      .from('incidents')
      .select(`
        *,
        department:departments(*),
        reporter:profiles!reported_by(*),
        assignee:profiles!assigned_to(*),
        photos:incident_photos(*),
        comments:incident_comments(
          *,
          user:profiles(id,full_name,avatar_url,role)
        ),
        history:incident_status_history(
          *,
          changer:profiles!changed_by(full_name)
        )
      `)
      .eq('id', id)
      .single()

    if (err || !data) {
      setError(true)
      setLoading(false)
      return
    }

    // Sort history + comments
    const inc = data as unknown as FullIncident
    inc.history = [...inc.history].sort(
      (a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
    )
    inc.comments = [...inc.comments].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    setIncident(inc)
    setLoading(false)
  }, [id])

  useEffect(() => { if (!profileLoading) load() }, [profileLoading, load, reloadKey])

  // Load assignable users when reassign modal opens
  useEffect(() => {
    if (!reassignModal) return
    const supabase = createClient()
    supabase
      .from('profiles')
      .select('id,full_name,role,department_id')
      .eq('is_active', true)
      .in('role', ['admin', 'department_head'])
      .order('full_name')
      .then(({ data }) => setAssignableUsers((data as Profile[]) ?? []))
  }, [reassignModal])

  async function handleStatusChange() {
    if (!incident || !profile) return
    if (!statusReason.trim()) { toastError('Reason required', 'Please explain why the status is changing'); return }
    setSavingStatus(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('incidents')
      .update({
        status: newStatus,
        ...(newStatus === 'resolved' ? {
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes.trim() || statusReason.trim(),
        } : {}),
      })
      .eq('id', incident.id)

    if (error) { toastError('Update failed', error.message); setSavingStatus(false); return }

    await supabase.from('incident_status_history').insert({
      incident_id: incident.id,
      old_status:  incident.status,
      new_status:  newStatus,
      changed_by:  profile.id,
      reason:      statusReason.trim(),
    })

    toastSuccess('Status updated', `Incident is now ${newStatus.replace('_', ' ')}`)
    setStatusModal(false)
    setStatusReason('')
    setResolutionNotes('')
    setSavingStatus(false)
    setReloadKey(k => k + 1)
  }

  async function handleReassign() {
    if (!incident || !profile) return
    setSavingAssign(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('incidents')
      .update({ assigned_to: selectedUser || null })
      .eq('id', incident.id)
    if (error) { toastError('Reassign failed', error.message); setSavingAssign(false); return }
    toastSuccess('Incident reassigned')
    setReassignModal(false)
    setSavingAssign(false)
    setReloadKey(k => k + 1)
  }

  function handleExportCSV() {
    if (!incident) return
    exportToCSV([{
      'INC Number':      incident.incident_number,
      'Title':           incident.title,
      'Status':          incident.status,
      'Priority':        incident.priority,
      'Category':        incident.category,
      'Department':      incident.department?.name ?? '',
      'Reporter':        incident.reporter?.full_name ?? '',
      'Assigned To':     incident.assignee?.full_name ?? 'Unassigned',
      'Location':        incident.location ?? '',
      'Affected Systems':incident.affected_systems ?? '',
      'Description':     incident.description,
      'Created':         formatDateTime(incident.created_at),
      'Updated':         formatDateTime(incident.updated_at),
      'Resolved':        incident.resolved_at ? formatDateTime(incident.resolved_at) : '',
    }], `INC-${incident.incident_number}`)
  }

  if (profileLoading || loading) return <PageLoader />
  if (error || !incident) return (
    <ErrorState
      title="Incident not found"
      detail="This incident may not exist or you may not have access to view it."
      onRetry={() => setReloadKey(k => k + 1)}
    />
  )

  const canManage = canManageIncidents(profile?.role)
  const isOwner   = incident.reported_by === profile?.id
  const canEdit   = canManage || isOwner

  return (
    <>
      {/* Page header */}
      <PageHeader
        title={incident.incident_number}
        subtitle={incident.title}
        back
        action={
          <div className="flex items-center gap-2 flex-wrap">
            {canEdit && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Edit2 className="h-3.5 w-3.5" />}
                onClick={() => {
                  const next = STATUS_OPTIONS.find(s => s.value !== incident.status)?.value ?? 'open'
                  setNewStatus(incident.status)
                  setStatusModal(true)
                }}
              >
                Update Status
              </Button>
            )}
            {canManage && (
              <Button
                variant="secondary"
                size="sm"
                icon={<UserCheck className="h-3.5 w-3.5" />}
                onClick={() => { setSelectedUser(incident.assigned_to ?? ''); setReassignModal(true) }}
              >
                Reassign
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              icon={<Download className="h-3.5 w-3.5" />}
              onClick={handleExportCSV}
            >
              Export
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* ── Left column ── */}
        <div className="space-y-6 min-w-0">
          {/* Summary card */}
          <div className="card">
            {/* Status + priority row */}
            <div className="flex items-center gap-3 mb-5 flex-wrap">
              <StatusBadge status={incident.status} />
              <PriorityBadge priority={incident.priority} />
              <span className="badge badge-category">{incident.category}</span>
              <span className="font-mono text-xs text-[var(--color-ink-4)] ml-auto">{timeAgo(incident.created_at)}</span>
            </div>

            <h2 className="font-display text-xl font-extrabold tracking-tight text-[var(--color-ink)] mb-2">
              {incident.title}
            </h2>
            <p className="font-sans text-sm text-[var(--color-ink-2)] leading-relaxed whitespace-pre-wrap">
              {incident.description}
            </p>

            {incident.additional_notes && (
              <div className="mt-4 rounded-[var(--radius-md)] bg-[var(--surface-page)] border border-[var(--border-default)] px-4 py-3">
                <p className="font-sans text-xs font-semibold text-[var(--color-ink-3)] uppercase tracking-widest mb-1">Notes</p>
                <p className="font-sans text-sm text-[var(--color-ink-2)] whitespace-pre-wrap">{incident.additional_notes}</p>
              </div>
            )}
          </div>

          {/* Photos */}
          {incident.photos.length > 0 && (
            <div className="card">
              <div className="panel-header mb-4">
                <span className="font-display font-bold text-sm text-[var(--color-ink)]">
                  Evidence Photos <span className="font-mono text-xs text-[var(--color-ink-3)] ml-1">{incident.photos.length}</span>
                </span>
              </div>
              <div className="evidence-grid">
                {incident.photos.map(photo => (
                  <button
                    key={photo.id}
                    onClick={() => setLightbox({ url: photo.photo_url, name: photo.file_name ?? photo.id })}
                    className="group relative rounded-[var(--radius-md)] overflow-hidden border border-[var(--border-default)] aspect-square bg-[var(--color-ink-6)] block"
                    title={photo.file_name ?? undefined}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.photo_url} alt={photo.file_name ?? 'Evidence photo'} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/35 transition-colors">
                      <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="card">
            <div className="panel-header mb-5">
              <span className="font-display font-bold text-sm text-[var(--color-ink)]">Status History</span>
            </div>
            <StatusTimeline history={incident.history} />
          </div>

          {/* Comments */}
          <CommentSection
            incidentId={incident.id}
            comments={incident.comments}
            currentUser={profile}
            onCommentsChange={updated => setIncident(prev => prev ? { ...prev, comments: updated } : prev)}
          />
        </div>

        {/* ── Right column — metadata sidebar ── */}
        <div className="space-y-4">
          {/* Meta panel */}
          <div className="panel">
            <div className="panel-header">
              <span className="font-display font-bold text-xs text-[var(--color-ink)] uppercase tracking-wider">Incident Details</span>
            </div>
            <div className="divide-y divide-[var(--border-default)]">
              <MetaRow icon={<Hash className="h-3.5 w-3.5" />} label="INC Number">
                <span className="font-mono text-sm font-bold text-[var(--color-brand)]">{incident.incident_number}</span>
              </MetaRow>
              <MetaRow icon={<Flag className="h-3.5 w-3.5" />} label="Priority">
                <PriorityBadge priority={incident.priority} />
              </MetaRow>
              <MetaRow icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Status">
                <StatusBadge status={incident.status} />
              </MetaRow>
              <MetaRow icon={<Building2 className="h-3.5 w-3.5" />} label="Department">
                <span className="font-sans text-xs text-[var(--color-ink-2)]">{incident.department?.name ?? '—'}</span>
              </MetaRow>
              <MetaRow icon={<User className="h-3.5 w-3.5" />} label="Reporter">
                <div className="flex items-center gap-1.5">
                  <Avatar name={incident.reporter?.full_name} size="xs" />
                  <span className="font-sans text-xs text-[var(--color-ink-2)]">{incident.reporter?.full_name ?? '—'}</span>
                </div>
              </MetaRow>
              <MetaRow icon={<UserCheck className="h-3.5 w-3.5" />} label="Assigned To">
                {incident.assignee ? (
                  <div className="flex items-center gap-1.5">
                    <Avatar name={incident.assignee.full_name} size="xs" />
                    <span className="font-sans text-xs text-[var(--color-ink-2)]">{incident.assignee.full_name}</span>
                  </div>
                ) : (
                  <span className="font-sans text-xs text-[var(--color-ink-4)] italic">Unassigned</span>
                )}
              </MetaRow>
              <MetaRow icon={<Calendar className="h-3.5 w-3.5" />} label="Created">
                <span className="font-mono text-xs text-[var(--color-ink-3)]" title={formatDateTime(incident.created_at)}>{formatDate(incident.created_at)}</span>
              </MetaRow>
              {incident.resolved_at && (
                <MetaRow icon={<Calendar className="h-3.5 w-3.5" />} label="Resolved">
                  <span className="font-mono text-xs text-[var(--color-success)]" title={formatDateTime(incident.resolved_at)}>{formatDate(incident.resolved_at)}</span>
                </MetaRow>
              )}
              {incident.location && (
                <MetaRow icon={<MapPin className="h-3.5 w-3.5" />} label="Location">
                  <span className="font-sans text-xs text-[var(--color-ink-2)]">{incident.location}</span>
                </MetaRow>
              )}
              {incident.affected_systems && (
                <MetaRow icon={<Cpu className="h-3.5 w-3.5" />} label="Affected Systems">
                  <span className="font-sans text-xs text-[var(--color-ink-2)]">{incident.affected_systems}</span>
                </MetaRow>
              )}
            </div>
          </div>

          {/* Quick actions */}
          {canEdit && (
            <div className="panel">
              <div className="panel-header">
                <span className="font-display font-bold text-xs text-[var(--color-ink)] uppercase tracking-wider">Quick Actions</span>
              </div>
              <div className="p-3 space-y-2">
                {STATUS_OPTIONS.filter(s => s.value !== incident.status).map(s => (
                  <button
                    key={s.value}
                    onClick={() => { setNewStatus(s.value); setStatusModal(true) }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] text-sm font-sans font-medium transition-colors hover:bg-[var(--surface-page)] text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
                  >
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: s.color }} />
                    Mark as {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Report reporter */}
          <div className="panel">
            <div className="panel-header">
              <span className="font-display font-bold text-xs text-[var(--color-ink)] uppercase tracking-wider">Reported By</span>
            </div>
            <div className="p-4 flex items-center gap-3">
              <Avatar name={incident.reporter?.full_name} size="md" />
              <div className="min-w-0">
                <p className="font-sans font-semibold text-sm text-[var(--color-ink)] truncate">{incident.reporter?.full_name ?? '—'}</p>
                {incident.reporter?.role && (
                  <RoleBadge role={incident.reporter.role} />
                )}
                <p className="font-mono text-xs text-[var(--color-ink-4)] mt-1" title={formatDateTime(incident.created_at)}>
                  <Clock className="h-3 w-3 inline mr-1" />
                  {timeAgo(incident.created_at)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Lightbox Modal ── */}
      <Modal open={!!lightbox} onClose={() => setLightbox(null)} size="xl">
        {lightbox && (
          <div className="relative">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-default)]">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[var(--color-ink-3)]" />
                <span className="font-mono text-xs text-[var(--color-ink-3)] truncate max-w-xs">{lightbox.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={lightbox.url}
                  download={lightbox.name}
                  className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-ink-3)] hover:text-[var(--color-ink)] hover:bg-[var(--surface-page)] transition-colors"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
                <button
                  onClick={() => setLightbox(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-ink-3)] hover:text-[var(--color-ink)] hover:bg-[var(--surface-page)] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.url}
              alt={lightbox.name}
              className="w-full max-h-[80vh] object-contain bg-black/5"
            />
          </div>
        )}
      </Modal>

      {/* ── Status Change Modal ── */}
      <Modal open={statusModal} onClose={() => { setStatusModal(false); setStatusReason('') }} size="sm" title="Update Incident Status">
        <div className="p-5 space-y-5">
          <div>
            <label className="field-label">New Status <span className="text-[var(--color-danger)]">*</span></label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setNewStatus(s.value)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-[var(--radius-md)] border-2 transition-all text-left"
                  style={{
                    borderColor: newStatus === s.value ? s.color : 'var(--border-default)',
                    background:  newStatus === s.value ? `${s.color}18` : 'white',
                  }}
                >
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                  <span className="font-sans text-sm font-medium" style={{ color: newStatus === s.value ? s.color : 'var(--color-ink-2)' }}>
                    {s.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="field-label">Reason for change <span className="text-[var(--color-danger)]">*</span></label>
            <textarea
              value={statusReason}
              onChange={e => setStatusReason(e.target.value)}
              className="field-input"
              rows={3}
              placeholder="Briefly explain why the status is being updated…"
              style={{ resize: 'none' }}
            />
          </div>

          {newStatus === 'resolved' && (
            <div>
              <label className="field-label">Resolution Notes</label>
              <textarea
                value={resolutionNotes}
                onChange={e => setResolutionNotes(e.target.value)}
                className="field-input"
                rows={3}
                placeholder="How was this resolved? What was the root cause and fix?"
                style={{ resize: 'none' }}
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => { setStatusModal(false); setStatusReason('') }}>Cancel</Button>
            <Button
              variant="primary"
              loading={savingStatus}
              disabled={!statusReason.trim() || newStatus === incident.status}
              onClick={handleStatusChange}
            >
              Update Status
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Reassign Modal ── */}
      <Modal open={reassignModal} onClose={() => setReassignModal(false)} size="sm" title="Reassign Incident">
        <div className="p-5 space-y-5">
          <div>
            <label className="field-label">Assign to</label>
            <select
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
              className="field-input"
            >
              <option value="">Unassigned</option>
              {assignableUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.role.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setReassignModal(false)}>Cancel</Button>
            <Button variant="primary" loading={savingAssign} onClick={handleReassign}>
              Reassign
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

function MetaRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="text-[var(--color-ink-3)] mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-sans text-[10px] text-[var(--color-ink-4)] uppercase tracking-wider mb-0.5">{label}</p>
        {children}
      </div>
    </div>
  )
}
