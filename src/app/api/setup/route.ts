import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setupDatabase } from '@/lib/setup-db'

// GET /api/setup — checks if database is initialized, returns status
export async function GET() {
  try {
    // Check if tables exist by counting staff
    const staffCount = await db.staff.count()
    const woredaCount = await db.woreda.count()
    const leaderExists = (await db.staff.findFirst({ where: { role: 'LEADER' } })) !== null

    return NextResponse.json({
      initialized: leaderExists,
      staffCount,
      woredaCount,
      message: leaderExists
        ? 'Database is already initialized. You can log in.'
        : 'Database tables exist but no Leader account found. Run POST /api/setup to seed initial data.',
    })
  } catch (e: unknown) {
    // If tables don't exist, Prisma will throw — check for that
    const error = e as { message?: string; code?: string }
    const msg = error?.message || 'Unknown error'

    // Common Prisma error when tables don't exist:
    // "The table `Staff` does not exist in the current database."
    if (
      msg.includes('does not exist') ||
      msg.includes('relation') ||
      msg.includes('no such table') ||
      error?.code === 'P2021'
    ) {
      return NextResponse.json({
        initialized: false,
        tablesExist: false,
        message:
          'Database tables do not exist yet. Run POST /api/setup to create them. If that fails, run "npx prisma db push" with your DATABASE_URL set.',
      })
    }

    return NextResponse.json(
      {
        initialized: false,
        error: msg,
        message: 'Could not check database state. See error field for details.',
      },
      { status: 500 }
    )
  }
}

// POST /api/setup — creates tables (if needed) and seeds initial data
// This is idempotent — safe to call multiple times.
export async function POST() {
  try {
    const result = await setupDatabase()
    return NextResponse.json({
      ok: true,
      ...result,
      message: result.alreadyInitialized
        ? 'Database was already initialized. No changes made.'
        : 'Database initialized successfully. You can now log in with the Leader credentials.',
    })
  } catch (e: unknown) {
    const error = e as { message?: string; code?: string }
    const msg = error?.message || 'Unknown error'

    // If tables don't exist, try to create them with prisma db push
    if (
      msg.includes('does not exist') ||
      msg.includes('relation') ||
      msg.includes('no such table') ||
      error?.code === 'P2021'
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Tables do not exist in the database.',
          message:
            'Database tables are missing. Please run "npx prisma db push" locally with your Neon DATABASE_URL set in .env, then redeploy. The build step on Vercel should also run this automatically via the "prebuild" script.',
          hint: 'On your local machine: set DATABASE_URL to your Neon connection string in .env, then run: npx prisma db push',
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        ok: false,
        error: msg,
        message: 'Setup failed. See error field for details.',
      },
      { status: 500 }
    )
  }
}
