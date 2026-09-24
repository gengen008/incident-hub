'use client'

import { useCallback, useState } from 'react'
import { Camera, X, ImagePlus, Loader2, AlertTriangle } from 'lucide-react'
import { cn, formatFileSize } from '@/lib/utils'

export interface UploadedImage { url: string; file_name?: string; file_size?: number }

interface ImageUploadProps {
  value: UploadedImage[]
  onChange: (images: UploadedImage[]) => void
  folder?: string
  maxFiles?: number
}

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export default function ImageUpload({ value, onChange, folder = 'misc', maxFiles = 6 }: ImageUploadProps) {
  const [uploading, setUploading] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')

  const upload = useCallback(async (files: FileList | null) => {
    if (!files || !files.length) return
    setError('')
    const list = Array.from(files)
    const room = maxFiles - value.length
    if (room <= 0) { setError(`Maximum ${maxFiles} images`); return }
    const toUpload = list.slice(0, room)
    setUploading(u => u + toUpload.length)
    const results: UploadedImage[] = []
    for (const file of toUpload) {
      if (!ACCEPTED.includes(file.type)) { setError(`${file.name}: unsupported format`); setUploading(u => u - 1); continue }
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', folder)
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const json = await res.json()
        if (res.ok) results.push(json)
        else setError(json.error ?? 'Upload failed')
      } catch { setError('Upload failed — check your connection') }
      setUploading(u => u - 1)
    }
    if (results.length) onChange([...value, ...results])
  }, [value, onChange, folder, maxFiles])

  return (
    <div>
      {value.length < maxFiles && (
        <label
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed cursor-pointer transition-all p-6',
            dragOver ? 'border-[var(--color-brand)] bg-[var(--color-brand-subtle)]' : 'border-[var(--border-default)] bg-white hover:border-[var(--color-brand-light)]'
          )}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files) }}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: dragOver ? 'var(--color-brand)' : 'var(--color-ink-6)' }}>
            {uploading > 0 ? <Loader2 className="h-5 w-5 animate-spin text-[var(--color-brand)]" /> : dragOver ? <ImagePlus className="h-5 w-5 text-white" /> : <Camera className="h-5 w-5 text-[var(--color-ink-3)]" />}
          </div>
          <div className="text-center">
            <p className="font-sans text-sm font-semibold text-[var(--color-ink)]">
              {uploading > 0 ? `Uploading ${uploading}…` : <>Tap to add photos or <span className="text-[var(--color-brand)]">browse</span></>}
            </p>
            <p className="font-sans text-xs text-[var(--color-ink-3)] mt-0.5">JPG, PNG, WebP · {value.length}/{maxFiles}</p>
          </div>
          <input type="file" accept={ACCEPTED.join(',')} multiple capture="environment" className="sr-only" onChange={e => upload(e.target.files)} />
        </label>
      )}

      {error && (
        <div className="flex items-center gap-2 mt-2">
          <AlertTriangle className="h-3.5 w-3.5 text-[var(--color-danger)] shrink-0" />
          <p className="field-error mt-0">{error}</p>
        </div>
      )}

      {value.length > 0 && (
        <div className="evidence-grid mt-3">
          {value.map((img, idx) => (
            <div key={img.url} className="relative group rounded-[var(--radius-md)] overflow-hidden border border-[var(--border-default)] aspect-square bg-[var(--color-ink-6)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.file_name ?? 'attachment'} className="h-full w-full object-cover" />
              <button type="button" onClick={() => onChange(value.filter((_, i) => i !== idx))}
                className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
