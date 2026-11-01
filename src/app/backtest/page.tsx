'use client'

import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

export default function BacktestPage() {
  const [symbol, setSymbol] = useState('RELIANCE')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<any>(null)

  async function run() {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, range: '2y' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || data.message || 'Backtest failed')
        return
      }
      setResult(data)
    } catch (e: any) {
      setError(e.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const equity = (result?.equityCurve || []).map((p: any) => ({
    t: new Date(p.time * 1000).toLocaleDateString('en-IN'),
    equity: Math.round(p.equity),
  }))

  let peak = 0
  const dd = equity.map((p: any) => {
    peak = Math.max(peak, p.equity)
    const drawdown = peak > 0 ? ((peak - p.equity) / peak) * 100 : 0
    return { t: p.t, drawdown: +drawdown.toFixed(2) }
  })

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <div className="text-[10px] font-mono text-text-muted uppercase mb-1">Symbol</div>
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="bg-bg-secondary border border-bg-border rounded px-3 py-2 text-sm font-mono"
            />
          </div>
          <button
            onClick={run}
            disabled={loading}
            className="px-4 py-2 rounded bg-accent-blue text-white text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Running…' : 'Run Backtest'}
          </button>
        </div>

        {error && (
          <div className="panel p-4 border border-red-500/40 text-sm text-red-300">{error}</div>
        )}

        {!result && !loading && !error && (
          <div className="panel p-10 text-center text-text-muted text-sm">
            Run a walk-forward backtest on real Yahoo history with fees and slippage.
          </div>
        )}

        {result && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ['Total Return', `${((result.metrics?.totalReturn || 0) * 100).toFixed(2)}%`],
                ['Max Drawdown', `${((result.metrics?.maxDrawdown || 0) * 100).toFixed(2)}%`],
                ['Sharpe', result.metrics?.sharpe != null ? result.metrics.sharpe.toFixed(2) : '—'],
                ['Trades', String(result.metrics?.nTrades ?? 0)],
              ].map(([k, v]) => (
                <div key={k} className="panel p-4">
                  <div className="text-[10px] font-mono text-text-muted uppercase">{k}</div>
                  <div className="text-lg font-semibold mt-1">{v}</div>
                </div>
              ))}
            </div>

            <div className="panel p-4">
              <div className="text-xs font-mono text-text-muted uppercase mb-3">Equity Curve</div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equity}>
                    <XAxis dataKey="t" hide />
                    <YAxis domain={['auto', 'auto']} width={70} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="equity" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel p-4">
              <div className="text-xs font-mono text-text-muted uppercase mb-3">Drawdown %</div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dd}>
                    <XAxis dataKey="t" hide />
                    <YAxis domain={[0, 'auto']} width={50} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="drawdown" stroke="#ef4444" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="text-[11px] text-text-muted font-mono">
              {result.note || 'Costs included. Not a guarantee of live performance.'}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
