import { CheckCircle2, Clock, AlertTriangle, XCircle, Plus } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import type { IncidentStatusHistory } from '@/types'

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; bg: string; border: string; label: string }> = {
  open:        { icon: <AlertTriangle className="h-4 w-4" />, bg: 'oklch(96% 0.04 25)',  border: 'oklch(52% 0.22 25)',  label: 'Open' },
  in_progress: { icon: <Clock className="h-4 w-4" />,         bg: 'oklch(96% 0.05 65)',  border: 'oklch(65% 0.17 65)',  label: 'In Progress' },
  resolved:    { icon: <CheckCircle2 className="h-4 w-4" />,  bg: 'oklch(96% 0.04 155)', border: 'oklch(55% 0.15 155)', label: 'Resolved' },
  closed:      { icon: <XCircle className="h-4 w-4" />,       bg: 'var(--color-ink-6)',   border: 'var(--color-ink-4)',  label: 'Closed' },
  created:     { icon: <Plus className="h-4 w-4" />,           bg: 'oklch(96% 0.03 264)', border: 'oklch(48% 0.17 264)', label: 'Created' },
}

interface StatusTimelineProps {
  history: IncidentStatusHistory[]
}

export default function StatusTimeline({ history }: StatusTimelineProps) {
  if (!history.length) return null

  return (
    <div className="relative pl-8">
      <div className="timeline-line" />
      <div className="space-y-4">
        {history.map((h, idx) => {
          const status = h.old_status ? h.new_status : 'created'
          const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.open
          const changer = h.changer as { full_name: string } | undefined
          return (
            <div key={h.id} className="relative flex gap-3">
              <div
                className="timeline-dot border-2"
                style={{ background: cfg.bg, borderColor: cfg.border, color: cfg.border, marginLeft: '-31px' }}
              >
                {cfg.icon}
              </div>
              <div className="flex-1 min-w-0 pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-sans font-bold text-sm text-[var(--color-ink)]">{cfg.label}</span>
                  {h.old_status && (
                    <span className="font-sans text-xs text-[var(--color-ink-3)]">from {h.old_status.replace('_', ' ')}</span>
                  )}
                </div>
                <p className="font-mono text-xs text-[var(--color-ink-4)] mt-0.5">{formatDateTime(h.changed_at)}</p>
                {changer && (
                  <p className="font-sans text-xs text-[var(--color-ink-3)] mt-0.5">by {changer.full_name}</p>
                )}
                {h.reason && (
                  <p className="font-sans text-xs text-[var(--color-ink-2)] mt-1 italic">&ldquo;{h.reason}&rdquo;</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
