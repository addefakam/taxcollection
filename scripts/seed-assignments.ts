// Seed sample tax assignments across various workflow stages
// so the leader dashboard shows the system in action
import { db } from '../src/lib/db'

async function main() {
  const taxpayers = await db.taxPayer.findMany({ include: { woreda: true } })
  if (taxpayers.length === 0) {
    console.log('No tax payers found. Run seed.ts first.')
    return
  }
  const byTin = Object.fromEntries(taxpayers.map((t) => [t.tin, t]))

  const staff = await db.staff.findMany()
  if (staff.length === 0) {
    console.log('No staff found. Run seed.ts first.')
    return
  }
  const byEmail = Object.fromEntries(staff.map((s) => [s.email, s]))

  const t1a = byEmail['almaz.bekele@bishoftu.gov.et'] // Team 1
  const t1b = byEmail['dawit.girma@bishoftu.gov.et'] // Team 1
  const t2a = byEmail['sara.mengistu@bishoftu.gov.et'] // Team 2
  const t2b = byEmail['yonas.tadesse@bishoftu.gov.et'] // Team 2

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
    assignedByEmail: string
    daysAgoAssigned: number
    daysAgoDue: number
    // bank receipt
    bankName?: string
    bankReceiptNumber?: string
    paymentAmount?: number
    daysAgoPaid?: number
    receivedByEmail?: string
    // govt receipt
    governmentReceiptNumber?: string
    issuedByEmail?: string
    daysAgoIssued?: number
    disputed?: boolean
    disputeReason?: string
  }

  const defs: AssignDef[] = [
    // ASSIGNED — awaiting payment
    {
      tin: 'BT-0001-2026',
      fiscalYear: '2026/2027',
      period: 'Q1',
      taxType: 'Business Income Tax',
      amountDue: 45000,
      description: 'Q1 business income tax based on previous year assessment',
      assignedByEmail: t1a.email,
      daysAgoAssigned: 2,
      daysAgoDue: 12,
    },
    {
      tin: 'BT-0007-2026',
      fiscalYear: '2026/2027',
      period: 'Q1',
      taxType: 'Vehicle Tax',
      amountDue: 3200,
      assignedByEmail: t1b.email,
      daysAgoAssigned: 5,
      daysAgoDue: 9,
    },
    // BANK_RECEIPT_SUBMITTED — awaiting govt receipt (one disputed)
    {
      tin: 'BT-0002-2026',
      fiscalYear: '2026/2027',
      period: 'Q1',
      taxType: 'Business Income Tax',
      amountDue: 12500,
      assignedByEmail: t1a.email,
      daysAgoAssigned: 8,
      daysAgoDue: -2,
      bankName: 'Commercial Bank of Ethiopia (CBE)',
      bankReceiptNumber: 'CBE-55128749',
      paymentAmount: 12500,
      daysAgoPaid: 1,
      receivedByEmail: t2a.email,
    },
    {
      tin: 'BT-0009-2026',
      fiscalYear: '2026/2027',
      period: 'ANNUAL',
      taxType: 'Individual Income Tax',
      amountDue: 18750,
      assignedByEmail: t1b.email,
      daysAgoAssigned: 14,
      daysAgoDue: -5,
      bankName: 'Awash Bank',
      bankReceiptNumber: 'AW-9981234',
      paymentAmount: 18000, // less than due -> disputed
      daysAgoPaid: 2,
      receivedByEmail: t2b.email,
      disputed: true,
      disputeReason: 'Paid amount (ETB 18,000) is less than amount due (ETB 18,750). Tax payer claims penalty waived.',
    },
    // COMPLETED — full cycle done
    {
      tin: 'BT-0006-2026',
      fiscalYear: '2025/2026',
      period: 'Q4',
      taxType: 'Value Added Tax (VAT)',
      amountDue: 87500,
      assignedByEmail: t1a.email,
      daysAgoAssigned: 30,
      daysAgoDue: -8,
      bankName: 'Dashen Bank',
      bankReceiptNumber: 'DB-4477123',
      paymentAmount: 87500,
      daysAgoPaid: 20,
      receivedByEmail: t2a.email,
      governmentReceiptNumber: 'GR-2026-0042',
      issuedByEmail: t2a.email,
      daysAgoIssued: 19,
    },
    {
      tin: 'BT-0008-2026',
      fiscalYear: '2025/2026',
      period: 'ANNUAL',
      taxType: 'Property Tax',
      amountDue: 24000,
      assignedByEmail: t1b.email,
      daysAgoAssigned: 45,
      daysAgoDue: -15,
      bankName: 'Bank of Abyssinia',
      bankReceiptNumber: 'AB-2201845',
      paymentAmount: 24000,
      daysAgoPaid: 28,
      receivedByEmail: t2b.email,
      governmentReceiptNumber: 'GR-2026-0039',
      issuedByEmail: t2b.email,
      daysAgoIssued: 27,
    },
    {
      tin: 'BT-0010-2026',
      fiscalYear: '2025/2026',
      period: 'Q4',
      taxType: 'Value Added Tax (VAT)',
      amountDue: 63200,
      assignedByEmail: t1a.email,
      daysAgoAssigned: 60,
      daysAgoDue: -25,
      bankName: 'Commercial Bank of Ethiopia (CBE)',
      bankReceiptNumber: 'CBE-3311890',
      paymentAmount: 63200,
      daysAgoPaid: 35,
      receivedByEmail: t2a.email,
      governmentReceiptNumber: 'GR-2026-0035',
      issuedByEmail: t2a.email,
      daysAgoIssued: 34,
    },
    // CANCELLED
    {
      tin: 'BT-0003-2026',
      fiscalYear: '2025/2026',
      period: 'Q3',
      taxType: 'Individual Income Tax',
      amountDue: 9800,
      assignedByEmail: t1b.email,
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

    const assignedBy = byEmail[def.assignedByEmail]
    const receivedBy = def.receivedByEmail ? byEmail[def.receivedByEmail] : null
    const issuedBy = def.issuedByEmail ? byEmail[def.issuedByEmail] : null

    const assignedAt = new Date(now - def.daysAgoAssigned * day)
    const dueDate = new Date(now + def.daysAgoDue * day)

    let finalStatus = 'ASSIGNED'
    if (def.governmentReceiptNumber) finalStatus = 'COMPLETED'
    else if (def.bankReceiptNumber) finalStatus = 'BANK_RECEIPT_SUBMITTED'
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
        assignedByStaffId: assignedBy?.id || null,
        assignedByName: assignedBy?.fullName || 'Unknown',
        assignedAt,
        dueDate,
        status: finalStatus,
        bankName: def.bankName || null,
        bankReceiptNumber: def.bankReceiptNumber || null,
        paymentDate: def.daysAgoPaid ? new Date(now - def.daysAgoPaid * day) : null,
        paymentAmount: def.paymentAmount || null,
        bankReceiptReceivedByStaffId: receivedBy?.id || null,
        bankReceiptReceivedByName: receivedBy?.fullName || null,
        bankReceiptReceivedAt: def.daysAgoPaid
          ? new Date(now - def.daysAgoPaid * day)
          : null,
        governmentReceiptNumber: def.governmentReceiptNumber || null,
        governmentReceiptIssuedByStaffId: issuedBy?.id || null,
        governmentReceiptIssuedByName: issuedBy?.fullName || null,
        governmentReceiptIssuedAt: def.daysAgoIssued
          ? new Date(now - def.daysAgoIssued * day)
          : null,
        disputed: !!def.disputed,
        disputeReason: def.disputed ? def.disputeReason || null : null,
        disputedAt: def.disputed ? new Date(now - (def.daysAgoPaid || 1) * day) : null,
        disputedByStaffId: def.disputed ? (receivedBy?.id || null) : null,
        notes: finalStatus === 'CANCELLED' ? 'Cancelled: duplicate assignment' : null,
      },
    })

    // History: ASSIGN
    await db.assignmentHistory.create({
      data: {
        assignmentId: assignment.id,
        action: 'ASSIGN',
        toStatus: 'ASSIGNED',
        performedByStaffId: assignedBy?.id || null,
        performedByName: assignedBy?.fullName || 'Unknown',
        note: `Tax of ETB ${def.amountDue.toLocaleString()} (${def.taxType}, ${def.fiscalYear} ${def.period}) assigned to ${tp.fullName}`,
        timestamp: assignedAt,
      },
    })

    if (def.bankReceiptNumber) {
      await db.assignmentHistory.create({
        data: {
          assignmentId: assignment.id,
          action: 'BANK_RECEIPT_RECEIVED',
          fromStatus: 'ASSIGNED',
          toStatus: 'BANK_RECEIPT_SUBMITTED',
          performedByStaffId: receivedBy?.id || null,
          performedByName: receivedBy?.fullName || 'Unknown',
          note: `Bank receipt received from tax payer (${def.bankReceiptNumber}, ${def.bankName}, ETB ${(def.paymentAmount || 0).toLocaleString()})`,
          timestamp: new Date(now - (def.daysAgoPaid || 0) * day),
        },
      })
    }

    if (def.disputed) {
      await db.assignmentHistory.create({
        data: {
          assignmentId: assignment.id,
          action: 'DISPUTE',
          fromStatus: 'BANK_RECEIPT_SUBMITTED',
          toStatus: 'BANK_RECEIPT_SUBMITTED',
          performedByStaffId: receivedBy?.id || null,
          performedByName: receivedBy?.fullName || 'Unknown',
          note: `Marked as disputed: ${def.disputeReason}`,
          timestamp: new Date(now - (def.daysAgoPaid || 1) * day + 3600000),
        },
      })
    }

    if (def.governmentReceiptNumber) {
      await db.assignmentHistory.create({
        data: {
          assignmentId: assignment.id,
          action: 'ISSUE_GOVERNMENT_RECEIPT',
          fromStatus: 'BANK_RECEIPT_SUBMITTED',
          toStatus: 'COMPLETED',
          performedByStaffId: issuedBy?.id || null,
          performedByName: issuedBy?.fullName || 'Unknown',
          note: `Government receipt ${def.governmentReceiptNumber} issued to ${tp.fullName}. Process completed.`,
          timestamp: new Date(now - (def.daysAgoIssued || 0) * day),
        },
      })
    }

    if (finalStatus === 'CANCELLED') {
      await db.assignmentHistory.create({
        data: {
          assignmentId: assignment.id,
          action: 'CANCEL',
          fromStatus: 'ASSIGNED',
          toStatus: 'CANCELLED',
          performedByStaffId: assignedBy?.id || null,
          performedByName: assignedBy?.fullName || 'Unknown',
          note: 'Cancelled: duplicate assignment',
          timestamp: new Date(now - (def.daysAgoAssigned - 5) * day),
        },
      })
    }

    console.log(`Created ${referenceNo} for ${tp.fullName} (${finalStatus}${def.disputed ? ', disputed' : ''})`)
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
