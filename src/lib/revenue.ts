import { db } from '@/lib/db'

// Compute the date range for a fiscal year string like "2026/2027"
// Ethiopian fiscal year starts July 8 (Hamle 1) — but for simplicity, we
// treat fiscal year "2026/2027" as starting 1 Jan 2026 (calendar year).
// To switch to Ethiopian fiscal calendar, just change startMonth below.
const FISCAL_YEAR_START_MONTH = 0 // 0 = January, 6 = July

export function fiscalYearRange(fy: string): { start: Date; end: Date } | null {
  // Match "2026/2027" or "2026"
  const m = fy.match(/^(\d{4})/)
  if (!m) return null
  const year = parseInt(m[1], 10)
  const start = new Date(year, FISCAL_YEAR_START_MONTH, 1, 0, 0, 0, 0)
  const end = new Date(year + 1, FISCAL_YEAR_START_MONTH, 1, 0, 0, 0, 0)
  return { start, end }
}

// Get available fiscal years from assignments + targets
export async function getAvailableFiscalYears(): Promise<string[]> {
  const [aFys, tFys] = await Promise.all([
    db.taxAssignment.findMany({ select: { fiscalYear: true }, distinct: ['fiscalYear'] }),
    db.yearlyTaxTarget.findMany({ select: { fiscalYear: true }, distinct: ['fiscalYear'] }),
  ])
  const set = new Set<string>([...aFys.map((x) => x.fiscalYear), ...tFys.map((x) => x.fiscalYear)])
  return Array.from(set).sort().reverse()
}

// Map TaxPayer.category -> a taxType bucket used for revenue categorization.
// If a TaxAssignment.taxType explicitly belongs to a known category, use that.
// Otherwise fall back to the tax payer's category.
export function classifyByCategory(assignment: {
  taxType: string
  taxPayer?: { category: string } | null
}): string {
  const tt = assignment.taxType?.toLowerCase() || ''
  if (tt.includes('business')) return 'BUSINESS'
  if (tt.includes('property')) return 'PROPERTY'
  if (tt.includes('individual') || tt.includes('income')) return 'INDIVIDUAL_INCOME'
  if (tt.includes('vehicle')) return 'VEHICLE'
  if (tt.includes('vat') || tt.includes('value added')) return 'VAT'
  if (tt.includes('withholding')) return 'WITHHOLDING'
  return assignment.taxPayer?.category || 'OTHER'
}

export const CATEGORY_LABELS: Record<string, string> = {
  BUSINESS: 'Business Tax',
  PROPERTY: 'Property Tax',
  INDIVIDUAL_INCOME: 'Individual Income Tax',
  VEHICLE: 'Vehicle Tax',
  VAT: 'Value Added Tax (VAT)',
  WITHHOLDING: 'Withholding Tax',
  OTHER: 'Other',
}

// Returns assignments completed (collected) within the given date range.
// "collected" = status COMPLETED with a paymentDate within [start, end).
export async function getCollectedAssignments(start: Date, end: Date) {
  return db.taxAssignment.findMany({
    where: {
      status: 'COMPLETED',
      paymentDate: { gte: start, lt: end },
    },
    select: {
      id: true,
      referenceNo: true,
      amountDue: true,
      paymentAmount: true,
      paymentDate: true,
      bankReceiptNumber: true,
      governmentReceiptNumber: true,
      governmentReceiptIssuedAt: true,
      taxType: true,
      taxPayer: {
        select: {
          id: true,
          tin: true,
          fullName: true,
          category: true,
          woredaId: true,
          woreda: { select: { id: true, code: true, name: true } },
        },
      },
    },
    orderBy: { paymentDate: 'desc' },
  })
}

// All non-cancelled assignments within the date range (for "expected" calc).
export async function getAssignedAssignments(start: Date, end: Date) {
  return db.taxAssignment.findMany({
    where: {
      status: { not: 'CANCELLED' },
      assignedAt: { gte: start, lt: end },
    },
    select: {
      id: true,
      referenceNo: true,
      amountDue: true,
      paymentAmount: true,
      paymentDate: true,
      status: true,
      taxType: true,
      taxPayer: {
        select: { id: true, tin: true, fullName: true, category: true, woredaId: true },
      },
    },
    orderBy: { assignedAt: 'desc' },
  })
}
