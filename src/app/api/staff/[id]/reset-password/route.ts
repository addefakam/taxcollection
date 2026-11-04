import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { hashPassword, generateTempPassword } from '@/lib/password'

type Params = { params: Promise<{ id: string }> }

// PATCH /api/staff/[id]/reset-password  (Leader only)
// Body: { newPassword? } - if not provided, generates a random temp password
// Returns the new password (Leader must share it with the staff member securely)
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireRole('LEADER')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { newPassword } = body

  const target = await db.staff.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const pwd = newPassword || generateTempPassword()
  const pwdHash = await hashPassword(pwd)

  await db.staff.update({
    where: { id },
    data: { passwordHash: pwdHash },
  })

  return NextResponse.json({ ok: true, generatedPassword: pwd })
}
