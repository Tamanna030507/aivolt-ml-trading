'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'

export default function SafetyPage() {
  const router = useRouter()
  const { user } = useAppStore()
  const [halted, setHalted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [system, setSystem] = useState<any>(null)

  useEffect(() => {
    if (!user) router.push('/')
  }, [user, router])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/system')
      const data = await res.json()
      setSystem(data)
      setHalted(Boolean(data.halted))
    } catch {
      toast.error('Could not load system status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function toggleHalt() {
    if (!user) return
    setBusy(true)
    try {
      const res = await fetch('/api/system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({ halted: !halted }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed')
        return
      }
      setHalted(data.halted)
      setConfirm(false)
      toast.success(data.halted ? 'System HALTED' : 'System RESUMED')
      load()
    } catch {
      toast.error('Request failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <h1 className="text-xl font-semibold">Safety Console</h1>

        {loading ? (
          <div className="panel p-8 animate-pulse h-32 bg-bg-secondary" />
        ) : (
          <div className="panel p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-text-muted uppercase">System Status</div>
                <div className={`text-2xl font-bold mt-1 ${halted ? 'text-red-400' : 'text-emerald-400'}`}>
                  {halted ? 'HALTED' : 'ACTIVE'}
                </div>
              </div>
              <div className="text-right text-xs font-mono text-text-muted space-y-1">
                <div>Mode: {system?.mode || '—'}</div>
                <div>Dhan: {system?.dhanConfigured ? 'Connected' : 'Not configured'}</div>
                <div>Live flag: {system?.liveTradingEnabled ? 'ON' : 'OFF'}</div>
              </div>
            </div>

            {!confirm ? (
              <button
                onClick={() => setConfirm(true)}
                className={`w-full py-4 rounded-lg font-semibold text-sm ${
                  halted
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-red-600 hover:bg-red-500 text-white'
                }`}
              >
                {halted ? 'RESUME SYSTEM' : 'HALT SYSTEM'}
              </button>
            ) : (
              <div className="space-y-3 border border-bg-border rounded-lg p-4">
                <p className="text-sm text-text-secondary">
                  {halted
                    ? 'Resume allows new paper and live orders subject to risk limits.'
                    : 'Halt blocks all new orders on the server immediately.'}
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={busy}
                    onClick={toggleHalt}
                    className="flex-1 py-3 rounded bg-accent-blue text-white text-sm font-medium disabled:opacity-50"
                  >
                    {busy ? 'Updating…' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => setConfirm(false)}
                    className="flex-1 py-3 rounded border border-bg-border text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="panel p-4 text-xs text-text-muted font-mono leading-relaxed">
          Kill switch is enforced server-side on /api/trades and /api/paper. Frontend banner updates from /api/system.
        </div>
      </div>
    </AppLayout>
  )
}
