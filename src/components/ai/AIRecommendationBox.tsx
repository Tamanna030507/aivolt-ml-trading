'use client'

import { useState, useEffect, useRef } from 'react'
import { Cpu, TrendingUp, TrendingDown, Minus, Zap, RefreshCw, AlertCircle, X } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'

interface Props {
  symbol: string
  currentPrice: number
  isPaper?: boolean
  onTradeExecuted?: () => void
}

export default function AIRecommendationBox({ symbol, currentPrice, isPaper = true, onTradeExecuted }: Props) {
  const { user } = useAppStore()
  const [signal, setSignal] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [executing, setExecuting] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [showWhy, setShowWhy] = useState(false)
  const lastFetch = useRef('')

  useEffect(() => {
    if (!symbol) return
    if (lastFetch.current !== symbol) {
      lastFetch.current = symbol
      loadSignal()
    }
  }, [symbol])

  async function loadSignal() {
    setLoading(true)
    setError(null)
    setSignal(null)
    const cleanSymbol = symbol.replace('.NS', '').replace('.BO', '')
    try {
      const res = await fetch('/api/ai-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: cleanSymbol, aiMode: user?.aiMode || 'quant' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || data.error || 'Signal unavailable')
        return
      }
      setSignal(data)
    } catch (e: any) {
      setError(e.message || 'Failed to load signal')
    } finally {
      setLoading(false)
    }
  }

  async function executeAITrade() {
    if (!user || !signal || (signal.action !== 'BUY' && signal.action !== 'SELL')) return
    setExecuting(true)
    try {
      const idempotencyKey = `ai-${user.id}-${symbol}-${Date.now()}`
      const res = await fetch('/api/trades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          userId: user.id,
          symbol: symbol.replace('.NS', '').replace('.BO', ''),
          orderType: signal.action,
          quantity,
          isPaper,
          tradeType: signal.tradeType || 'swing',
          aiConfidence: signal.confidence || Math.round((signal.probability || 0.5) * 100),
          aiReasoning: signal.reasoning || signal.note || '',
          idempotencyKey,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || data.message || 'Order failed')
        return
      }
      toast.success(data.message || 'Order placed')
      onTradeExecuted?.()
    } catch {
      toast.error('Order request failed')
    } finally {
      setExecuting(false)
    }
  }

  const action = signal?.action || 'HOLD'
  const ActionIcon = action === 'BUY' ? TrendingUp : action === 'SELL' ? TrendingDown : Minus
  const actionColor =
    action === 'BUY' ? 'text-emerald-400' : action === 'SELL' ? 'text-red-400' : 'text-text-muted'

  const contrib = signal?.featureContributions || []
  const maxAbs = Math.max(...contrib.map((c: any) => Math.abs(c.contribution || 0)), 0.0001)

  return (
    <div className="panel p-4 space-y-3 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-mono text-text-muted">
          <Cpu size={14} /> AI SIGNAL
        </div>
        <button onClick={loadSignal} className="text-text-muted hover:text-text-primary">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && <div className="h-24 animate-pulse bg-bg-secondary rounded" />}

      {error && !loading && (
        <div className="flex items-start gap-2 text-xs text-amber-300 border border-amber-500/30 rounded-lg p-3">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {signal && !loading && (
        <>
          <div className="flex items-center gap-3">
            <ActionIcon className={actionColor} size={22} />
            <div>
              <div className={`text-lg font-bold ${actionColor}`}>{action}</div>
              <div className="text-[11px] font-mono text-text-muted">
                P={signal.probability != null ? Number(signal.probability).toFixed(3) : '—'} ·{' '}
                {signal.modelVersion || signal.model || 'model'}
              </div>
            </div>
            <button
              onClick={() => setShowWhy(true)}
              className="ml-auto text-[11px] px-2 py-1 rounded border border-bg-border hover:border-accent-blue text-accent-blue"
            >
              Why?
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
            <div className="bg-bg-secondary rounded p-2">
              <div className="text-text-muted">Entry</div>
              <div>₹{Number(signal.entryPrice || currentPrice).toFixed(2)}</div>
            </div>
            <div className="bg-bg-secondary rounded p-2">
              <div className="text-text-muted">Target</div>
              <div>₹{Number(signal.targetPrice || 0).toFixed(2)}</div>
            </div>
            <div className="bg-bg-secondary rounded p-2">
              <div className="text-text-muted">Stop</div>
              <div>₹{Number(signal.stopLoss || 0).toFixed(2)}</div>
            </div>
          </div>

          <p className="text-[11px] text-text-muted leading-relaxed">{signal.note || signal.reasoning}</p>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 bg-bg-secondary border border-bg-border rounded px-2 py-1.5 text-xs"
            />
            {(action === 'BUY' || action === 'SELL') && (
              <button
                onClick={executeAITrade}
                disabled={executing}
                className={`flex-1 flex items-center justify-center gap-1.5 text-white text-xs font-bold py-2.5 rounded-lg disabled:opacity-50 ${
                  action === 'BUY' ? 'bg-emerald-600' : 'bg-red-600'
                }`}
              >
                <Zap size={13} />
                {executing ? 'Submitting…' : isPaper ? 'Paper Execute' : 'Live Execute'}
              </button>
            )}
          </div>
        </>
      )}

      {showWhy && signal && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setShowWhy(false)}>
          <div
            className="w-full max-w-md h-full bg-bg-secondary border-l border-bg-border p-5 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold">Feature contributions</div>
              <button onClick={() => setShowWhy(false)}>
                <X size={16} />
              </button>
            </div>
            <p className="text-[11px] text-text-muted mb-4">
              Logistic model contributions (not causal proof). Test metrics shown when available.
            </p>
            <div className="space-y-2">
              {contrib.length === 0 && (
                <div className="text-xs text-text-muted">No contribution data for this signal.</div>
              )}
              {contrib.map((c: any) => (
                <div key={c.feature} className="text-xs">
                  <div className="flex justify-between font-mono mb-1">
                    <span>{c.feature}</span>
                    <span>{Number(c.contribution).toFixed(4)}</span>
                  </div>
                  <div className="h-1.5 bg-bg-primary rounded overflow-hidden">
                    <div
                      className={`h-full ${c.contribution >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(100, (Math.abs(c.contribution) / maxAbs) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {signal.modelMetrics && (
              <div className="mt-6 text-[11px] font-mono text-text-muted space-y-1">
                <div>AUC: {signal.modelMetrics.auc ?? '—'}</div>
                <div>Brier: {signal.modelMetrics.brier ?? '—'}</div>
                <div>Acc: {signal.modelMetrics.acc ?? '—'}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
