import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, verifyPassword } from '@/lib/password'
import { createSession } from '@/lib/auth'

// POST /api/auth/login
// Body: { email, password }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email, password } = body

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 }
    )
  }

  const staff = await db.staff.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { assignedWoreda: true },
  })

  if (!staff || !staff.active) {
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    )
  }

  if (!staff.passwordHash) {
    return NextResponse.json(
      {
        error:
          'Your account has no password set. Ask the Leader to reset your password.',
      },
      { status: 403 }
    )
  }

  const ok = await verifyPassword(password, staff.passwordHash)
  if (!ok) {
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    )
  }

  // Validate that DATA_COLLECTOR staff have an assigned woreda
  if (staff.role === 'DATA_COLLECTOR' && !staff.assignedWoredaId) {
    return NextResponse.json(
      {
        error:
          'Your Data Collector account is not assigned to any woreda. Ask the Leader to assign you to a woreda.',
      },
      { status: 403 }
    )
  }

  // Create session with woreda info for DATA_COLLECTOR
  await createSession({
    id: staff.id,
    fullName: staff.fullName,
    email: staff.email,
    role: staff.role as 'LEADER' | 'TEAM_1_ASSIGNMENT' | 'TEAM_2_FINANCE' | 'CITY_REVENUE_OFFICER' | 'DATA_COLLECTOR',
    assignedWoredaId: staff.assignedWoredaId,
    assignedWoredaName: staff.assignedWoreda?.name || null,
    assignedWoredaCode: staff.assignedWoreda?.code || null,
  })

  return NextResponse.json({
    ok: true,
    user: {
      id: staff.id,
      fullName: staff.fullName,
      email: staff.email,
      role: staff.role,
      assignedWoredaId: staff.assignedWoredaId,
      assignedWoredaName: staff.assignedWoreda?.name || null,
      assignedWoredaCode: staff.assignedWoreda?.code || null,
    },
  })
}
