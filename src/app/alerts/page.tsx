'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { useAppStore } from '@/lib/store'

export default function AlertsPage() {
  const router = useRouter()
  const { user } = useAppStore()
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) router.push('/')
  }, [user, router])

  useEffect(() => {
    async function load() {
      if (!user) return
      setLoading(true)
      try {
        const res = await fetch('/api/audit?limit=50', {
          headers: { 'x-user-id': user.id },
        })
        const data = await res.json()
        setEntries(Array.isArray(data.entries) ? data.entries : [])
      } catch {
        setEntries([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <h1 className="text-xl font-semibold">Alerts</h1>
        <p className="text-sm text-text-secondary">Recent system and account activity.</p>
        {loading && <div className="panel h-24 animate-pulse" />}
        {!loading && entries.length === 0 && (
          <div className="panel p-8 text-center text-sm text-text-muted">
            No alerts yet. Trades, kill switch, and paper fills will show up here when logged.
          </div>
        )}
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id || e.created_at + e.action} className="panel p-4 text-sm">
              <div className="font-medium">{e.action}</div>
              <div className="text-xs text-text-secondary mt-1">{e.detail}</div>
              <div className="text-[10px] text-text-muted font-mono mt-2">
                {e.created_at ? new Date(e.created_at).toLocaleString('en-IN') : ''}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
