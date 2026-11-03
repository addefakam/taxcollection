# Bishoftu Finance — Tax Collection Process Control

A Next.js 16 + TypeScript + Prisma + Tailwind CSS 4 + shadcn/ui web application that lets the Bishoftu city Finance Leader follow every tax collection case end-to-end, from assignment to final government receipt.

## Workflow tracked end-to-end

```
1. Tax Payer Registry
   ├── TIN, full name, category, contact, address, woreda, kebele
   ├── Trade license no. + contact person (for businesses)
   ├── Block / unblock flag (suspended tax payers)
   └── Audit trail of every change

2. Team 1 — Assignment
   ├── Picks a tax payer
   ├── Selects tax type, fiscal year, period, amount due, due date
   ├── Assignment is linked to the logged-in staff member
   └── Reference number auto-generated (BF-2026-0001) → status: ASSIGNED

3. Tax Payer Pays at Bank
   └── (out of system — happens physically at any Ethiopian bank)

4. Team 2 — Receives Bank Receipt
   ├── Records bank name, bank receipt no., payment date, amount paid
   ├── Optionally attaches scanned bank receipt (image/PDF, max 5 MB each)
   ├── Files stored as base64 in Postgres
   └── Status → BANK_RECEIPT_SUBMITTED

5. Team 2 — Issues Government Receipt
   ├── Issues official government receipt number (GR-2026-XXXX)
   ├── Auto-completed if left blank
   └── Status → COMPLETED (process closed)

Plus:
- Dispute / under-review flag (Leader can mark/unmark)
- Cancel assignment (Leader only)
- Full audit trail of every status change with staff name + timestamp
```

## Tech stack

- **Next.js 16** with App Router (TypeScript)
- **PostgreSQL** on Neon (serverless Postgres)
- **Prisma ORM**
- **Tailwind CSS 4** + **shadcn/ui** (New York style)
- **Lucide** icons
- **sonner** toasts

## Database schema

Six models in Postgres:

| Model | Purpose |
|---|---|
| `Woreda` | Sub-city / district master table |
| `Staff` | Finance office team members (Leader / Team 1 / Team 2) |
| `TaxPayer` | Tax payer registry with block flag |
| `TaxAssignment` | One tax obligation per period — the central record |
| `BankReceiptAttachment` | Uploaded bank receipt files (base64) |
| `AssignmentHistory` | Full audit timeline of every status change |

## Setup instructions

### 1. Install dependencies

```bash
bun install
```

### 2. Configure your Neon PostgreSQL database

1. Create a free project at https://console.neon.tech
2. Click "Connection string" → copy the **Pooled connection** URL
3. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

4. Edit `.env` and replace `DATABASE_URL` with your Neon connection string. It should look like:

   ```
   DATABASE_URL="postgresql://neondb_owner:npg_xxx@ep-cool-name-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```

### 3. Push the schema to your Neon database

```bash
bun run db:push
```

This creates all tables. (Run `bun run db:push --force-reset` if you ever want to drop & recreate all data.)

### 4. Seed sample data (optional but recommended for first run)

```bash
# Woredas, staff, and 10 sample tax payers
bun run scripts/seed.ts

# Sample tax assignments across all workflow stages
bun run scripts/seed-assignments.ts
```

### 5. Run the dev server

```bash
bun run dev
```

Open http://localhost:3000

## Production deployment

The app is a standard Next.js app and deploys cleanly to Vercel, Netlify, or any Node host.

For Vercel + Neon:
1. Import the GitHub repo into Vercel
2. Add the `DATABASE_URL` environment variable (paste your Neon pooled connection string)
3. Vercel will auto-build with `next build`
4. Run `prisma db push` once against your Neon DB to create tables (run locally with `DATABASE_URL` set to your Neon URL)

## File structure

```
prisma/
  schema.prisma         # Postgres schema (Woreda, Staff, TaxPayer, TaxAssignment, BankReceiptAttachment, AssignmentHistory)

src/app/api/
  woredas/               # Woreda CRUD
  staff/                 # Staff CRUD
  taxpayers/             # Tax payer CRUD + /block endpoint
  assignments/           # Assignment CRUD + /bank-receipt + /government-receipt + /cancel + /dispute + /attachments
  attachments/[id]/      # Download / delete attachment
  stats/                 # Dashboard summary

src/components/tax-system/
  lib.ts                 # Shared constants + formatters
  role-context.tsx       # Staff identity provider (persisted in localStorage)
  header.tsx             # Staff selector dropdown (replaces free-text name)
  dashboard.tsx          # Leader dashboard with KPIs, woreda breakdown, staff count
  taxpayers.tsx          # Tax payer registry with woreda / block / trade license
  assignments.tsx        # Assignments with dispute flag + bank receipt attachments
  process-tracker.tsx    # Kanban board with disputed indicators

scripts/
  seed.ts                # Woredas + staff + 10 tax payers
  seed-assignments.ts    # 8 sample assignments across all statuses (incl. 1 disputed)
```

## Roles & permissions

| Action | Leader | Team 1 — Assignment | Team 2 — Finance Office |
|---|:---:|:---:|:---:|
| View dashboard, registry, assignments | ✅ | ✅ | ✅ |
| Add / edit / deactivate tax payers | ✅ | ✅ | — |
| Block / unblock tax payers | ✅ | — | — |
| Create new assignment | ✅ | ✅ | — |
| Receive bank receipt (+ attachments) | ✅ | — | ✅ |
| Issue government receipt | ✅ | — | ✅ |
| Mark / resolve dispute | ✅ | — | — |
| Issue govt receipt while disputed | ✅ | — | — |
| Cancel assignment | ✅ | — | — |
| Delete attachments | ✅ | — | — |

The role is determined by the selected staff member (stored in localStorage), so each team member logs in by picking their own name from the staff dropdown in the header.

## Development commands

```bash
bun run dev          # Start dev server (port 3000)
bun run lint         # ESLint check
bun run db:push      # Push schema to database
bun run db:studio    # Open Prisma Studio (GUI for the DB)
```

## License

Internal use — Bishoftu City Finance Office.
