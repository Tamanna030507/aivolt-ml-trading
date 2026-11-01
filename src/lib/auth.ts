import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export function getAnonSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function requireAuth(req: NextRequest): Promise<
  { userId: string; accessToken: string | null } | { error: string; status: number }
> {
  const authHeader = req.headers.get('authorization')
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const headerUser = req.headers.get('x-user-id')

  if (bearer) {
    const supabase = getAnonSupabase()
    if (supabase) {
      const { data, error } = await supabase.auth.getUser(bearer)
      if (!error && data.user?.id) {
        return { userId: data.user.id, accessToken: bearer }
      }
    }
    try {
      const payload = JSON.parse(Buffer.from(bearer.split('.')[1] || '', 'base64url').toString())
      if (payload.sub && UUID_RE.test(payload.sub)) {
        return { userId: payload.sub, accessToken: bearer }
      }
    } catch {}
  }

  if (headerUser && UUID_RE.test(headerUser)) {
    return { userId: headerUser, accessToken: bearer }
  }

  return { error: 'Authentication required', status: 401 }
}

export function extractUserId(req: NextRequest, bodyUserId?: unknown): string | null {
  const header = req.headers.get('x-user-id')
  if (header && UUID_RE.test(header)) return header
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) {
    try {
      const payload = JSON.parse(Buffer.from(auth.slice(7).split('.')[1] || '', 'base64url').toString())
      if (payload.sub && UUID_RE.test(payload.sub)) return payload.sub
    } catch {}
  }
  if (typeof bodyUserId === 'string' && UUID_RE.test(bodyUserId)) return bodyUserId
  return null
}
