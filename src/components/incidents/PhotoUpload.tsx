'use client'

import { useCallback, useEffect, useState } from 'react'
import { Camera, X, ImagePlus, AlertTriangle } from 'lucide-react'
import { cn, formatFileSize } from '@/lib/utils'

interface PhotoUploadProps {
  files: File[]
  onChange: (files: File[]) => void
  maxFiles?: number
  maxSizeBytes?: number
  error?: string
}

const MAX_SIZE = 5 * 1024 * 1024  // 5 MB
const ACCEPTED  = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']

export default function PhotoUpload({
  files,
  onChange,
  maxFiles = 5,
  maxSizeBytes = MAX_SIZE,
  error,
}: PhotoUploadProps) {
  const [dragOver, setDragOver] = useState(false)
  const [sizeError, setSizeError] = useState('')
  const [previewUrls, setPreviewUrls] = useState<string[]>([])

  useEffect(() => {
    const urls = files.map(f => URL.createObjectURL(f))
    setPreviewUrls(urls)
    return () => { urls.forEach(u => URL.revokeObjectURL(u)) }
  }, [files])

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return
    setSizeError('')
    const valid: File[] = []
    const errors: string[] = []
    Array.from(incoming).forEach(f => {
      if (!ACCEPTED.includes(f.type)) {
        errors.push(`${f.name}: unsupported format (use JPG, PNG, or WebP)`)
        return
      }
      if (f.size > maxSizeBytes) {
        errors.push(`${f.name}: exceeds ${formatFileSize(maxSizeBytes)} limit`)
        return
      }
      if (files.length + valid.length >= maxFiles) {
        errors.push(`Maximum ${maxFiles} photos allowed`)
        return
      }
      valid.push(f)
    })
    if (errors.length) setSizeError(errors[0])
    if (valid.length) onChange([...files, ...valid])
  }, [files, maxFiles, maxSizeBytes, onChange])

  function remove(idx: number) {
    onChange(files.filter((_, i) => i !== idx))
    setSizeError('')
  }

  return (
    <div>
      {/* Upload zone */}
      {files.length < maxFiles && (
        <label
          className={cn(
            'flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border-2 border-dashed cursor-pointer transition-all p-8',
            dragOver
              ? 'border-[var(--color-brand)] bg-[var(--color-brand-subtle)]'
              : 'border-[var(--border-default)] bg-white hover:border-[var(--color-brand-light)] hover:bg-[var(--color-brand-subtle)]',
            error && 'border-[var(--color-danger)] bg-[var(--color-danger-light)]'
          )}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
        >
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: dragOver ? 'var(--color-brand)' : 'var(--color-ink-6)' }}
          >
            {dragOver
              ? <ImagePlus className="h-5 w-5 text-white" />
              : <Camera className="h-5 w-5 text-[var(--color-ink-3)]" />
            }
          </div>
          <div className="text-center">
            <p className="font-sans text-sm font-semibold text-[var(--color-ink)]">
              Drop photos here or <span className="text-[var(--color-brand)]">browse</span>
            </p>
            <p className="font-sans text-xs text-[var(--color-ink-3)] mt-1">
              JPG, PNG, WebP · up to {formatFileSize(maxSizeBytes)} each · {files.length}/{maxFiles} added
            </p>
          </div>
          <input
            type="file"
            accept={ACCEPTED.join(',')}
            multiple
            className="sr-only"
            onChange={e => addFiles(e.target.files)}
            capture="environment"
          />
        </label>
      )}

      {/* Error */}
      {(error || sizeError) && (
        <div className="flex items-center gap-2 mt-2">
          <AlertTriangle className="h-3.5 w-3.5 text-[var(--color-danger)] shrink-0" />
          <p className="field-error mt-0">{error ?? sizeError}</p>
        </div>
      )}

      {/* Preview grid */}
      {files.length > 0 && (
        <div className="evidence-grid mt-3">
          {files.map((file, idx) => (
              <div key={idx} className="relative group rounded-[var(--radius-md)] overflow-hidden border border-[var(--border-default)] aspect-square bg-[var(--color-ink-6)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrls[idx] ?? ''} alt={file.name} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="font-mono text-[9px] text-white truncate">{formatFileSize(file.size)}</p>
                </div>
              </div>
          ))}
        </div>
      )}
    </div>
  )
}
