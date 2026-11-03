// Seed sample tax assignments across various workflow stages
// so the leader dashboard shows the system in action
import { db } from '../src/lib/db'

async function main() {
  const taxpayers = await db.taxPayer.findMany()
  if (taxpayers.length === 0) {
    console.log('No tax payers found. Run seed.ts first.')
    return
  }
  const byTin = Object.fromEntries(taxpayers.map((t) => [t.tin, t]))

  // Get current count for reference numbering
  const existing = await db.taxAssignment.count()
  let counter = existing

  interface AssignDef {
    tin: string
    fiscalYear: string
    period: string
    taxType: string
    amountDue: number
    description?: string
    assignedBy: string
    daysAgoAssigned: number
    daysAgoDue: number
    // bank receipt
    bankName?: string
    bankReceiptNumber?: string
    paymentAmount?: number
    daysAgoPaid?: number
    bankReceiptReceivedBy?: string
    // govt receipt
    governmentReceiptNumber?: string
    governmentReceiptIssuedBy?: string
    daysAgoIssued?: number
  }

  const defs: AssignDef[] = [
    // ASSIGNED — awaiting payment (2 cases)
    {
      tin: 'BT-0001-2026',
      fiscalYear: '2026/2027',
      period: 'Q1',
      taxType: 'Business Income Tax',
      amountDue: 45000,
      description: 'Q1 business income tax based on previous year assessment',
      assignedBy: 'Alemu T.',
      daysAgoAssigned: 2,
      daysAgoDue: 12,
    },
    {
      tin: 'BT-0007-2026',
      fiscalYear: '2026/2027',
      period: 'Q1',
      taxType: 'Vehicle Tax',
      amountDue: 3200,
      assignedBy: 'Alemu T.',
      daysAgoAssigned: 5,
      daysAgoDue: 9,
    },
    // BANK_RECEIPT_SUBMITTED — awaiting govt receipt (2 cases)
    {
      tin: 'BT-0002-2026',
      fiscalYear: '2026/2027',
      period: 'Q1',
      taxType: 'Business Income Tax',
      amountDue: 12500,
      assignedBy: 'Alemu T.',
      daysAgoAssigned: 8,
      daysAgoDue: -2,
      bankName: 'Commercial Bank of Ethiopia (CBE)',
      bankReceiptNumber: 'CBE-55128749',
      paymentAmount: 12500,
      daysAgoPaid: 1,
      bankReceiptReceivedBy: 'Sara M.',
    },
    {
      tin: 'BT-0009-2026',
      fiscalYear: '2026/2027',
      period: 'ANNUAL',
      taxType: 'Individual Income Tax',
      amountDue: 18750,
      assignedBy: 'Alemu T.',
      daysAgoAssigned: 14,
      daysAgoDue: -5,
      bankName: 'Awash Bank',
      bankReceiptNumber: 'AW-9981234',
      paymentAmount: 18750,
      daysAgoPaid: 2,
      bankReceiptReceivedBy: 'Sara M.',
    },
    // COMPLETED — full cycle done (3 cases)
    {
      tin: 'BT-0006-2026',
      fiscalYear: '2025/2026',
      period: 'Q4',
      taxType: 'Value Added Tax (VAT)',
      amountDue: 87500,
      assignedBy: 'Alemu T.',
      daysAgoAssigned: 30,
      daysAgoDue: -8,
      bankName: 'Dashen Bank',
      bankReceiptNumber: 'DB-4477123',
      paymentAmount: 87500,
      daysAgoPaid: 20,
      bankReceiptReceivedBy: 'Sara M.',
      governmentReceiptNumber: 'GR-2026-0042',
      governmentReceiptIssuedBy: 'Sara M.',
      daysAgoIssued: 19,
    },
    {
      tin: 'BT-0008-2026',
      fiscalYear: '2025/2026',
      period: 'ANNUAL',
      taxType: 'Property Tax',
      amountDue: 24000,
      assignedBy: 'Alemu T.',
      daysAgoAssigned: 45,
      daysAgoDue: -15,
      bankName: 'Bank of Abyssinia',
      bankReceiptNumber: 'AB-2201845',
      paymentAmount: 24000,
      daysAgoPaid: 28,
      bankReceiptReceivedBy: 'Sara M.',
      governmentReceiptNumber: 'GR-2026-0039',
      governmentReceiptIssuedBy: 'Sara M.',
      daysAgoIssued: 27,
    },
    {
      tin: 'BT-0010-2026',
      fiscalYear: '2025/2026',
      period: 'Q4',
      taxType: 'Value Added Tax (VAT)',
      amountDue: 63200,
      assignedBy: 'Alemu T.',
      daysAgoAssigned: 60,
      daysAgoDue: -25,
      bankName: 'Commercial Bank of Ethiopia (CBE)',
      bankReceiptNumber: 'CBE-3311890',
      paymentAmount: 63200,
      daysAgoPaid: 35,
      bankReceiptReceivedBy: 'Sara M.',
      governmentReceiptNumber: 'GR-2026-0035',
      governmentReceiptIssuedBy: 'Sara M.',
      daysAgoIssued: 34,
    },
    // CANCELLED — (1 case)
    {
      tin: 'BT-0003-2026',
      fiscalYear: '2025/2026',
      period: 'Q3',
      taxType: 'Individual Income Tax',
      amountDue: 9800,
      assignedBy: 'Alemu T.',
      daysAgoAssigned: 50,
      daysAgoDue: -10,
    },
  ]

  const now = Date.now()
  const day = 24 * 60 * 60 * 1000

  for (const def of defs) {
    const tp = byTin[def.tin]
    if (!tp) {
      console.log(`WARN: TIN ${def.tin} not found, skipping`)
      continue
    }

    counter += 1
    const year = new Date().getFullYear()
    const referenceNo = `BF-${year}-${String(counter).padStart(4, '0')}`

    // Skip if already exists by reference
    const exists = await db.taxAssignment.findUnique({ where: { referenceNo } })
    if (exists) {
      console.log(`SKIP ${referenceNo} (already exists)`)
      continue
    }

    const assignedAt = new Date(now - def.daysAgoAssigned * day)
    const dueDate = new Date(now + def.daysAgoDue * day)

    // Determine final status based on which fields are filled
    let finalStatus = 'ASSIGNED'
    if (def.governmentReceiptNumber) finalStatus = 'COMPLETED'
    else if (def.bankReceiptNumber) finalStatus = 'BANK_RECEIPT_SUBMITTED'

    // For the cancelled one (BT-0003-2026), keep status as CANCELLED
    if (def.tin === 'BT-0003-2026') finalStatus = 'CANCELLED'

    const assignment = await db.taxAssignment.create({
      data: {
        referenceNo,
        taxPayerId: tp.id,
        fiscalYear: def.fiscalYear,
        period: def.period,
        taxType: def.taxType,
        description: def.description || null,
        amountDue: def.amountDue,
        assignedBy: def.assignedBy,
        assignedAt,
        dueDate,
        status: finalStatus,
        bankName: def.bankName || null,
        bankReceiptNumber: def.bankReceiptNumber || null,
        paymentDate: def.daysAgoPaid ? new Date(now - def.daysAgoPaid * day) : null,
        paymentAmount: def.paymentAmount || null,
        bankReceiptReceivedBy: def.bankReceiptReceivedBy || null,
        bankReceiptReceivedAt: def.daysAgoPaid
          ? new Date(now - def.daysAgoPaid * day)
          : null,
        governmentReceiptNumber: def.governmentReceiptNumber || null,
        governmentReceiptIssuedBy: def.governmentReceiptIssuedBy || null,
        governmentReceiptIssuedAt: def.daysAgoIssued
          ? new Date(now - def.daysAgoIssued * day)
          : null,
        notes: finalStatus === 'CANCELLED' ? 'Cancelled: duplicate assignment' : null,
      },
    })

    // History: ASSIGN
    await db.assignmentHistory.create({
      data: {
        assignmentId: assignment.id,
        action: 'ASSIGN',
        toStatus: 'ASSIGNED',
        performedBy: def.assignedBy,
        note: `Tax of ETB ${def.amountDue.toLocaleString()} (${def.taxType}, ${def.fiscalYear} ${def.period}) assigned to ${tp.fullName}`,
        timestamp: assignedAt,
      },
    })

    // History: BANK_RECEIPT_RECEIVED
    if (def.bankReceiptNumber) {
      await db.assignmentHistory.create({
        data: {
          assignmentId: assignment.id,
          action: 'BANK_RECEIPT_RECEIVED',
          fromStatus: 'ASSIGNED',
          toStatus: 'BANK_RECEIPT_SUBMITTED',
          performedBy: def.bankReceiptReceivedBy || 'system',
          note: `Bank receipt received from tax payer (${def.bankReceiptNumber}, ${def.bankName}, ETB ${(def.paymentAmount || 0).toLocaleString()})`,
          timestamp: new Date(now - (def.daysAgoPaid || 0) * day),
        },
      })
    }

    // History: ISSUE_GOVERNMENT_RECEIPT
    if (def.governmentReceiptNumber) {
      await db.assignmentHistory.create({
        data: {
          assignmentId: assignment.id,
          action: 'ISSUE_GOVERNMENT_RECEIPT',
          fromStatus: 'BANK_RECEIPT_SUBMITTED',
          toStatus: 'COMPLETED',
          performedBy: def.governmentReceiptIssuedBy || 'system',
          note: `Government receipt ${def.governmentReceiptNumber} issued to ${tp.fullName}. Process completed.`,
          timestamp: new Date(now - (def.daysAgoIssued || 0) * day),
        },
      })
    }

    // History: CANCEL
    if (finalStatus === 'CANCELLED') {
      await db.assignmentHistory.create({
        data: {
          assignmentId: assignment.id,
          action: 'CANCEL',
          fromStatus: 'ASSIGNED',
          toStatus: 'CANCELLED',
          performedBy: 'Leader',
          note: 'Cancelled: duplicate assignment',
          timestamp: new Date(now - (def.daysAgoAssigned - 5) * day),
        },
      })
    }

    console.log(`Created ${referenceNo} for ${tp.fullName} (${finalStatus})`)
  }
  console.log('Done.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
