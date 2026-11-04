'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users,
  ClipboardList,
  Receipt,
  CheckCircle2,
  XCircle,
  Banknote,
  TrendingUp,
  AlertCircle,
  Clock,
  Building2,
  ShieldOff,
  UserCheck,
} from 'lucide-react'
import { fmtETB, fmtNumber, fmtDate, STATUS_META } from './lib'

interface Stats {
  counts: {
    totalTaxPayers: number
    activeTaxPayers: number
    blockedTaxPayers: number
    totalStaff: number
    assigned: number
    bankReceiptSubmitted: number
    completed: number
    cancelled: number
    disputed: number
    totalAssignments: number
  }
  amounts: {
    totalAssignedAmount: number
    totalCollected: number
    outstanding: number
  }
  byCategory: { category: string; count: number }[]
  byTaxType: { taxType: string; count: number }[]
  byWoreda: { woredaId: string | null; woredaName: string; count: number }[]
  recentAssignments: Array<{
    id: string
    referenceNo: string
    status: keyof typeof STATUS_META
    disputed: boolean
    amountDue: number
    taxType: string
    assignedByName: string
    taxPayer: { tin: string; fullName: string }
    updatedAt: string
  }>
  recentHistory: Array<{
    id: string
    action: string
    note: string
    performedByName: string
    timestamp: string
    assignment: { referenceNo: string; taxPayer: { fullName: string } } | null
  }>
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const fetchData = async () => {
      try {
        const r = await fetch('/api/stats')
        const d = await r.json()
        if (active) {
          setStats(d)
          setLoading(false)
        }
      } catch {
        if (active) setLoading(false)
      }
    }
    fetchData()
    const i = setInterval(fetchData, 15000)
    return () => {
      active = false
      clearInterval(i)
    }
  }, [])

  if (loading || !stats) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  const { counts, amounts, byCategory, byTaxType, byWoreda, recentAssignments, recentHistory } = stats
  const collectedPct =
    amounts.totalAssignedAmount > 0
      ? Math.round((amounts.totalCollected / amounts.totalAssignedAmount) * 100)
      : 0

  const cards = [
    {
      label: 'Tax Payers',
      value: counts.totalTaxPayers,
      sub: `${counts.activeTaxPayers} active${counts.blockedTaxPayers > 0 ? ` · ${counts.blockedTaxPayers} blocked` : ''}`,
      icon: Users,
      tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    },
    {
      label: 'Awaiting Payment',
      value: counts.assigned,
      sub: 'Team 1 assigned',
      icon: ClipboardList,
      tone: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    },
    {
      label: 'Bank Receipts Pending',
      value: counts.bankReceiptSubmitted,
      sub: `${counts.disputed > 0 ? `${counts.disputed} disputed · ` : ''}Awaiting govt receipt`,
      icon: Receipt,
      tone: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
    },
    {
      label: 'Completed',
      value: counts.completed,
      sub: 'Govt receipts issued',
      icon: CheckCircle2,
      tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Top stat cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="overflow-hidden">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">{c.label}</p>
                  <p className="text-2xl sm:text-3xl font-bold tracking-tight">
                    {fmtNumber(c.value)}
                  </p>
                  <p className="text-xs text-muted-foreground">{c.sub}</p>
                </div>
                <div className={`rounded-lg p-2 ${c.tone}`}>
                  <c.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Money summary */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Banknote className="h-4 w-4 text-primary" />
              Collection Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Total Assigned</p>
                <p className="text-xl font-bold">{fmtETB(amounts.totalAssignedAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Collected</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {fmtETB(amounts.totalCollected)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                  {fmtETB(amounts.outstanding)}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Collection Rate</span>
                <span className="font-semibold">{collectedPct}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all"
                  style={{ width: `${collectedPct}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Assigned
              </span>
              <span className="font-semibold">{counts.assigned}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> Bank Receipt
              </span>
              <span className="font-semibold">{counts.bankReceiptSubmitted}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Completed
              </span>
              <span className="font-semibold">{counts.completed}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <span className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Cancelled
              </span>
              <span className="font-semibold">{counts.cancelled}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity + breakdowns */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No activity yet.
              </p>
            ) : (
              <ul className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {recentHistory.map((h) => (
                  <li key={h.id} className="flex gap-3 text-sm">
                    <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground">
                        <span className="font-medium">{h.performedByName}</span>{' '}
                        <span className="text-muted-foreground">
                          — {actionLabel(h.action)}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{h.note}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {fmtDate(h.timestamp)}
                        {h.assignment && (
                          <> · {h.assignment.referenceNo}</>
                        )}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-primary" />
              Tax Payers by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No data.</p>
            ) : (
              <ul className="space-y-2">
                {byCategory.map((c) => (
                  <li
                    key={c.category}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="capitalize">
                      {c.category.replace(/_/g, ' ').toLowerCase()}
                    </span>
                    <Badge variant="secondary">{c.count}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Woreda + staff summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-primary" />
              Tax Payers by Woreda
            </CardTitle>
          </CardHeader>
          <CardContent>
            {byWoreda.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No data.</p>
            ) : (
              <ul className="space-y-2">
                {byWoreda.map((w) => (
                  <li
                    key={w.woredaId || 'none'}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate">{w.woredaName}</span>
                    <Badge variant="secondary">{w.count}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCheck className="h-4 w-4 text-primary" />
              Office Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Total active staff</span>
                <Badge variant="secondary">{counts.totalStaff}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Blocked tax payers</span>
                <Badge variant={counts.blockedTaxPayers > 0 ? 'destructive' : 'secondary'}>
                  {counts.blockedTaxPayers}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Disputed assignments</span>
                <Badge variant={counts.disputed > 0 ? 'destructive' : 'secondary'}>
                  {counts.disputed}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-4 w-4 text-primary" />
            Most Recently Updated Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentAssignments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No assignments yet. Team 1 needs to start assigning tax payers.
            </p>
          ) : (
            <div className="space-y-2">
              {recentAssignments.map((a) => {
                const m = STATUS_META[a.status]
                return (
                  <div
                    key={a.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 p-3"
                  >
                    <Badge variant="outline" className="font-mono text-xs">
                      {a.referenceNo}
                    </Badge>
                    {a.disputed && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-900/30 px-2 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-300">
                        <AlertCircle className="h-3 w-3" /> Disputed
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{a.taxPayer.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.taxPayer.tin} · {a.taxType}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{fmtETB(a.amountDue)}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDate(a.updatedAt)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${m.bg} ${m.text}`}
                    >
                      {m.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function actionLabel(a: string): string {
  switch (a) {
    case 'ASSIGN':
      return 'assigned'
    case 'BANK_RECEIPT_RECEIVED':
      return 'received bank receipt'
    case 'VERIFY':
      return 'verified bank receipt'
    case 'ISSUE_GOVERNMENT_RECEIPT':
      return 'issued government receipt'
    case 'CANCEL':
      return 'cancelled'
    case 'EDIT':
      return 'edited'
    default:
      return a.toLowerCase().replace(/_/g, ' ')
  }
}
