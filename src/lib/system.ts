import { getServiceSupabase } from './auth'

export async function isSystemHalted(): Promise<boolean> {
  const sb = getServiceSupabase()
  if (!sb) return false
  try {
    const { data } = await sb.from('system_status').select('halted').eq('id', 1).maybeSingle()
    return Boolean(data?.halted)
  } catch {
    return false
  }
}

export async function setSystemHalted(halted: boolean, userId?: string): Promise<boolean> {
  const sb = getServiceSupabase()
  if (!sb) return false
  const { error } = await sb.from('system_status').upsert({
    id: 1,
    halted,
    updated_at: new Date().toISOString(),
    updated_by: userId || null,
  })
  return !error
}

export async function writeAuditLog(entry: {
  userId?: string | null
  action: string
  detail?: string
  meta?: Record<string, unknown>
}) {
  const sb = getServiceSupabase()
  if (!sb) return
  try {
    await sb.from('audit_log').insert({
      user_id: entry.userId || null,
      action: entry.action,
      detail: entry.detail || '',
      meta: entry.meta || {},
      created_at: new Date().toISOString(),
    })
  } catch {}
}
