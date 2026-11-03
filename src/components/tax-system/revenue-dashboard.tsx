'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Building2,
  TrendingUp,
  Wallet,
  Target,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Landmark,
  PieChart,
  BarChart3,
  RefreshCw,
} from 'lucide-react'
import { fmtETB, fmtNumber, fmtDate, fmtDateShort, categoryLabel } from './lib'

interface CategoryRow {
  category: string
  label: string
  expected: number
  collected: number
  outstanding: number
  assignedAmount: number
  assignedCount: number
  collectedCount: number
  collectionRate: number
}

interface PeriodPoint {
  date?: string
  weekStart?: string
  month?: string
  total: number
  count: number
}

interface RecentItem {
  id: string
  referenceNo: string
  paymentAmount: number | null
  paymentDate: string | null
  bankReceiptNumber: string | null
  governmentReceiptNumber: string | null
  taxType: string
  taxPayer: {
    id: string
    tin: string
    fullName: string
    category: string
    woreda: { code: string; name: string } | null
  }
}

interface Summary {
  fiscalYear: string
  availableFiscalYears: string[]
  totals: {
    expected: number
    collected: number
    outstanding: number
    collectionRate: number
  }
  counts: {
    completed: number
    pending: number
    totalAssigned: number
  }
  periodTotals: {
    today: number
    thisWeek: number
    thisMonth: number
    thisYear: number
  }
  byCategory: CategoryRow[]
  daily: PeriodPoint[]
  weekly: PeriodPoint[]
  monthly: PeriodPoint[]
}

type PeriodView = 'daily' | 'weekly' | 'monthly'

const CATEGORY_COLORS: Record<string, string> = {
  BUSINESS: 'bg-emerald-500',
  PROPERTY: 'bg-sky-500',
  INDIVIDUAL_INCOME: 'bg-amber-500',
  VEHICLE: 'bg-violet-500',
  VAT: 'bg-rose-500',
  WITHHOLDING: 'bg-teal-500',
  OTHER: 'bg-muted-foreground',
}

export function RevenueDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [recent, setRecent] = useState<RecentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [recentLoading, setRecentLoading] = useState(true)
  const [fiscalYear, setFiscalYear] = useState<string>('')
  const [periodView, setPeriodView] = useState<PeriodView>('monthly')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (fiscalYear) params.set('fiscalYear', fiscalYear)
      const r = await fetch(`/api/revenue/summary?${params}`)
      if (!r.ok) {
        const d = await r.json()
        throw new Error(d.error || 'Failed to load')
      }
      const d: Summary = await r.json()
      setSummary(d)
      if (!fiscalYear && d.availableFiscalYears[0]) {
        setFiscalYear(d.fiscalYear)
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [fiscalYear])

  const loadRecent = useCallback(async () => {
    setRecentLoading(true)
    try {
      const r = await fetch('/api/revenue/recent?limit=15')
      const d = await r.json()
      setRecent(d.recent || [])
    } catch {
      // ignore
    } finally {
      setRecentLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
  }, [load])

  useEffect(() => {
    loadRecent()
    const i = setInterval(loadRecent, 30000)
    return () => clearInterval(i)
  }, [loadRecent])

  if (loading && !summary) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-72" />
        </div>
      </div>
    )
  }

  if (error || !summary) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-sm text-destructive">{error || 'No data'}</p>
          <Button onClick={load} variant="outline" size="sm" className="mt-3">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const { totals, counts, periodTotals, byCategory, daily, weekly, monthly, availableFiscalYears } = summary

  const periodData: PeriodPoint[] =
    periodView === 'daily' ? daily : periodView === 'weekly' ? weekly : monthly

  // For the period chart, take the most recent N points so the chart isn't too dense
  const chartData = periodData.slice(periodView === 'daily' ? -30 : -12)
  const maxPeriodTotal = Math.max(...chartData.map((p) => p.total), 1)

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            City Revenue Overview
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track expected vs collected tax across all categories and periods
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="fy" className="text-xs text-muted-foreground">
            Fiscal Year:
          </Label>
          <Select value={fiscalYear} onValueChange={setFiscalYear}>
            <SelectTrigger id="fy" className="w-[160px]">
              <SelectValue placeholder="Select FY" />
            </SelectTrigger>
            <SelectContent>
              {availableFiscalYears.length === 0 ? (
                <SelectItem value={fiscalYear}>{fiscalYear || 'No data'}</SelectItem>
              ) : (
                availableFiscalYears.map((fy) => (
                  <SelectItem key={fy} value={fy}>
                    {fy}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Top KPI cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Expected (yearly target)"
          value={fmtETB(totals.expected)}
          icon={Target}
          tone="bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
          sub="Sum of all category targets"
        />
        <KpiCard
          label="Collected (so far)"
          value={fmtETB(totals.collected)}
          icon={Wallet}
          tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          sub={`${counts.completed} completed payments`}
        />
        <KpiCard
          label="Outstanding"
          value={fmtETB(totals.outstanding)}
          icon={ArrowDownRight}
          tone="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
          sub={`${counts.pending} pending assignments`}
        />
        <KpiCard
          label="Collection Rate"
          value={`${totals.collectionRate}%`}
          icon={TrendingUp}
          tone={
            totals.collectionRate >= 75
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              : totals.collectionRate >= 40
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
          }
          sub={`${fmtNumber(counts.totalAssigned)} total assignments`}
        />
      </div>

      {/* Period totals */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <PeriodCard label="Today" amount={periodTotals.today} icon={Calendar} />
        <PeriodCard label="This Week" amount={periodTotals.thisWeek} icon={Calendar} />
        <PeriodCard label="This Month" amount={periodTotals.thisMonth} icon={Calendar} />
        <PeriodCard label="This Fiscal Year" amount={periodTotals.thisYear} icon={Calendar} />
      </div>

      {/* Collection progress bar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PieChart className="h-4 w-4 text-primary" />
            City-Wide Collection Progress
            <Badge variant="secondary" className="ml-auto">
              {totals.collectionRate}% of target
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-4 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all"
              style={{ width: `${Math.min(100, totals.collectionRate)}%` }}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <div>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {fmtETB(totals.collected)}
              </span>{' '}
              collected of{' '}
              <span className="font-medium">{fmtETB(totals.expected)}</span>
            </div>
            <div>
              <span className="font-medium text-amber-600 dark:text-amber-400">
                {fmtETB(totals.outstanding)}
              </span>{' '}
              still outstanding
            </div>
          </div>
        </CardContent>
      </Card>

      {/* By category table + period chart */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* By Category */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              Expected vs Collected — by Category
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-y bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Category</th>
                    <th className="px-4 py-2 text-right font-medium">Expected</th>
                    <th className="px-4 py-2 text-right font-medium">Collected</th>
                    <th className="px-4 py-2 text-right font-medium">Outstanding</th>
                    <th className="px-4 py-2 text-right font-medium">Rate</th>
                    <th className="px-4 py-2 text-center font-medium">Cases</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {byCategory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                        No assignments or targets for this fiscal year.
                      </td>
                    </tr>
                  ) : (
                    byCategory.map((c) => {
                      const color = CATEGORY_COLORS[c.category] || CATEGORY_COLORS.OTHER
                      return (
                        <tr key={c.category} className="hover:bg-muted/30">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                              <span className="font-medium">{c.label}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs">
                            {fmtETB(c.expected)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs text-emerald-600 dark:text-emerald-400">
                            {fmtETB(c.collected)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs text-amber-600 dark:text-amber-400">
                            {fmtETB(c.outstanding)}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <Badge
                              variant={
                                c.collectionRate >= 75
                                  ? 'default'
                                  : c.collectionRate >= 40
                                    ? 'secondary'
                                    : 'destructive'
                              }
                              className="text-[10px]"
                            >
                              {c.collectionRate}%
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-center text-xs text-muted-foreground">
                            {c.collectedCount}/{c.assignedCount}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
                {byCategory.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 bg-muted/40 font-semibold">
                      <td className="px-4 py-2.5">TOTAL</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">
                        {fmtETB(totals.expected)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-emerald-600 dark:text-emerald-400">
                        {fmtETB(totals.collected)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-amber-600 dark:text-amber-400">
                        {fmtETB(totals.outstanding)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Badge variant="default" className="text-[10px]">
                          {totals.collectionRate}%
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-center text-xs text-muted-foreground">
                        {counts.completed}/{counts.totalAssigned}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Period chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base gap-2">
              <span className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Collection Trend
              </span>
              <Select value={periodView} onValueChange={(v) => setPeriodView(v as PeriodView)}>
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No collection data for this period yet.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                {chartData
                  .slice()
                  .reverse()
                  .map((p, idx) => {
                    const label =
                      p.date ||
                      (p.weekStart ? `Wk ${getWeekNumber(new Date(p.weekStart))}` : '') ||
                      (p.month ? formatMonth(p.month) : '')
                    const pct = (p.total / maxPeriodTotal) * 100
                    return (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <div className="w-20 text-muted-foreground truncate text-right">
                          {label}
                        </div>
                        <div className="flex-1 h-5 bg-muted rounded overflow-hidden relative">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all flex items-center justify-end pr-1"
                            style={{ width: `${Math.max(pct, p.total > 0 ? 8 : 0)}%` }}
                          >
                            {p.total > 0 && (
                              <span className="text-[9px] font-semibold text-white">
                                {p.count}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="w-24 text-right font-mono text-xs">
                          {fmtETB(p.total).replace('ETB', '').trim()}
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent collections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Landmark className="h-4 w-4 text-primary" />
            Recent Collections (last 15)
            <Badge variant="secondary" className="ml-auto">
              {recent.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No completed collections yet.
            </p>
          ) : (
            <div className="divide-y max-h-96 overflow-y-auto">
              {recent.map((r) => (
                <div
                  key={r.id}
                  className="p-3 flex flex-wrap items-center gap-3 hover:bg-muted/30"
                >
                  <Badge variant="outline" className="font-mono text-xs">
                    {r.referenceNo}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{r.taxPayer.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.taxPayer.tin} · {categoryLabel(r.taxPayer.category)}
                      {r.taxPayer.woreda && <> · Woreda {r.taxPayer.woreda.code}</>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm">
                      {fmtETB(r.paymentAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDateShort(r.paymentDate)}
                    </p>
                  </div>
                  {r.governmentReceiptNumber && (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px]">
                      GR: {r.governmentReceiptNumber}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
  sub,
}: {
  label: string
  value: string
  icon: typeof Building2
  tone: string
  sub: string
}) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium truncate">{label}</p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight truncate">{value}</p>
            <p className="text-xs text-muted-foreground truncate">{sub}</p>
          </div>
          <div className={`rounded-lg p-2 flex-shrink-0 ${tone}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PeriodCard({
  label,
  amount,
  icon: Icon,
}: {
  label: string
  amount: number
  icon: typeof Building2
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <Icon className="h-4 w-4 text-primary" />
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
        </div>
        <p className="text-lg font-bold tracking-tight">{fmtETB(amount)}</p>
      </CardContent>
    </Card>
  )
}

function getWeekNumber(d: Date): number {
  const onejan = new Date(d.getFullYear(), 0, 1)
  return Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7)
}

function formatMonth(m: string): string {
  // m is "2026-03"
  const [y, mo] = m.split('-')
  const date = new Date(parseInt(y), parseInt(mo) - 1, 1)
  return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
}
