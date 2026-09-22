'use client'

import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SkeletonLine } from './LoadingSpinner'
import EmptyState from './EmptyState'
import { ClipboardList } from 'lucide-react'

interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  primary?: boolean
  width?: string
  render?: (row: T) => React.ReactNode
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  onRowClick?: (row: T) => void
  emptyMessage?: string
  keyField?: string
}

export default function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  loading = false,
  onRowClick,
  emptyMessage = 'No records found.',
  keyField = 'id',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function handleSort(key: string) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = [...data].sort((a, b) => {
    if (!sortKey) return 0
    const av = a[sortKey] as string
    const bv = b[sortKey] as string
    const cmp = String(av ?? '').localeCompare(String(bv ?? ''))
    return sortDir === 'asc' ? cmp : -cmp
  })

  if (loading) {
    return (
      <div className="card">
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <SkeletonLine key={i} className={i % 2 === 0 ? 'w-full' : 'w-3/4'} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="datatable-desktop">
        <div className="card p-0">
          <div className="admin-table-wrap">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: 'var(--surface-page)', borderBottom: '1.5px solid var(--border-default)' }}>
                  {columns.map(col => (
                    <th
                      key={col.key}
                      style={{ width: col.width, padding: '10px 14px', textAlign: 'left' }}
                      className={cn(
                        'font-sans font-bold text-[0.67rem] tracking-widest uppercase text-[var(--color-ink-3)]',
                        col.sortable && 'cursor-pointer select-none hover:text-[var(--color-ink)]'
                      )}
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {col.sortable && sortKey === col.key && (
                          sortDir === 'asc'
                            ? <ChevronUp className="h-3 w-3" />
                            : <ChevronDown className="h-3 w-3" />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length}>
                      <EmptyState
                        icon={<ClipboardList className="h-6 w-6" />}
                        title="No records"
                        description={emptyMessage}
                      />
                    </td>
                  </tr>
                ) : sorted.map((row, idx) => (
                  <tr
                    key={String(row[keyField] ?? idx)}
                    className={cn(
                      onRowClick && 'datatable-row-clickable',
                      'border-b border-[var(--border-default)] last:border-none'
                    )}
                    onClick={() => onRowClick?.(row)}
                    tabIndex={onRowClick ? 0 : undefined}
                    onKeyDown={e => { if (e.key === 'Enter') onRowClick?.(row) }}
                  >
                    {columns.map(col => (
                      <td key={col.key} style={{ padding: '11px 14px' }}>
                        {col.render
                          ? col.render(row)
                          : <span className="font-sans text-sm text-[var(--color-ink)]">{String(row[col.key] ?? '—')}</span>
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="datatable-mobile flex-col gap-3">
        {sorted.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-6 w-6" />}
            title="No records"
            description={emptyMessage}
          />
        ) : sorted.map((row, idx) => {
          const primaryCol = columns.find(c => c.primary) ?? columns[0]
          const metaCols = columns.filter(c => c !== primaryCol).slice(0, 4)
          return (
            <div
              key={String(row[keyField] ?? idx)}
              className={cn('card datatable-card-clickable', onRowClick && 'cursor-pointer')}
              onClick={() => onRowClick?.(row)}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={e => { if (e.key === 'Enter') onRowClick?.(row) }}
            >
              <div className="mb-2">
                {primaryCol.render ? primaryCol.render(row) : (
                  <span className="font-display font-bold text-[var(--color-ink)]">{String(row[primaryCol.key] ?? '')}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {metaCols.map(col => (
                  <div key={col.key} className="flex items-center gap-1.5">
                    <span className="font-sans text-[0.6rem] font-bold uppercase tracking-widest text-[var(--color-ink-4)]">{col.label}</span>
                    <span>{col.render ? col.render(row) : <span className="font-sans text-xs text-[var(--color-ink-3)]">{String(row[col.key] ?? '—')}</span>}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
