'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'

export default function PaperTradingPage() {
  const router = useRouter()
  const { user } = useAppStore()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [symbol, setSymbol] = useState('RELIANCE')
  const [qty, setQty] = useState(1)
  const [busy, setBusy] = useState(false)

  const headers = useCallback(() => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (user?.id) h['x-user-id'] = user.id
    return h
  }, [user])

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await fetch('/api/paper', { headers: headers() })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || 'Failed to load paper account')
        return
      }
      setData(json)
    } catch {
      toast.error('Paper API unavailable')
    } finally {
      setLoading(false)
    }
  }, [user, headers])

  useEffect(() => {
    if (!user) router.push('/')
    else load()
  }, [user, router, load])

  async function trade(action: 'BUY' | 'SELL') {
    if (!user) return
    setBusy(true)
    try {
      const res = await fetch('/api/paper', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          action,
          symbol,
          quantity: qty,
          idempotencyKey: `paper-${user.id}-${action}-${symbol}-${Date.now()}`,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || json.reasons?.join(', ') || 'Order blocked')
        return
      }
      toast.success(`${action} filled @ ₹${json.price}`)
      load()
    } catch {
      toast.error('Request failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Paper Trading</h1>
          <span className="text-[10px] font-mono px-2 py-1 rounded bg-amber-500/20 text-amber-300">
            SIMULATION
          </span>
        </div>

        {loading && <div className="h-28 panel animate-pulse bg-bg-secondary" />}

        {!loading && data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['Cash', `₹${Number(data.cash || 0).toLocaleString('en-IN')}`],
              ['Equity', `₹${Number(data.equity || 0).toLocaleString('en-IN')}`],
              ['Realized P&L', `₹${Number(data.realizedPnl || 0).toLocaleString('en-IN')}`],
              ['Positions', String((data.positions || []).length)],
            ].map(([k, v]) => (
              <div key={k} className="panel p-4">
                <div className="text-[10px] font-mono text-text-muted uppercase">{k}</div>
                <div className="text-lg font-semibold mt-1">{v}</div>
              </div>
            ))}
          </div>
        )}

        <div className="panel p-4 flex flex-wrap gap-3 items-end">
          <div>
            <div className="text-[10px] font-mono text-text-muted mb-1">SYMBOL</div>
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="bg-bg-secondary border border-bg-border rounded px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <div className="text-[10px] font-mono text-text-muted mb-1">QTY</div>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-24 bg-bg-secondary border border-bg-border rounded px-3 py-2 text-sm"
            />
          </div>
          <button
            disabled={busy}
            onClick={() => trade('BUY')}
            className="px-4 py-2 rounded bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
          >
            Buy
          </button>
          <button
            disabled={busy}
            onClick={() => trade('SELL')}
            className="px-4 py-2 rounded bg-red-600 text-white text-sm font-medium disabled:opacity-50"
          >
            Sell
          </button>
          <button onClick={load} className="px-3 py-2 rounded border border-bg-border text-sm">
            Refresh
          </button>
        </div>

        <div className="panel p-4">
          <div className="text-xs font-mono text-text-muted uppercase mb-3">Positions</div>
          {(data?.positions || []).length === 0 ? (
            <div className="text-sm text-text-muted py-6 text-center">No positions — place a paper trade</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-text-muted text-xs font-mono">
                    <th className="pb-2">Symbol</th>
                    <th>Qty</th>
                    <th>Avg</th>
                    <th>Price</th>
                    <th>uPnL</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.positions || []).map((p: any) => (
                    <tr key={p.symbol} className="border-t border-bg-border">
                      <td className="py-2 font-mono">{p.symbol}</td>
                      <td>{p.qty}</td>
                      <td>₹{Number(p.avgCost).toFixed(2)}</td>
                      <td>₹{Number(p.price).toFixed(2)}</td>
                      <td className={p.upnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        ₹{Number(p.upnl).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel p-4">
          <div className="text-xs font-mono text-text-muted uppercase mb-3">Ledger</div>
          {(data?.ledger || []).length === 0 ? (
            <div className="text-sm text-text-muted py-4 text-center">No ledger entries yet</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto text-xs font-mono">
              {(data.ledger || []).map((e: any) => (
                <div key={e.id} className="flex justify-between border-b border-bg-border/50 pb-1">
                  <span>
                    {e.entry_type} {e.symbol} {e.qty}
                  </span>
                  <span>₹{Number(e.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
