// Database setup utility — can be called from /api/setup or run as a script.
// Creates the leader account + sample woredas if they don't exist.
import { db } from './db'
import { hashPassword } from './password'

export interface SetupResult {
  alreadyInitialized: boolean
  created: {
    woredas: number
    staff: number
    taxPayers: number
    taxTargets: number
  }
  leaderCredentials?: { email: string; password: string }
  error?: string
}

// Idempotent setup: checks if the DB is already initialized (has a Leader
// staff account), and if not, seeds the initial data.
export async function setupDatabase(): Promise<SetupResult> {
  // Check if already initialized — any staff with LEADER role means yes
  const existingLeader = await db.staff.findFirst({
    where: { role: 'LEADER' },
  })

  if (existingLeader) {
    return {
      alreadyInitialized: true,
      created: { woredas: 0, staff: 0, taxPayers: 0, taxTargets: 0 },
    }
  }

  // --- 1. Seed woredas ---
  const woredas = [
    { code: '01', name: 'Woreda 01 - Bishoftu Town Center', region: 'Oromia' },
    { code: '02', name: 'Woreda 02 - Lake Side', region: 'Oromia' },
    { code: '03', name: 'Woreda 03 - Africa Avenue', region: 'Oromia' },
    { code: '04', name: 'Woreda 04 - Industrial Zone', region: 'Oromia' },
    { code: '05', name: 'Woreda 05 - Asella Road', region: 'Oromia' },
  ]
  const woredaRecords: Record<string, { id: string }> = {}
  for (const w of woredas) {
    const rec = await db.woreda.upsert({
      where: { code: w.code },
      update: {},
      create: w,
    })
    woredaRecords[w.code] = rec
  }

  // --- 2. Seed staff (Leader + sample team members + Galmeewwan) ---
  const leaderPassword = 'Bishoftu@2026' // default leader password — change after first login
  const staff = [
    { fullName: 'Ato Tesfaye Lemma', email: 'leader@bishoftu.gov.et', phone: '+251911100001', role: 'LEADER', password: leaderPassword, assignedWoredaCode: null },
    { fullName: 'W/ro Almaz Bekele', email: 'almaz.bekele@bishoftu.gov.et', phone: '+251911100002', role: 'TEAM_1_ASSIGNMENT', password: 'Team1@almaz', assignedWoredaCode: null },
    { fullName: 'W/ro Sara Mengistu', email: 'sara.mengistu@bishoftu.gov.et', phone: '+251911100004', role: 'TEAM_2_FINANCE', password: 'Team2@sara', assignedWoredaCode: null },
    { fullName: 'Ato Lemma Tariku', email: 'collector.woreda01@bishoftu.gov.et', phone: '+251911100007', role: 'DATA_COLLECTOR', password: 'Woreda01@lemma', assignedWoredaCode: '01' },
  ]
  let staffCount = 0
  for (const s of staff) {
    const passwordHash = await hashPassword(s.password)
    const existing = await db.staff.findUnique({ where: { email: s.email } })
    if (!existing) {
      await db.staff.create({
        data: {
          fullName: s.fullName,
          email: s.email,
          phone: s.phone,
          role: s.role,
          passwordHash,
          assignedWoredaId: s.assignedWoredaCode ? woredaRecords[s.assignedWoredaCode]?.id : null,
        },
      })
      staffCount++
    }
  }

  // --- 3. Seed yearly tax targets (city-wide) ---
  const fiscalYear = '2026/2027'
  const targets = [
    { fiscalYear, category: 'BUSINESS', expectedAmount: 8_500_000, notes: 'Based on registered business count and last year actual' },
    { fiscalYear, category: 'PROPERTY', expectedAmount: 3_200_000, notes: 'Annual property tax estimate' },
    { fiscalYear, category: 'INDIVIDUAL_INCOME', expectedAmount: 4_800_000, notes: 'Estimated employed + self-employed income tax' },
    { fiscalYear, category: 'VEHICLE', expectedAmount: 950_000, notes: 'Vehicle registration renewals' },
    { fiscalYear, category: 'VAT', expectedAmount: 12_000_000, notes: 'VAT-registered businesses quarterly' },
    { fiscalYear, category: 'WITHHOLDING', expectedAmount: 2_400_000, notes: 'Government withholding tax' },
  ]
  let targetCount = 0
  for (const t of targets) {
    const existing = await db.yearlyTaxTarget.findUnique({
      where: { fiscalYear_woredaId_category: { fiscalYear: t.fiscalYear, woredaId: null, category: t.category } },
    })
    if (!existing) {
      await db.yearlyTaxTarget.create({ data: { ...t, woredaId: null } })
      targetCount++
    }
  }

  return {
    alreadyInitialized: false,
    created: {
      woredas: woredas.length,
      staff: staffCount,
      taxPayers: 0,
      taxTargets: targetCount,
    },
    leaderCredentials: { email: 'leader@bishoftu.gov.et', password: leaderPassword },
  }
}

// Allow running as a standalone script: `bun run src/lib/setup-db.ts`
if (require.main === module) {
  setupDatabase()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2))
      process.exit(0)
    })
    .catch((e) => {
      console.error('Setup failed:', e)
      process.exit(1)
    })
    .finally(() => db.$disconnect())
}
