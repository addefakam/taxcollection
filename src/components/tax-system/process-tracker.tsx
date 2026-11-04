'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import {
  AssignmentStatus,
  STATUS_META,
  fmtETB,
  fmtDateShort,
  categoryLabel,
} from './lib'
import {
  ClipboardList,
  Receipt,
  CheckCircle2,
  XCircle,
  Search,
  ArrowRight,
  RefreshCw,
  Banknote,
} from 'lucide-react'

interface Assignment {
  id: string
  referenceNo: string
  taxType: string
  amountDue: number
  paymentAmount?: number | null
  status: AssignmentStatus
  disputed: boolean
  assignedAt: string
  dueDate?: string | null
  bankReceiptNumber?: string | null
  bankName?: string | null
  governmentReceiptNumber?: string | null
  assignedByName: string
  taxPayer: {
    tin: string
    fullName: string
    category: string
    woreda?: { code: string; name: string } | null
  }
}

interface ColumnDef {
  key: AssignmentStatus
  label: string
  icon: typeof ClipboardList
  accent: string
}

const COLUMNS: ColumnDef[] = [
  {
    key: 'ASSIGNED',
    label: '1. Assigned — Awaiting Payment',
    icon: ClipboardList,
    accent: 'border-t-amber-400',
  },
  {
    key: 'BANK_RECEIPT_SUBMITTED',
    label: '2. Bank Receipt Submitted',
    icon: Receipt,
    accent: 'border-t-sky-400',
  },
  {
    key: 'COMPLETED',
    label: '3. Completed — Govt Receipt Issued',
    icon: CheckCircle2,
    accent: 'border-t-emerald-400',
  },
  {
    key: 'CANCELLED',
    label: 'Cancelled',
    icon: XCircle,
    accent: 'border-t-rose-400',
  },
]

export function ProcessTracker() {
  const { toast } = useToast()
  const [all, setAll] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true
    const fetchData = async () => {
      try {
        const r = await fetch('/api/assignments')
        const d = await r.json()
        if (active) {
          setAll(d)
          setLoading(false)
        }
      } catch {
        if (active) setLoading(false)
      }
    }
    fetchData()
    const i = setInterval(fetchData, 20000)
    return () => {
      active = false
      clearInterval(i)
    }
  }, [refreshKey])

  const filtered = all.filter((a) => {
    if (!q) return true
    const s = q.toLowerCase()
    return (
      a.referenceNo.toLowerCase().includes(s) ||
      a.taxPayer.tin.toLowerCase().includes(s) ||
      a.taxPayer.fullName.toLowerCase().includes(s) ||
      (a.bankReceiptNumber || '').toLowerCase().includes(s) ||
      (a.governmentReceiptNumber || '').toLowerCase().includes(s)
    )
  })

  const total = filtered.length
  const totalAmount = filtered
    .filter((a) => a.status !== 'CANCELLED')
    .reduce((s, a) => s + (a.amountDue || 0), 0)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search reference, TIN, name, receipt..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
        <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">{total} assignments</Badge>
          <Badge variant="outline" className="gap-1">
            <Banknote className="h-3 w-3" />
            {fmtETB(totalAmount)}
          </Badge>
        </div>
      </div>

      {/* Funnel summary */}
      {!loading && total > 0 && (
        <FunnelBar assignments={filtered} />
      )}

      {/* Kanban board */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {COLUMNS.map((col) => {
            const items = filtered.filter((a) => a.status === col.key)
            const colAmount = items.reduce((s, a) => s + (a.amountDue || 0), 0)
            return (
              <Card key={col.key} className={`border-t-4 ${col.accent}`}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-3 px-1">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <col.icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {items.length} item{items.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold leading-tight">
                        {col.label}
                      </h3>
                    </div>
                    <Badge variant="secondary" className="text-[10px] whitespace-nowrap">
                      {fmtETB(colAmount)}
                    </Badge>
                  </div>

                  <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                    {items.length === 0 ? (
                      <div className="rounded-md border border-dashed p-4 text-center">
                        <p className="text-xs text-muted-foreground">Empty</p>
                      </div>
                    ) : (
                      items.map((a) => (
                        <AssignmentCard key={a.id} assignment={a} toast={toast} />
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FunnelBar({ assignments }: { assignments: Assignment[] }) {
  const stages = [
    { key: 'ASSIGNED' as AssignmentStatus, label: 'Assigned', color: 'bg-amber-500' },
    {
      key: 'BANK_RECEIPT_SUBMITTED' as AssignmentStatus,
      label: 'Bank Receipt',
      color: 'bg-sky-500',
    },
    { key: 'COMPLETED' as AssignmentStatus, label: 'Completed', color: 'bg-emerald-500' },
  ]
  const counts = stages.map((s) => ({
    ...s,
    count: assignments.filter((a) => a.status === s.key).length,
  }))
  const max = Math.max(...counts.map((c) => c.count), 1)
  const totalProcessed = counts.reduce((s, c) => s + c.count, 0)
  const conversionRate =
    totalProcessed > 0
      ? Math.round((counts[2].count / totalProcessed) * 100)
      : 0

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-primary" />
            Process Funnel
          </h3>
          <span className="text-xs text-muted-foreground">
            Conversion rate:{' '}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {conversionRate}%
            </span>
          </span>
        </div>
        <div className="space-y-2">
          {counts.map((c) => (
            <div key={c.key} className="flex items-center gap-3">
              <div className="w-28 text-xs text-muted-foreground flex-shrink-0">
                {c.label}
              </div>
              <div className="flex-1 h-7 bg-muted rounded-md overflow-hidden relative">
                <div
                  className={`h-full ${c.color} transition-all flex items-center justify-end pr-2`}
                  style={{ width: `${(c.count / max) * 100}%`, minWidth: '32px' }}
                >
                  <span className="text-xs font-semibold text-white">{c.count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function AssignmentCard({
  assignment: a,
  toast,
}: {
  assignment: Assignment
  toast: ReturnType<typeof useToast>['toast']
}) {
  const copyRef = () => {
    navigator.clipboard.writeText(a.referenceNo)
    toast({ title: 'Reference copied', description: a.referenceNo })
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className={`rounded-md border bg-card p-2.5 hover:shadow-sm transition-shadow ${a.disputed ? 'border-rose-300 dark:border-rose-800' : 'border-border/70'}`}>
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={copyRef}
            className="font-mono text-[11px] text-muted-foreground hover:text-foreground hover:underline"
            title="Click to copy"
          >
            {a.referenceNo}
          </button>
          {a.disputed ? (
            <Badge variant="destructive" className="text-[9px] px-1 py-0">
              DISPUTED
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[9px] px-1 py-0">
              {categoryLabel(a.taxPayer.category).slice(0, 3).toUpperCase()}
            </Badge>
          )}
        </div>
        <p className="text-sm font-medium leading-tight truncate">
          {a.taxPayer.fullName}
        </p>
        <p className="text-[11px] text-muted-foreground font-mono">
          {a.taxPayer.tin}
          {a.taxPayer.woreda && <> · W{a.taxPayer.woreda.code}</>}
        </p>
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{a.taxType}</span>
            <span className="font-semibold">{fmtETB(a.amountDue)}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Due {fmtDateShort(a.dueDate)}</span>
            {a.paymentAmount !== null && a.paymentAmount !== undefined && a.paymentAmount > 0 && (
              <span className="text-emerald-600 dark:text-emerald-400">
                Paid {fmtETB(a.paymentAmount)}
              </span>
            )}
          </div>
        </div>
        {a.bankReceiptNumber && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="mt-2 pt-2 border-t border-dashed text-[11px] text-sky-600 dark:text-sky-400 flex items-center gap-1 truncate">
                <Receipt className="h-3 w-3 flex-shrink-0" />
                <span className="truncate font-mono">{a.bankReceiptNumber}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">
                Bank: {a.bankName}
              </p>
            </TooltipContent>
          </Tooltip>
        )}
        {a.governmentReceiptNumber && (
          <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 truncate">
            <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
            <span className="truncate font-mono">{a.governmentReceiptNumber}</span>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
