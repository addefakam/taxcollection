'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { fmtETB } from './lib'
import { FileText, Download, Table, Filter } from 'lucide-react'

interface ReportData {
  type: string
  headers: string[]
  rows: Record<string, unknown>[]
  count: number
}

const REPORT_TYPES = [
  { value: 'taxpayers', label: 'Taxpayer Registration Report' },
  { value: 'collections', label: 'Tax Collection Report' },
  { value: 'outstanding', label: 'Outstanding Tax Report' },
  { value: 'plans', label: 'Plan vs Achievement Report' },
  { value: 'staff', label: 'Staff & Performance Report' },
]

const todayStr = () => new Date().toISOString().split('T')[0]

export function ReportsManagement() {
  const { toast } = useToast()
  const [reportType, setReportType] = useState('taxpayers')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)

  const generate = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('type', reportType)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      if (category) params.set('category', category)
      if (status) params.set('status', status)
      const res = await fetch(`/api/reports?${params}`)
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed')
      setData(d)
    } catch (e: unknown) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [reportType, startDate, endDate, category, status, toast])

  const exportCSV = () => {
    const params = new URLSearchParams()
    params.set('type', reportType)
    params.set('format', 'csv')
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    if (category) params.set('category', category)
    if (status) params.set('status', status)
    window.open(`/api/reports?${params}`, '_blank')
  }

  // Show date/status filters only for relevant report types
  const showDateFilters = reportType === 'collections'
  const showCategoryFilter = reportType === 'taxpayers' || reportType === 'collections'
  const showStatusFilter = reportType === 'taxpayers' || reportType === 'collections'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Reports</h2>
        <p className="text-sm text-muted-foreground mt-1">Generate and export reports. Data is scoped to your administrative level.</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Filter className="h-4 w-4" />Report Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={v => { setReportType(v); setData(null) }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {showDateFilters && (
              <>
                <div className="space-y-1.5">
                  <Label>Start Date</Label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>End Date</Label>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </>
            )}
            {showCategoryFilter && (
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={category || 'ALL'} onValueChange={v => setCategory(v === 'ALL' ? '' : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All categories</SelectItem>
                    <SelectItem value="BUSINESS">Business</SelectItem>
                    <SelectItem value="PROPERTY">Property</SelectItem>
                    <SelectItem value="INDIVIDUAL_INCOME">Individual Income</SelectItem>
                    <SelectItem value="VEHICLE">Vehicle</SelectItem>
                    <SelectItem value="VAT">VAT</SelectItem>
                    <SelectItem value="WITHHOLDING">Withholding</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {showStatusFilter && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status || 'ALL'} onValueChange={v => setStatus(v === 'ALL' ? '' : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All statuses</SelectItem>
                    {reportType === 'taxpayers' ? (
                      <>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="ASSIGNED">Assigned</SelectItem>
                        <SelectItem value="BANK_RECEIPT_SUBMITTED">Bank Receipt</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={generate} disabled={loading} className="gap-2">
              <Table className="h-4 w-4" /> {loading ? 'Generating…' : 'Generate Report'}
            </Button>
            {data && (
              <Button variant="outline" onClick={exportCSV} className="gap-2">
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <Skeleton className="h-64" />
      ) : data ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span>{REPORT_TYPES.find(r => r.value === data.type)?.label || data.type}</span>
              <Badge variant="secondary">{data.count} records</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="border-y bg-muted/40 sticky top-0">
                  <tr>
                    {data.headers.map(h => (
                      <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/20">
                      {data.headers.map(h => (
                        <td key={h} className="px-3 py-2 whitespace-nowrap">
                          {typeof row[h] === 'number' ? fmtETB(row[h] as number) : String(row[h] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Select a report type and click &quot;Generate Report&quot;.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
