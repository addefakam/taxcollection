// Shared types, constants, and helpers for the Bishoftu Tax Collection System

export type Role = 'LEADER' | 'TEAM_1_ASSIGNMENT' | 'TEAM_2_FINANCE'

export const ROLES: Record<Role, { label: string; description: string }> = {
  LEADER: {
    label: 'Finance Leader',
    description: 'Full visibility of the entire tax collection process',
  },
  TEAM_1_ASSIGNMENT: {
    label: 'Team 1 — Assignment',
    description: 'Assigns tax payers who must pay, with the amount and tax type',
  },
  TEAM_2_FINANCE: {
    label: 'Team 2 — Finance Office',
    description: 'Receives bank receipts and issues government receipts',
  },
}

// Workflow status of a tax assignment
export type AssignmentStatus =
  | 'ASSIGNED' // Team 1 created assignment — tax payer is to pay at bank
  | 'BANK_RECEIPT_SUBMITTED' // Tax payer returned with bank receipt to Team 2
  | 'VERIFIED' // Team 2 verified the bank receipt (intermediate step)
  | 'COMPLETED' // Team 2 issued the government receipt — done
  | 'CANCELLED'

export const STATUS_META: Record<
  AssignmentStatus,
  { label: string; step: number; color: string; bg: string; text: string }
> = {
  ASSIGNED: {
    label: 'Assigned — Awaiting Payment',
    step: 1,
    color: 'amber',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
  },
  BANK_RECEIPT_SUBMITTED: {
    label: 'Bank Receipt Submitted',
    step: 2,
    color: 'sky',
    bg: 'bg-sky-100 dark:bg-sky-900/30',
    text: 'text-sky-700 dark:text-sky-300',
  },
  VERIFIED: {
    label: 'Bank Receipt Verified',
    step: 3,
    color: 'violet',
    bg: 'bg-violet-100 dark:bg-violet-900/30',
    text: 'text-violet-700 dark:text-violet-300',
  },
  COMPLETED: {
    label: 'Completed — Govt Receipt Issued',
    step: 4,
    color: 'emerald',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  CANCELLED: {
    label: 'Cancelled',
    step: -1,
    color: 'rose',
    bg: 'bg-rose-100 dark:bg-rose-900/30',
    text: 'text-rose-700 dark:text-rose-300',
  },
}

export const TAX_CATEGORIES = [
  { value: 'BUSINESS', label: 'Business' },
  { value: 'PROPERTY', label: 'Property' },
  { value: 'INDIVIDUAL_INCOME', label: 'Individual Income' },
  { value: 'VEHICLE', label: 'Vehicle' },
  { value: 'VAT', label: 'VAT' },
  { value: 'WITHHOLDING', label: 'Withholding' },
] as const

export const TAX_TYPES = [
  'Business Income Tax',
  'Property Tax',
  'Individual Income Tax',
  'Value Added Tax (VAT)',
  'Withholding Tax',
  'Vehicle Tax',
  'Rental Income Tax',
  'Penalty / Interest',
] as const

export const PERIODS = ['Q1', 'Q2', 'Q3', 'Q4', 'ANNUAL', 'MONTHLY'] as const

export const BANKS = [
  'Commercial Bank of Ethiopia (CBE)',
  'Dashen Bank',
  'Awash Bank',
  'Bank of Abyssinia',
  'Wegagen Bank',
  'Hibret Bank',
  'United Bank',
  'Nib International Bank',
  'Berhan Bank',
  'Cooperative Bank of Oromia',
] as const

export const FISCAL_YEARS = (() => {
  const year = new Date().getFullYear()
  return [
    `${year - 1}/${year}`,
    `${year}/${year + 1}`,
    `${year + 1}/${year + 2}`,
  ]
})()

// Formatters
export function fmtETB(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return '—'
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: 'ETB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount))
}

export function fmtNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return new Intl.NumberFormat('en-ET').format(Number(n))
}

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function fmtDateShort(d: string | Date | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function categoryLabel(value: string): string {
  return TAX_CATEGORIES.find((c) => c.value === value)?.label || value
}
