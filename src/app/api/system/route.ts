import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { isSystemHalted, setSystemHalted, writeAuditLog } from '@/lib/system'
import { isLiveTradingEnabled, getDhanCredentials } from '@/lib/risk'

export async function GET() {
  const halted = await isSystemHalted()
  const live = isLiveTradingEnabled()
  const dhan = getDhanCredentials()
  return NextResponse.json({
    halted,
    liveTradingEnabled: live,
    dhanConfigured: Boolean(dhan),
    mode: live && dhan ? 'LIVE' : 'PAPER',
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const body = await req.json()
  if (typeof body.halted !== 'boolean') {
    return NextResponse.json({ error: 'halted boolean required' }, { status: 400 })
  }
  const ok = await setSystemHalted(body.halted, auth.userId)
  if (!ok) return NextResponse.json({ error: 'Failed to update system status (check Supabase)' }, { status: 503 })
  await writeAuditLog({
    userId: auth.userId,
    action: body.halted ? 'KILL_SWITCH_ON' : 'KILL_SWITCH_OFF',
    detail: body.halted ? 'System halted' : 'System resumed',
  })
  return NextResponse.json({ halted: body.halted, success: true })
}
