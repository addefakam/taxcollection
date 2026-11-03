// Seed script - populates the database with woredas, staff, and sample tax payers in Bishoftu
import { db } from '../src/lib/db'

async function main() {
  console.log('1. Seeding Woredas...')
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
    console.log(`  Woreda ${w.code}: ${w.name}`)
  }

  console.log('\n2. Seeding Staff...')
  const staff = [
    { fullName: 'Ato Tesfaye Lemma', email: 'tesfaye.lemma@bishoftu.gov.et', phone: '+251911100001', role: 'LEADER' },
    { fullName: 'W/ro Almaz Bekele', email: 'almaz.bekele@bishoftu.gov.et', phone: '+251911100002', role: 'TEAM_1_ASSIGNMENT' },
    { fullName: 'Ato Dawit Girma', email: 'dawit.girma@bishoftu.gov.et', phone: '+251911100003', role: 'TEAM_1_ASSIGNMENT' },
    { fullName: 'W/ro Sara Mengistu', email: 'sara.mengistu@bishoftu.gov.et', phone: '+251911100004', role: 'TEAM_2_FINANCE' },
    { fullName: 'Ato Yonas Tadesse', email: 'yonas.tadesse@bishoftu.gov.et', phone: '+251911100005', role: 'TEAM_2_FINANCE' },
  ]
  const staffRecords: Record<string, { id: string }> = {}
  for (const s of staff) {
    const rec = await db.staff.upsert({
      where: { email: s.email },
      update: {},
      create: s,
    })
    staffRecords[s.email] = rec
    console.log(`  Staff: ${s.fullName} (${s.role})`)
  }

  console.log('\n3. Seeding Tax Payers...')
  const sampleTaxPayers = [
    {
      tin: 'BT-0001-2026',
      fullName: 'Admasu General Trading PLC',
      category: 'BUSINESS',
      phone: '+251911234567',
      email: 'admasu.trading@gmail.com',
      address: 'Bole Road, Near Bishoftu Tower',
      woredaCode: '01',
      kebele: '03',
      tradeLicenseNo: 'BL-001-2018',
      contactPerson: 'Ato Admasu G.',
    },
    {
      tin: 'BT-0002-2026',
      fullName: 'Chelchel Restaurant',
      category: 'BUSINESS',
      phone: '+251911345678',
      address: 'Lake Side, Bishoftu',
      woredaCode: '02',
      kebele: '05',
      tradeLicenseNo: 'BL-002-2019',
      contactPerson: 'W/ro Chelchel A.',
    },
    {
      tin: 'BT-0003-2026',
      fullName: 'Bekele Tadesse',
      category: 'INDIVIDUAL_INCOME',
      phone: '+251911456789',
      address: 'Kebe 08, Bishoftu',
      woredaCode: '03',
      kebele: '08',
    },
    {
      tin: 'BT-0004-2026',
      fullName: 'Green Land Hotel',
      category: 'BUSINESS',
      phone: '+251911567890',
      email: 'greenland.hotel@gmail.com',
      address: 'Main Road, Bishoftu',
      woredaCode: '01',
      kebele: '01',
      tradeLicenseNo: 'BL-004-2015',
      contactPerson: 'Ato Getachew B.',
    },
    {
      tin: 'BT-0005-2026',
      fullName: 'Hirut Bekele',
      category: 'PROPERTY',
      phone: '+251911678901',
      address: 'Africa Avenue, Bishoftu',
      woredaCode: '02',
      kebele: '02',
    },
    {
      tin: 'BT-0006-2026',
      fullName: 'Bishoftu Construction Ltd',
      category: 'BUSINESS',
      phone: '+251911789012',
      email: 'info@bishoftuconstruction.com',
      address: 'Industrial Zone, Bishoftu',
      woredaCode: '04',
      kebele: '11',
      tradeLicenseNo: 'BL-006-2010',
      contactPerson: 'Ato Solomon T.',
    },
    {
      tin: 'BT-0007-2026',
      fullName: 'Solomon Girma',
      category: 'VEHICLE',
      phone: '+251911890123',
      address: 'Wello Sefer, Bishoftu',
      woredaCode: '02',
      kebele: '07',
    },
    {
      tin: 'BT-0008-2026',
      fullName: 'Lake View Real Estate',
      category: 'PROPERTY',
      phone: '+251911901234',
      email: 'lakeview.re@gmail.com',
      address: 'Lake Front, Bishoftu',
      woredaCode: '03',
      kebele: '04',
      tradeLicenseNo: 'BL-008-2020',
      contactPerson: 'W/ro Marta G.',
    },
    {
      tin: 'BT-0009-2026',
      fullName: 'Marta Teshome',
      category: 'INDIVIDUAL_INCOME',
      phone: '+251912012345',
      address: 'Asella Road, Bishoftu',
      woredaCode: '05',
      kebele: '06',
    },
    {
      tin: 'BT-0010-2026',
      fullName: 'Dashen Supermarket Bishoftu',
      category: 'VAT',
      phone: '+251912123456',
      email: 'dashen.bishoftu@dashenbank.com',
      address: 'Central Market, Bishoftu',
      woredaCode: '02',
      kebele: '01',
      tradeLicenseNo: 'BL-010-2012',
      contactPerson: 'Ato Henok D.',
    },
  ]

  for (const tp of sampleTaxPayers) {
    const { woredaCode, ...rest } = tp
    await db.taxPayer.upsert({
      where: { tin: rest.tin },
      update: {},
      create: {
        ...rest,
        woredaId: woredaCode ? woredaRecords[woredaCode]?.id : null,
      },
    })
    console.log(`  TaxPayer: ${rest.tin} - ${rest.fullName}`)
  }

  console.log(`\nDone. Seeded ${woredas.length} woredas, ${staff.length} staff, ${sampleTaxPayers.length} tax payers.`)
  console.log('\nNext step: run `bun run scripts/seed-assignments.ts` to add sample tax assignments.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
