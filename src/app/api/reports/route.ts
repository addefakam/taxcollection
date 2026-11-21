import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getTaxPayerScopeFilter, getAssignmentScopeFilter } from '@/lib/scoping'

// GET /api/reports?type=...&startDate=...&endDate=...&category=...&status=...
// Returns data for the requested report type, scoped to the user's hierarchy.
// Supports CSV export via ?format=csv
export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const reportType = searchParams.get('type') || 'taxpayers'
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const category = searchParams.get('category')
  const status = searchParams.get('status')
  const format = searchParams.get('format') // 'csv' or undefined (json)

  const tpScope = await getTaxPayerScopeFilter()
  const assignScope = await getAssignmentScopeFilter()
  if (!tpScope || !assignScope) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let rows: Record<string, unknown>[] = []
  let headers: string[] = []

  switch (reportType) {
    case 'taxpayers': {
      const where = { ...tpScope }
      if (category) where.category = category
      if (status === 'active') where.active = true
      if (status === 'inactive') where.active = false
      if (status === 'blocked') where.blocked = true
      const taxpayers = await db.taxPayer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { woreda: { select: { name: true } }, _count: { select: { assignments: true } } },
      })
      headers = ['TIN', 'Name', 'Category', 'Phone', 'Email', 'Woreda', 'Active', 'Blocked', 'Assignments', 'Registered']
      rows = taxpayers.map(t => ({
        TIN: t.tin, Name: t.fullName, Category: t.category,
        Phone: t.phone || '', Email: t.email || '',
        Woreda: t.woreda?.name || '—',
        Active: t.active ? 'Yes' : 'No', Blocked: t.blocked ? 'Yes' : 'No',
        Assignments: t._count?.assignments || 0,
        Registered: new Date(t.createdAt).toLocaleDateString('en-GB'),
      }))
      break
    }

    case 'collections': {
      const where: Record<string, unknown> = { ...assignScope }
      if (status) where.status = status
      if (startDate && endDate) {
        where.paymentDate = { gte: new Date(startDate), lt: new Date(endDate) }
      }
      const assignments = await db.taxAssignment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          taxPayer: { select: { tin: true, fullName: true, category: true, woreda: { select: { name: true } } } },
        },
      })
      headers = ['Reference', 'TIN', 'Taxpayer', 'Category', 'Woreda', 'TaxType', 'FiscalYear', 'Period', 'AmountDue', 'PaymentAmount', 'Status', 'BankReceipt', 'GovtReceipt', 'PaymentDate', 'AssignedBy']
      rows = assignments.map(a => ({
        Reference: a.referenceNo,
        TIN: a.taxPayer.tin, Taxpayer: a.taxPayer.fullName,
        Category: a.taxPayer.category, Woreda: a.taxPayer.woreda?.name || '—',
        TaxType: a.taxType, FiscalYear: a.fiscalYear, Period: a.period,
        AmountDue: a.amountDue, PaymentAmount: a.paymentAmount || 0,
        Status: a.status,
        BankReceipt: a.bankReceiptNumber || '—',
        GovtReceipt: a.governmentReceiptNumber || '—',
        PaymentDate: a.paymentDate ? new Date(a.paymentDate).toLocaleDateString('en-GB') : '—',
        AssignedBy: a.assignedByName,
      }))
      break
    }

    case 'outstanding': {
      const assignments = await db.taxAssignment.findMany({
        where: { ...assignScope, status: { in: ['ASSIGNED', 'BANK_RECEIPT_SUBMITTED'] } },
        orderBy: { amountDue: 'desc' },
        include: {
          taxPayer: { select: { tin: true, fullName: true, category: true, woreda: { select: { name: true } } } },
        },
      })
      headers = ['Reference', 'TIN', 'Taxpayer', 'Category', 'Woreda', 'TaxType', 'AmountDue', 'PaymentAmount', 'Outstanding', 'Status', 'DueDate']
      rows = assignments.map(a => ({
        Reference: a.referenceNo,
        TIN: a.taxPayer.tin, Taxpayer: a.taxPayer.fullName,
        Category: a.taxPayer.category, Woreda: a.taxPayer.woreda?.name || '—',
        TaxType: a.taxType,
        AmountDue: a.amountDue, PaymentAmount: a.paymentAmount || 0,
        Outstanding: a.amountDue - (a.paymentAmount || 0),
        Status: a.status,
        DueDate: a.dueDate ? new Date(a.dueDate).toLocaleDateString('en-GB') : '—',
      }))
      break
    }

    case 'plans': {
      const plans = await db.plan.findMany({
        orderBy: { startDate: 'desc' },
        include: {
          subCity: { select: { name: true } },
          woreda: { select: { name: true } },
          team: { select: { name: true } },
          responsible: { select: { fullName: true } },
        },
      })
      headers = ['Title', 'Period', 'Start', 'End', 'SubCity', 'Woreda', 'Team', 'Responsible', 'Activity', 'TargetAmount', 'ActualAmount', 'Progress', 'Status', 'Priority']
      rows = plans.map(p => ({
        Title: p.title, Period: p.periodType,
        Start: new Date(p.startDate).toLocaleDateString('en-GB'),
        End: new Date(p.endDate).toLocaleDateString('en-GB'),
        SubCity: p.subCity?.name || '—', Woreda: p.woreda?.name || '—',
        Team: p.team?.name || '—', Responsible: p.responsible?.fullName || '—',
        Activity: p.activity,
        TargetAmount: p.targetAmount || 0, ActualAmount: p.actualAmount || 0,
        Progress: `${p.progress}%`, Status: p.status, Priority: p.priority,
      }))
      break
    }

    case 'staff': {
      const staff = await db.staff.findMany({
        orderBy: { fullName: 'asc' },
        select: {
          fullName: true, email: true, phone: true, role: true, active: true,
          assignedSubCity: { select: { name: true } },
          assignedWoreda: { select: { name: true } },
          team: { select: { name: true } },
          lastLoginAt: true, createdAt: true,
        },
      })
      headers = ['Name', 'Email', 'Phone', 'Role', 'SubCity', 'Woreda', 'Team', 'Active', 'LastLogin', 'Created']
      rows = staff.map(s => ({
        Name: s.fullName, Email: s.email, Phone: s.phone || '',
        Role: s.role,
        SubCity: s.assignedSubCity?.name || '—', Woreda: s.assignedWoreda?.name || '—',
        Team: s.team?.name || '—',
        Active: s.active ? 'Yes' : 'No',
        LastLogin: s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleDateString('en-GB') : 'Never',
        Created: new Date(s.createdAt).toLocaleDateString('en-GB'),
      }))
      break
    }

    default:
      return NextResponse.json({ error: `Unknown report type: ${reportType}` }, { status: 400 })
  }

  // CSV export
  if (format === 'csv') {
    const csvLines = [headers.join(',')]
    for (const row of rows) {
      const values = headers.map(h => {
        const val = String(row[h] ?? '')
        // Escape quotes and wrap in quotes if contains comma/quote/newline
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`
        }
        return val
      })
      csvLines.push(values.join(','))
    }
    const csv = csvLines.join('\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${reportType}-report-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  }

  return NextResponse.json({ type: reportType, headers, rows, count: rows.length, currentUser: user })
}
