'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import StockChart from '@/components/charts/StockChart'
import AIRecommendationBox from '@/components/ai/AIRecommendationBox'
import { useAppStore } from '@/lib/store'
import { WATCH_UNIVERSE } from '@/lib/universe'

const TABS = ['Indices', 'Movers', 'Screener', 'Watchlist']

export default function MarketsPage() {
  const router = useRouter()
  const { user, selectedSymbol, setSelectedSymbol } = useAppStore()
  const [tab, setTab] = useState(1)
  const [rows, setRows] = useState<any[]>([])
  const [gainers, setGainers] = useState<any[]>([])
  const [losers, setLosers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [watch, setWatch] = useState<string[]>(['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK'])
  const [q, setQ] = useState('')
  const [price, setPrice] = useState(0)

  useEffect(() => {
    if (!user) router.push('/')
  }, [user, router])

  useEffect(() => {
    const saved = localStorage.getItem('aivolt-watch')
    if (saved) {
      try {
        setWatch(JSON.parse(saved))
      } catch {}
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('aivolt-watch', JSON.stringify(watch))
  }, [watch])

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/markets/scan')
        const data = await res.json()
        if (!alive) return
        setRows(Array.isArray(data.all) ? data.all : [])
        setGainers(Array.isArray(data.gainers) ? data.gainers : [])
        setLosers(Array.isArray(data.losers) ? data.losers : [])
      } catch {
        if (alive) setRows([])
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    const t = setInterval(load, 60000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])

  useEffect(() => {
    if (!selectedSymbol) setSelectedSymbol('RELIANCE.NS')
  }, [selectedSymbol, setSelectedSymbol])

  useEffect(() => {
    async function px() {
      if (!selectedSymbol) return
      try {
        const res = await fetch(`/api/market-data/quote?symbol=${encodeURIComponent(selectedSymbol)}`)
        const data = await res.json()
        if (data.price) setPrice(data.price)
      } catch {}
    }
    px()
  }, [selectedSymbol])

  const filtered = rows.filter(
    (r) =>
      !q ||
      r.symbol.toLowerCase().includes(q.toLowerCase()) ||
      r.name.toLowerCase().includes(q.toLowerCase())
  )

  function pick(sym: string) {
    setSelectedSymbol(sym.includes('.') ? sym : `${sym}.NS`)
  }

  function toggleWatch(sym: string) {
    setWatch((w) => (w.includes(sym) ? w.filter((x) => x !== sym) : [...w, sym]))
  }

  return (
    <AppLayout>
      <div className="h-full flex flex-col md:flex-row">
        <div className="w-full md:w-[380px] border-r border-bg-border flex flex-col">
          <div className="flex border-b border-bg-border">
            {TABS.map((t, i) => (
              <button
                key={t}
                onClick={() => setTab(i)}
                className={`flex-1 py-3 text-xs font-medium ${
                  tab === i ? 'text-text-primary border-b-2 border-red-500' : 'text-text-muted'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="p-3 border-b border-bg-border">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search symbol"
              className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && <div className="p-4 text-xs text-text-muted animate-pulse">Loading live quotes…</div>}

            {tab === 0 && (
              <div className="p-2 space-y-1">
                {WATCH_UNIVERSE.slice(0, 8).map((s) => {
                  const row = rows.find((r) => r.symbol === s.symbol)
                  return (
                    <button
                      key={s.symbol}
                      onClick={() => pick(s.yahoo)}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-bg-hover flex justify-between"
                    >
                      <div>
                        <div className="text-sm font-medium">{s.symbol}</div>
                        <div className="text-[10px] text-text-muted">{s.name}</div>
                      </div>
                      <div className="text-right text-sm font-mono">
                        {row ? `₹${row.price.toFixed(1)}` : '—'}
                        {row && (
                          <div className={row.changePercent >= 0 ? 'text-gain text-[10px]' : 'text-loss text-[10px]'}>
                            {row.changePercent.toFixed(2)}%
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {tab === 1 && (
              <div className="p-2 space-y-4">
                <div>
                  <div className="text-[10px] font-mono text-text-muted px-2 mb-1">TOP GAINERS</div>
                  {gainers.map((r) => (
                    <button
                      key={r.symbol}
                      onClick={() => pick(r.yahoo)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-bg-hover flex justify-between text-sm"
                    >
                      <span>{r.symbol}</span>
                      <span className="text-gain font-mono">{r.changePercent.toFixed(2)}%</span>
                    </button>
                  ))}
                </div>
                <div>
                  <div className="text-[10px] font-mono text-text-muted px-2 mb-1">TOP LOSERS</div>
                  {losers.map((r) => (
                    <button
                      key={r.symbol}
                      onClick={() => pick(r.yahoo)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-bg-hover flex justify-between text-sm"
                    >
                      <span>{r.symbol}</span>
                      <span className="text-loss font-mono">{r.changePercent.toFixed(2)}%</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tab === 2 && (
              <div className="p-2">
                {filtered.map((r) => (
                  <button
                    key={r.symbol}
                    onClick={() => pick(r.yahoo)}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-bg-hover flex justify-between items-center"
                  >
                    <div>
                      <div className="text-sm font-medium">{r.symbol}</div>
                      <div className="text-[10px] text-text-muted">{r.sector}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono">₹{r.price.toFixed(1)}</div>
                      <div className={r.changePercent >= 0 ? 'text-gain text-[10px]' : 'text-loss text-[10px]'}>
                        {r.changePercent.toFixed(2)}%
                      </div>
                    </div>
                  </button>
                ))}
                {!loading && filtered.length === 0 && (
                  <div className="p-4 text-xs text-text-muted">No rows — check network / Yahoo.</div>
                )}
              </div>
            )}

            {tab === 3 && (
              <div className="p-2">
                {WATCH_UNIVERSE.map((s) => {
                  const on = watch.includes(s.symbol)
                  const row = rows.find((r) => r.symbol === s.symbol)
                  return (
                    <div key={s.symbol} className="flex items-center gap-2 px-2 py-2 hover:bg-bg-hover rounded-lg">
                      <button onClick={() => pick(s.yahoo)} className="flex-1 text-left text-sm">
                        <div className="font-medium">{s.symbol}</div>
                        <div className="text-[10px] text-text-muted">
                          {row ? `₹${row.price.toFixed(1)}` : s.name}
                        </div>
                      </button>
                      <button
                        onClick={() => toggleWatch(s.symbol)}
                        className={`text-[10px] px-2 py-1 rounded-full border ${
                          on ? 'border-red-500 text-red-400' : 'border-bg-border text-text-muted'
                        }`}
                      >
                        {on ? 'Saved' : 'Add'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          <StockChart symbol={selectedSymbol || 'RELIANCE.NS'} />
          <AIRecommendationBox
            symbol={(selectedSymbol || 'RELIANCE').replace('.NS', '')}
            currentPrice={price}
            isPaper
          />
        </div>
      </div>
    </AppLayout>
  )
}
