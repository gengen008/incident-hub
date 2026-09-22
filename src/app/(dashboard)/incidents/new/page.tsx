'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/hooks/useProfile'
import { toastError, toastSuccess } from '@/lib/toast'
import Button from '@/components/ui/Button'
import PageHeader from '@/components/ui/PageHeader'
import PhotoUpload from '@/components/incidents/PhotoUpload'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import type { Department, Profile } from '@/types'

const CATEGORIES = ['Equipment Failure','Software Issue','Maintenance','Safety','Process','HR','Facility','Security','Other']
const PRIORITIES = [
  { value: 'low',      label: 'Low',      color: 'oklch(55% 0.15 155)' },
  { value: 'medium',   label: 'Medium',   color: 'oklch(62% 0.16 248)' },
  { value: 'high',     label: 'High',     color: 'oklch(65% 0.17 65)' },
  { value: 'critical', label: 'Critical', color: 'oklch(52% 0.22 25)' },
]

const schema = z.object({
  title:            z.string().min(3, 'Title must be at least 3 characters').max(100),
  description:      z.string().min(10, 'Description must be at least 10 characters').max(500),
  category:         z.string().min(1, 'Select a category'),
  priority:         z.string().min(1, 'Select a priority'),
  department_id:    z.string().uuid('Select a department'),
  affected_systems: z.string().max(200).optional(),
  location:         z.string().max(200).optional(),
  assigned_to:      z.string().optional(),
  additional_notes: z.string().max(500).optional(),
})
type FormData = z.infer<typeof schema>

export default function NewIncidentPage() {
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  const [photos, setPhotos] = useState<File[]>([])
  const [photoError, setPhotoError] = useState('')
  const [created, setCreated] = useState<{ id: string; number: string } | null>(null)

  const { register, handleSubmit, control, formState: { errors, isSubmitting }, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'medium', category: 'Other' },
  })

  useEffect(() => {
    if (!profile) return
    async function load() {
      const supabase = createClient()
      const { data: depts } = await supabase.from('departments').select('*').eq('is_active', true).order('name')
      setDepartments((depts as Department[]) ?? [])
      if (profile?.department_id) setValue('department_id', profile.department_id)

      const { data: usrs } = await supabase
        .from('profiles')
        .select('id,full_name,role,department_id')
        .eq('is_active', true)
        .in('role', ['admin', 'department_head'])
        .order('full_name')
      setUsers((usrs as Profile[]) ?? [])
    }
    load()
  }, [profile, setValue])

  async function onSubmit(data: FormData) {
    setPhotoError('')
    if (photos.length === 0) { setPhotoError('At least one photo is required'); return }

    const supabase = createClient()

    // Create incident record
    const { data: inc, error: incErr } = await supabase
      .from('incidents')
      .insert({
        title:            data.title,
        description:      data.description,
        category:         data.category,
        priority:         data.priority,
        department_id:    data.department_id,
        affected_systems: data.affected_systems || null,
        location:         data.location || null,
        assigned_to:      data.assigned_to || null,
        reported_by:      profile!.id,
        incident_number:  '',
      })
      .select('id,incident_number')
      .single()

    if (incErr || !inc) {
      toastError('Failed to create incident', incErr?.message)
      return
    }

    // Upload photos
    const uploadErrors: string[] = []
    for (const file of photos) {
      const ext  = file.name.split('.').pop()
      const path = `${inc.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('incident-photos')
        .upload(path, file, { contentType: file.type })
      if (upErr) { uploadErrors.push(file.name); continue }

      const { data: { publicUrl } } = supabase.storage.from('incident-photos').getPublicUrl(path)
      await supabase.from('incident_photos').insert({
        incident_id: inc.id,
        photo_url:   publicUrl,
        file_name:   file.name,
        file_size:   file.size,
        uploaded_by: profile!.id,
      })
    }

    // Insert status history
    await supabase.from('incident_status_history').insert({
      incident_id: inc.id,
      old_status:  null,
      new_status:  'open',
      changed_by:  profile!.id,
      reason:      'Incident created',
    })

    if (uploadErrors.length) {
      toastError('Incident created but some photos failed to upload', uploadErrors.join(', '))
    } else {
      toastSuccess('Incident reported', `${inc.incident_number} created successfully`)
    }

    setCreated({ id: inc.id, number: inc.incident_number })
  }

  if (profileLoading) return <PageLoader />

  if (created) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="card text-center py-10">
          <CheckCircle2 className="h-14 w-14 text-[var(--color-success)] mx-auto mb-4" />
          <h2 className="font-display text-2xl font-extrabold text-[var(--color-ink)] tracking-tight mb-2">
            Incident Reported
          </h2>
          <p className="font-sans text-sm text-[var(--color-ink-3)] mb-1">Your incident has been logged successfully.</p>
          <p className="font-mono text-lg font-bold text-[var(--color-brand)] mb-6">{created.number}</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button variant="primary" onClick={() => router.push(`/incidents/${created.id}`)}>View Incident</Button>
            <Button variant="secondary" onClick={() => { setCreated(null); setPhotos([]) }}>Report Another</Button>
            <Button variant="ghost" onClick={() => router.push('/incidents')}>Back to List</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title="Report Incident" subtitle="Document a workplace incident with photos and details for immediate routing." />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="card space-y-5">
          <h3 className="font-display font-bold text-[var(--color-ink)]">Incident Details</h3>

          <div>
            <label className="field-label">Incident title <span className="text-[var(--color-danger)]">*</span></label>
            <input {...register('title')} className="field-input" placeholder="Brief description of what happened" maxLength={100} />
            {errors.title && <p className="field-error">{errors.title.message}</p>}
          </div>

          <div>
            <label className="field-label">Full description <span className="text-[var(--color-danger)]">*</span></label>
            <textarea {...register('description')} className="field-input" rows={4} placeholder="Describe the incident in detail — what happened, when, who was involved…" maxLength={500} style={{ resize: 'vertical' }} />
            {errors.description && <p className="field-error">{errors.description.message}</p>}
          </div>

          <div className="form-2col">
            <div>
              <label className="field-label">Category <span className="text-[var(--color-danger)]">*</span></label>
              <select {...register('category')} className="field-input">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <p className="field-error">{errors.category.message}</p>}
            </div>
            <div>
              <label className="field-label">Department <span className="text-[var(--color-danger)]">*</span></label>
              <select {...register('department_id')} className="field-input">
                <option value="">Select department…</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {errors.department_id && <p className="field-error">{errors.department_id.message}</p>}
            </div>
          </div>
        </div>

        {/* Priority */}
        <div className="card space-y-4">
          <h3 className="font-display font-bold text-[var(--color-ink)]">Priority Level</h3>
          <Controller
            name="priority"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PRIORITIES.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => field.onChange(p.value)}
                    className="flex flex-col items-center gap-2 rounded-[var(--radius-md)] border-2 p-3 transition-all text-center"
                    style={{
                      borderColor: field.value === p.value ? p.color : 'var(--border-default)',
                      background:  field.value === p.value ? `${p.color}15` : 'white',
                    }}
                  >
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ background: p.color, boxShadow: p.value === 'critical' ? `0 0 0 3px ${p.color}30` : 'none' }}
                    />
                    <span className="font-sans font-semibold text-sm" style={{ color: field.value === p.value ? p.color : 'var(--color-ink-2)' }}>
                      {p.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          />
        </div>

        {/* Additional fields */}
        <div className="card space-y-5">
          <h3 className="font-display font-bold text-[var(--color-ink)]">Location & Assignment</h3>

          <div className="form-2col">
            <div>
              <label className="field-label">Affected systems / equipment</label>
              <input {...register('affected_systems')} className="field-input" placeholder="e.g. POS Terminal #3, HVAC Unit" />
            </div>
            <div>
              <label className="field-label">Location</label>
              <input {...register('location')} className="field-input" placeholder="e.g. Floor 2, Store Room B" />
            </div>
          </div>

          <div>
            <label className="field-label">Assign to</label>
            <select {...register('assigned_to')} className="field-input">
              <option value="">Auto-assign / Unassigned</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.role.replace('_', ' ')})</option>)}
            </select>
          </div>

          <div>
            <label className="field-label">Additional notes</label>
            <textarea {...register('additional_notes')} className="field-input" rows={3} placeholder="Any additional context, steps taken, or observations…" maxLength={500} style={{ resize: 'vertical' }} />
          </div>
        </div>

        {/* Photos */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-[var(--color-ink)]">
              Photos <span className="text-[var(--color-danger)]">*</span>
            </h3>
            <span className="font-mono text-xs text-[var(--color-ink-3)]">{photos.length}/5</span>
          </div>
          <PhotoUpload files={photos} onChange={setPhotos} error={photoError} />
          {photoError && !photos.length && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-[var(--color-danger)]" />
              <p className="font-sans text-xs text-[var(--color-danger)]">{photoError}</p>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" variant="primary" size="lg" loading={isSubmitting}>
            Submit Incident Report
          </Button>
        </div>
      </form>
    </div>
  )
}
