'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/hooks/useProfile'
import Button from '@/components/ui/Button'
import PageHeader from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { toastError, toastSuccess } from '@/lib/toast'
import type { Department, Profile, RequestCategory, RequestPriority } from '@/types'

const CATEGORIES: RequestCategory[] = [
  'Cold Chain & Equipment', 'IT & Systems', 'Facilities & Maintenance', 'Procurement',
  'Logistics & Fleet', 'Inventory & Supplies', 'HR & Personnel', 'Finance & Payments',
  'Safety & Security', 'General',
]
const PRIORITIES: { value: RequestPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'oklch(55% 0.15 155)' },
  { value: 'medium', label: 'Medium', color: 'var(--color-accent)' },
  { value: 'high', label: 'High', color: 'oklch(65% 0.17 65)' },
  { value: 'urgent', label: 'Urgent', color: 'oklch(52% 0.22 25)' },
]

export default function NewRequestPage() {
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const [depts, setDepts] = useState<Department[]>([])
  const [members, setMembers] = useState<Profile[]>([])
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<RequestCategory>('General')
  const [priority, setPriority] = useState<RequestPriority>('medium')
  const [targetDept, setTargetDept] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [location, setLocation] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const supabase = createClient()
    supabase.from('departments').select('id,name,code').eq('is_active', true).order('name')
      .then(({ data }) => setDepts((data as Department[]) ?? []))
  }, [])

  useEffect(() => {
    if (!targetDept) { setMembers([]); return }
    const supabase = createClient()
    supabase.from('profiles').select('id,full_name,role,job_title').eq('department_id', targetDept).eq('is_active', true).order('full_name')
      .then(({ data }) => setMembers((data as Profile[]) ?? []))
    setAssignedTo('')
  }, [targetDept])

  async function submit() {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = 'Give the request a short title'
    if (!description.trim()) e.description = 'Describe what you need'
    if (!targetDept) e.targetDept = 'Choose the department to handle this'
    setErrors(e)
    if (Object.keys(e).length) return

    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase.from('requests').insert({
      title: title.trim(),
      description: description.trim(),
      category, priority,
      raised_by: profile!.id,
      raised_dept: profile!.department_id ?? null,
      target_dept: targetDept,
      assigned_to: assignedTo || null,
      location: location.trim() || null,
      due_date: dueDate || null,
    }).select('id').single()

    if (error) { toastError('Could not submit request', error.message); setSaving(false); return }

    await supabase.from('request_activity').insert({
      request_id: (data as { id: string }).id,
      actor_id: profile!.id,
      type: 'created',
      body: 'Request created',
    })

    toastSuccess('Request submitted')
    router.push(`/requests/${(data as { id: string }).id}`)
  }

  if (profileLoading) return <PageLoader />

  return (
    <div className="max-w-2xl">
      <PageHeader title="New Request" subtitle="Log a problem or ask another department for help" back />

      <div className="card mb-4">
        <h3 className="font-display font-bold text-[var(--color-ink)] mb-4">Details</h3>
        <div className="space-y-4">
          <div>
            <label className="field-label">Title <span className="text-[var(--color-danger)]">*</span></label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="field-input" placeholder="e.g. Cold room 2 compressor not cooling" />
            {errors.title && <p className="field-error">{errors.title}</p>}
          </div>
          <div>
            <label className="field-label">Description <span className="text-[var(--color-danger)]">*</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="field-input" rows={4} style={{ resize: 'vertical' }} placeholder="What is the problem or request? Include any relevant detail…" />
            {errors.description && <p className="field-error">{errors.description}</p>}
          </div>
          <div className="form-2col">
            <div>
              <label className="field-label">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value as RequestCategory)} className="field-input">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Send to department <span className="text-[var(--color-danger)]">*</span></label>
              <select value={targetDept} onChange={e => setTargetDept(e.target.value)} className="field-input">
                <option value="">Select department…</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {errors.targetDept && <p className="field-error">{errors.targetDept}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <h3 className="font-display font-bold text-[var(--color-ink)] mb-4">Priority</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRIORITIES.map(p => (
            <button key={p.value} type="button" onClick={() => setPriority(p.value)}
              className="flex items-center justify-center gap-2 rounded-[var(--radius-md)] border-2 px-3 py-3 transition-all"
              style={{ borderColor: priority === p.value ? p.color : 'var(--border-default)', background: priority === p.value ? `${p.color}14` : 'white' }}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
              <span className="font-sans text-sm font-semibold" style={{ color: priority === p.value ? p.color : 'var(--color-ink-2)' }}>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card mb-6">
        <h3 className="font-display font-bold text-[var(--color-ink)] mb-4">Assignment &amp; details <span className="font-sans text-xs font-normal text-[var(--color-ink-4)]">(optional)</span></h3>
        <div className="space-y-4">
          <div>
            <label className="field-label">Assign to a specific person</label>
            <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className="field-input" disabled={!targetDept}>
              <option value="">{targetDept ? 'Leave for the department to pick up' : 'Choose a department first'}</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.full_name}{m.job_title ? ` — ${m.job_title}` : ''}</option>)}
            </select>
          </div>
          <div className="form-2col">
            <div>
              <label className="field-label">Location</label>
              <input value={location} onChange={e => setLocation(e.target.value)} className="field-input" placeholder="e.g. Tema cold store, Bay 3" />
            </div>
            <div>
              <label className="field-label">Needed by</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="field-input" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
        <Button variant="primary" loading={saving} icon={<Send className="h-4 w-4" />} onClick={submit}>Submit Request</Button>
      </div>
    </div>
  )
}
