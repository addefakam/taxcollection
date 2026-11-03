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

### 2. Configure your Neon PostgreSQL database + session secret

1. Create a free project at https://console.neon.tech
2. Click "Connection string" → copy the **Pooled connection** URL
3. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

4. Edit `.env`:
   - Set `DATABASE_URL` to your Neon pooled connection string. It should look like:
     ```
     DATABASE_URL="postgresql://neondb_owner:npg_xxx@ep-cool-name-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
     ```
   - Set `SESSION_SECRET` to a long random string (at least 32 characters). Generate one with:
     ```bash
     openssl rand -base64 48
     ```

### 3. Push the schema to your Neon database

```bash
bun run db:push
```

This creates all tables (Woreda, Staff, TaxPayer, TaxAssignment, BankReceiptAttachment, AssignmentHistory).

### 4. Seed sample data (creates the default Leader account)

```bash
# Woredas + staff (with passwords) + 10 sample tax payers
bun run scripts/seed.ts

# Sample tax assignments across all workflow stages
bun run scripts/seed-assignments.ts
```

The seed script will print the default Leader credentials:

```
LEADER LOGIN: leader@bishoftu.gov.et / Bishoftu@2026
```

⚠️ **Change this password immediately after first login** via the user menu → "Change password".

### 5. Run the dev server

```bash
bun run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`.

## Authentication

Every user must log in with email + password. Sessions are signed JWTs stored in httpOnly cookies (8-hour expiry).

- The `Staff` model stores `passwordHash` (bcrypt, 10 rounds)
- Every API route checks the session via `getSession()` or `requireRole(...)`
- Permission matrix is enforced **server-side** (not just hidden in the UI):

| Action | Leader | Team 1 — Assignment | Team 2 — Finance Office | City Revenue Officer |
|---|:---:|:---:|:---:|:---:|
| View dashboard, registry, assignments | ✅ | ✅ | ✅ | ✅ |
| Add / edit / deactivate tax payers | ✅ | ✅ | — | — |
| Block / unblock tax payers | ✅ | — | — | — |
| Create new assignment | ✅ | ✅ | — | — |
| Receive bank receipt (+ attachments) | ✅ | — | ✅ | — |
| Issue government receipt | ✅ | — | ✅ | — |
| Issue govt receipt while disputed | ✅ | — | — | — |
| Mark / resolve dispute | ✅ | — | — | — |
| Cancel assignment | ✅ | — | — | — |
| Delete attachments | ✅ | — | — | — |
| Manage staff (add, edit, reset password, deactivate) | ✅ | — | — | — |
| View City Revenue dashboard + Tax Targets | ✅ | — | — | ✅ |
| Set / edit / delete yearly tax targets | ✅ | — | — | — |

## City Revenue Officer role

A dedicated role for following up city-wide income. Has read access to two extra tabs:

- **City Revenue** — compares expected vs collected tax across all categories for the selected fiscal year:
  - 4 top KPIs: Expected (yearly target), Collected (so far), Outstanding, Collection Rate %
  - 4 period totals: Today, This Week, This Month, This Fiscal Year (all in ETB)
  - City-wide collection progress bar (X% of target)
  - Expected vs Collected table broken down by category (Business, Property, Individual Income, Vehicle, VAT, Withholding) with rate badges
  - Collection trend chart (toggle between Daily / Weekly / Monthly view)
  - Recent collections feed (last 15 completed payments, auto-refreshes every 30s)
  - Fiscal year selector
- **Tax Targets** — view the yearly expected tax targets set by the Leader (city-wide and per-woreda, per-category). The City Revenue Officer can view but not edit; only the Leader can create/edit/delete targets.

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

src/lib/
  auth.ts               # JWT session helpers (getSession, requireSession, requireRole, createSession, destroySession)
  password.ts           # bcrypt hash / verify
  db.ts                 # Prisma client singleton

src/app/
  page.ts               # Server Component — checks session, redirects to /login if not authed
  layout.tsx
  login/page.tsx        # Login form
  api/
    auth/
      login/            # POST email+password, creates session
      logout/           # POST clears session
      me/               # GET current session user
      change-password/  # POST change own password
    woredas/            # Woreda CRUD (Leader only for write)
    staff/              # Staff CRUD (Leader only) + /reset-password
    taxpayers/          # Tax payer CRUD + /block endpoint
    assignments/        # Assignment CRUD + /bank-receipt + /government-receipt + /cancel + /dispute + /attachments
    attachments/[id]/    # Download / delete attachment
    stats/              # Dashboard summary

src/components/tax-system/
  app-shell.tsx         # Main layout + tab routing (wraps in RoleProvider)
  role-context.tsx      # Session-based role provider (read-only)
  header.tsx            # User menu (name, role, change password, logout)
  dashboard.tsx         # Leader dashboard with KPIs, woreda breakdown, staff count
  taxpayers.tsx         # Tax payer registry with woreda / block / trade license
  assignments.tsx       # Assignments with dispute flag + bank receipt attachments
  process-tracker.tsx   # Kanban board with disputed indicators
  staff-management.tsx  # Leader-only: add staff, reset passwords, deactivate

scripts/
  seed.ts               # Woredas + staff (with passwords) + 10 tax payers
  seed-assignments.ts   # 8 sample assignments across all statuses (incl. 1 disputed)
```

## Roles & permissions

Permissions are enforced at the API level using `requireRole(...)` from `src/lib/auth.ts`. The role is determined by the logged-in staff member (from the JWT session, not from a free-text input). See the matrix above in the **Authentication** section.

## Development commands

```bash
bun run dev          # Start dev server (port 3000)
bun run lint         # ESLint check
bun run db:push      # Push schema to database
bun run db:studio    # Open Prisma Studio (GUI for the DB)
```

## License

Internal use — Bishoftu City Finance Office.
