import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { hashPassword, verifyPassword } from '@/lib/password'

// POST /api/auth/change-password
// Body: { currentPassword, newPassword }
export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json()
  const { currentPassword, newPassword } = body

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: 'Current and new passwords are required' },
      { status: 400 }
    )
  }
  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: 'New password must be at least 8 characters long' },
      { status: 400 }
    )
  }

  const staff = await db.staff.findUnique({ where: { id: user.id } })
  if (!staff || !staff.passwordHash) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  const ok = await verifyPassword(currentPassword, staff.passwordHash)
  if (!ok) {
    return NextResponse.json(
      { error: 'Current password is incorrect' },
      { status: 401 }
    )
  }

  const newHash = await hashPassword(newPassword)
  await db.staff.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  })

  return NextResponse.json({ ok: true })
}
