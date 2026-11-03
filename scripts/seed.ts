// Seed script - populates the database with sample tax payers in Bishoftu
import { db } from '../src/lib/db'

const sampleTaxPayers = [
  {
    tin: 'BT-0001-2026',
    fullName: 'Admasu General Trading PLC',
    category: 'BUSINESS',
    phone: '+251911234567',
    email: 'admasu.trading@gmail.com',
    address: 'Bole Road, Near Bishoftu Tower',
    woreda: '01',
    kebele: '03',
  },
  {
    tin: 'BT-0002-2026',
    fullName: 'Chelchel Restaurant',
    category: 'BUSINESS',
    phone: '+251911345678',
    address: 'Lake Side, Bishoftu',
    woreda: '02',
    kebele: '05',
  },
  {
    tin: 'BT-0003-2026',
    fullName: 'Bekele Tadesse',
    category: 'INDIVIDUAL_INCOME',
    phone: '+251911456789',
    address: 'Kebe 08, Bishoftu',
    woreda: '03',
    kebele: '08',
  },
  {
    tin: 'BT-0004-2026',
    fullName: 'Green Land Hotel',
    category: 'BUSINESS',
    phone: '+251911567890',
    email: 'greenland.hotel@gmail.com',
    address: 'Main Road, Bishoftu',
    woreda: '01',
    kebele: '01',
  },
  {
    tin: 'BT-0005-2026',
    fullName: 'Hirut Bekele',
    category: 'PROPERTY',
    phone: '+251911678901',
    address: 'Africa Avenue, Bishoftu',
    woreda: '02',
    kebele: '02',
  },
  {
    tin: 'BT-0006-2026',
    fullName: 'Bishoftu Construction Ltd',
    category: 'BUSINESS',
    phone: '+251911789012',
    email: 'info@bishoftuconstruction.com',
    address: 'Industrial Zone, Bishoftu',
    woreda: '04',
    kebele: '11',
  },
  {
    tin: 'BT-0007-2026',
    fullName: 'Solomon Girma',
    category: 'VEHICLE',
    phone: '+251911890123',
    address: 'Wello Sefer, Bishoftu',
    woreda: '02',
    kebele: '07',
  },
  {
    tin: 'BT-0008-2026',
    fullName: 'Lake View Real Estate',
    category: 'PROPERTY',
    phone: '+251911901234',
    email: 'lakeview.re@gmail.com',
    address: 'Lake Front, Bishoftu',
    woreda: '03',
    kebele: '04',
  },
  {
    tin: 'BT-0009-2026',
    fullName: 'Marta Teshome',
    category: 'INDIVIDUAL_INCOME',
    phone: '+251912012345',
    address: 'Asella Road, Bishoftu',
    woreda: '01',
    kebele: '06',
  },
  {
    tin: 'BT-0010-2026',
    fullName: 'Dashen Supermarket Bishoftu',
    category: 'VAT',
    phone: '+251912123456',
    email: 'dashen.bishoftu@dashenbank.com',
    address: 'Central Market, Bishoftu',
    woreda: '02',
    kebele: '01',
  },
]

async function main() {
  console.log('Seeding tax payers...')
  for (const tp of sampleTaxPayers) {
    await db.taxPayer.upsert({
      where: { tin: tp.tin },
      update: {},
      create: tp,
    })
  }
  console.log(`Seeded ${sampleTaxPayers.length} tax payers.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
