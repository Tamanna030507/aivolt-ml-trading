import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getServiceSupabase } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const sb = getServiceSupabase()
  if (!sb) return NextResponse.json({ entries: [] })
  const limit = Math.min(200, parseInt(new URL(req.url).searchParams.get('limit') || '50', 10))
  const { data, error } = await sb
    .from('audit_log')
    .select('*')
    .or(`user_id.eq.${auth.userId},user_id.is.null`)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entries: data || [] })
}
