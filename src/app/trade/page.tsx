'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import AppLayout from '@/components/layout/AppLayout'
import StockChart from '@/components/charts/StockChart'
import AIRecommendationBox from '@/components/ai/AIRecommendationBox'
import { NIFTY50_STOCKS } from '@/lib/market'
import { Zap, History, Power, Search, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { formatINR } from '@/lib/market'

const TABS = ['Trade', 'AI Autopilot', 'Order History']

export default function TradePage() {
  const router = useRouter()
  const { user, setUser, selectedSymbol, setSelectedSymbol, isPaperMode, setIsPaperMode, aiStatus, setAIStatus, setLastAIAction } = useAppStore()
  const [tab, setTab] = useState(0)
  const [currentPrice, setCurrentPrice] = useState(0)
  const [orders, setOrders] = useState<any[]>([])
  const [autopilotOn, setAutopilotOn] = useState(false)
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [portfolio, setPortfolio] = useState<any[]>([])
  const [virtualBalance, setVirtualBalance] = useState(0)
  const [portfolioValue, setPortfolioValue] = useState(0)
  const [totalPnL, setTotalPnL] = useState(0)

  const [manualSide, setManualSide] = useState<'BUY' | 'SELL'>('BUY')
  const [manualQty, setManualQty] = useState(10)
  const [manualPrice, setManualPrice] = useState(0)
  const [manualType, setManualType] = useState<'MARKET' | 'LIMIT'>('MARKET')
  const [manualTrade, setManualTrade] = useState<'intraday' | 'swing' | 'delivery' | 'options'>('swing')
  const [placing, setPlacing] = useState(false)

  useEffect(() => {
    if (!user) { router.push('/'); return }
    setAutopilotOn(user.autopilotEnabled || false)
    loadVirtualData()
    loadOrders()
  }, [user])

  useEffect(() => {
    fetchPrice()
  }, [selectedSymbol])

  async function loadVirtualData() {
    if (!user) return
    try {
      const { data: userData } = await supabase
        .from('users').select('virtual_balance').eq('id', user.id).single()
      if (userData) setVirtualBalance(userData.virtual_balance || 0)

      const res = await fetch(`/api/portfolio?userId=${user.id}`)
      if (res.ok) {
        const data = await res.json()
        setPortfolio(data.holdings || [])

        let liveValue = 0
        let livePnL = 0
        for (const h of data.holdings || []) {
          const qRes = await fetch(`/api/market-data/quote?symbol=${h.symbol}.NS`)
          if (qRes.ok) {
            const q = await qRes.json()
            const val = (q.price || h.current_price) * h.quantity
            const pnl = val - (h.avg_buy_price * h.quantity)
            liveValue += val
            livePnL += pnl
            await supabase.from('portfolio').update({
              current_price: q.price || h.current_price,
              pnl,
              pnl_percent: ((q.price - h.avg_buy_price) / h.avg_buy_price) * 100
            }).eq('id', h.id)
          } else {
            liveValue += h.current_price * h.quantity
            livePnL += h.pnl || 0
          }
        }
        setPortfolioValue(liveValue)
        setTotalPnL(livePnL)
      }
    } catch (e) { console.error(e) }
  }

  async function fetchPrice() {
    if (!selectedSymbol) return
    setLoadingPrice(true)
    try {
      const res = await fetch(`/api/market-data/quote?symbol=${encodeURIComponent(selectedSymbol)}`)
      if (res.ok) {
        const data = await res.json()
        setCurrentPrice(data.price || 0)
        setManualPrice(data.price || 0)
      }
    } catch {}
    setLoadingPrice(false)
  }

  async function loadOrders() {
    if (!user) return
    try {
      const res = await fetch(`/api/trades?userId=${user.id}&isPaper=${isPaperMode}&limit=50`)
      if (res.ok) setOrders(await res.json())
    } catch {}
  }

  async function placeManualOrder() {
    if (!user) return
    if (isPaperMode && manualSide === 'BUY') {
      const cost = manualQty * (manualType === 'MARKET' ? currentPrice : manualPrice)
      if (cost > virtualBalance) {
        toast.error(`Insufficient virtual funds. Need ${formatINR(cost)}, have ${formatINR(virtualBalance)}`)
        return
      }
    }
    setPlacing(true)
    try {
      const execPrice = manualType === 'MARKET' ? currentPrice : manualPrice
      const res = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          symbol: selectedSymbol.replace('.NS','').replace('.BO',''),
          exchange: 'NSE',
          orderType: manualSide,
          quantity: manualQty,
          price: execPrice,
          tradeType: manualTrade,
          targetPrice: manualSide === 'BUY' ? execPrice * 1.08 : null,
          stopLoss: manualSide === 'BUY' ? execPrice * 0.96 : null,
          aiConfidence: 0,
          aiReasoning: 'Manual order placed by user',
          isPaper: isPaperMode,
          dhanClientId: user.dhanClientId,
          dhanAccessToken: user.dhanAccessToken,
        }),
      })
      if (res.ok) {
        const totalCost = manualQty * execPrice
        if (isPaperMode) {
          const newBalance = manualSide === 'BUY'
            ? virtualBalance - totalCost
            : virtualBalance + totalCost
          await supabase.from('users').update({ virtual_balance: newBalance }).eq('id', user.id)
          setVirtualBalance(newBalance)
          setUser({ ...user, virtualBalance: newBalance })
        }
        toast.success(
          `✅ ${isPaperMode ? 'PAPER' : 'LIVE'} ${manualSide}: ${manualQty} × ${selectedSymbol.replace('.NS','')} @ ₹${execPrice.toFixed(2)}\n${
            isPaperMode ? `Virtual balance: ${formatINR(manualSide === 'BUY' ? virtualBalance - totalCost : virtualBalance + totalCost)}` : ''
          }`
        )
        await loadOrders()
        await loadVirtualData()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Order failed')
      }
    } catch {
      toast.error('Order failed — check console')
    }
    setPlacing(false)
  }

  async function toggleAutopilot() {
    const newState = !autopilotOn
    setAutopilotOn(newState)
    setAIStatus(newState ? 'Active' : 'Paused')
    setLastAIAction(newState ? 'Autopilot engaged — scanning NIFTY50' : 'Autopilot paused by user')
    toast.success(newState ? '🤖 AI Autopilot ON' : '⏸ Autopilot paused')
    if (user) {
      await supabase.from('users').update({ autopilot_enabled: newState }).eq('id', user.id)
      setUser({ ...user, autopilotEnabled: newState })
      if (newState) {
        await supabase.from('ai_activity').insert({
          user_id: user.id,
          action: 'Autopilot activated — AI scanning NIFTY50 for opportunities',
          symbol: null,
          reasoning: 'User enabled autopilot mode. AI will monitor markets and execute trades based on configured risk profile.',
          confidence: 100,
        })
      }
    }
  }

  const displaySymbol = selectedSymbol?.replace('.NS','').replace('.BO','') || 'RELIANCE'
  const totalVirtualAssets = virtualBalance + portfolioValue

  if (!user) return null

  return (
    <AppLayout>
      <div className="flex h-full">
        {}
        <div className="w-[320px] flex flex-col border-r border-bg-border overflow-y-auto">
          {}
          <div className="flex p-3 gap-2 border-b border-bg-border">
            <button onClick={() => { setIsPaperMode(true); loadOrders() }}
              className={`flex-1 py-2 text-xs font-mono rounded-lg transition-colors ${
                isPaperMode ? 'bg-accent-gold/20 text-accent-gold border border-accent-gold/40' : 'bg-bg-secondary text-text-muted'
              }`}>
              📋 PAPER
            </button>
            <button onClick={() => {
              if (!user.dhanClientId) {
                toast.error('Connect Dhan account in Profile → Broker Connection first')
                return
              }
              setIsPaperMode(false); loadOrders()
            }}
              className={`flex-1 py-2 text-xs font-mono rounded-lg transition-colors ${
                !isPaperMode ? 'bg-accent-green/20 text-accent-green border border-accent-green/40' : 'bg-bg-secondary text-text-muted'
              }`}>
              ⚡ LIVE
            </button>
          </div>

          {}
          {isPaperMode && (
            <div className="p-3 border-b border-bg-border bg-accent-gold/5">
              <div className="text-[10px] font-mono text-accent-gold mb-2 flex items-center justify-between">
                <span>VIRTUAL PORTFOLIO</span>
                <button onClick={loadVirtualData} className="text-text-muted hover:text-text-primary">
                  <RefreshCw size={10} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="text-[9px] text-text-muted font-mono">CASH</div>
                  <div className="text-xs font-mono font-bold text-text-primary">{formatINR(virtualBalance)}</div>
                </div>
                <div>
                  <div className="text-[9px] text-text-muted font-mono">HOLDINGS</div>
                  <div className="text-xs font-mono font-bold text-text-primary">{formatINR(portfolioValue)}</div>
                </div>
                <div>
                  <div className="text-[9px] text-text-muted font-mono">P&L</div>
                  <div className={`text-xs font-mono font-bold ${totalPnL >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                    {totalPnL >= 0 ? '+' : ''}{formatINR(totalPnL)}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-[9px] font-mono text-text-muted">
                Total Assets: <span className="text-text-primary font-bold">{formatINR(totalVirtualAssets)}</span>
              </div>
            </div>
          )}

          {}
          <div className="p-3 border-b border-bg-border">
            <label className="text-[10px] font-mono text-text-muted block mb-1">SELECT STOCK</label>
            <select className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-xs text-text-primary outline-none focus:border-accent-blue"
              value={selectedSymbol} onChange={e => setSelectedSymbol(e.target.value)}>
              {NIFTY50_STOCKS.map(s => (
                <option key={s.yahooSymbol} value={s.yahooSymbol}>{s.symbol} — {s.name}</option>
              ))}
            </select>
            {currentPrice > 0 && (
              <div className="mt-1 text-xs font-mono text-text-muted">
                LTP: <span className="text-text-primary font-bold">₹{currentPrice.toFixed(2)}</span>
              </div>
            )}
          </div>

          {}
          <div className="flex border-b border-bg-border">
            {TABS.map((t, i) => (
              <button key={t} onClick={() => setTab(i)}
                className={`flex-1 py-2 text-[10px] font-mono border-b-2 transition-colors ${
                  tab === i ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-muted'
                }`}>{t}</button>
            ))}
          </div>

          {}
          {tab === 0 && (
            <div className="p-3 space-y-3">
              <AIRecommendationBox symbol={selectedSymbol} currentPrice={currentPrice}
                isPaper={isPaperMode} onTradeExecuted={() => { loadOrders(); loadVirtualData() }} />

              <div className="border border-bg-border rounded-xl p-4 space-y-3">
                <div className="text-xs font-mono text-text-muted">MANUAL ORDER</div>

                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setManualSide('BUY')}
                    className={`py-2 text-xs font-mono rounded-lg font-bold transition-colors ${
                      manualSide === 'BUY' ? 'bg-accent-green text-white' : 'bg-bg-secondary text-text-muted'
                    }`}>BUY</button>
                  <button onClick={() => setManualSide('SELL')}
                    className={`py-2 text-xs font-mono rounded-lg font-bold transition-colors ${
                      manualSide === 'SELL' ? 'bg-accent-red text-white' : 'bg-bg-secondary text-text-muted'
                    }`}>SELL</button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setManualType('MARKET')}
                    className={`py-1.5 text-xs rounded-lg border transition-colors ${
                      manualType === 'MARKET' ? 'border-accent-blue bg-accent-blue/10 text-accent-blue' : 'border-bg-border text-text-muted'
                    }`}>Market</button>
                  <button onClick={() => setManualType('LIMIT')}
                    className={`py-1.5 text-xs rounded-lg border transition-colors ${
                      manualType === 'LIMIT' ? 'border-accent-blue bg-accent-blue/10 text-accent-blue' : 'border-bg-border text-text-muted'
                    }`}>Limit</button>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-text-muted block mb-1">TYPE</label>
                  <select value={manualTrade} onChange={e => setManualTrade(e.target.value as any)}
                    className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-xs text-text-primary outline-none">
                    <option value="intraday">Intraday (MIS)</option>
                    <option value="swing">Swing (CNC)</option>
                    <option value="delivery">Delivery (CNC)</option>
                    <option value="options">Options (NRML)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-text-muted block mb-1">QUANTITY</label>
                  <input type="number" value={manualQty} onChange={e => setManualQty(parseInt(e.target.value) || 1)} min={1}
                    className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-xs text-text-primary outline-none focus:border-accent-blue" />
                </div>

                {manualType === 'LIMIT' && (
                  <div>
                    <label className="text-[10px] font-mono text-text-muted block mb-1">LIMIT PRICE</label>
                    <input type="number" value={manualPrice} onChange={e => setManualPrice(parseFloat(e.target.value))} step="0.05"
                      className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-xs text-text-primary outline-none focus:border-accent-blue" />
                  </div>
                )}

                <div className="bg-bg-secondary rounded-lg p-2 text-xs font-mono">
                  <div className="flex justify-between text-text-muted">
                    <span>Est. value:</span>
                    <span className="text-text-primary font-bold">
                      {formatINR((manualType === 'MARKET' ? currentPrice : manualPrice) * manualQty)}
                    </span>
                  </div>
                  {isPaperMode && manualSide === 'BUY' && (
                    <div className="flex justify-between text-text-muted mt-1">
                      <span>Balance after:</span>
                      <span className={`font-bold ${virtualBalance - (manualType === 'MARKET' ? currentPrice : manualPrice) * manualQty < 0 ? 'text-accent-red' : 'text-accent-green'}`}>
                        {formatINR(virtualBalance - (manualType === 'MARKET' ? currentPrice : manualPrice) * manualQty)}
                      </span>
                    </div>
                  )}
                </div>

                <button onClick={placeManualOrder} disabled={placing || currentPrice === 0}
                  className={`w-full py-3 text-xs font-bold rounded-lg transition-colors disabled:opacity-50 ${
                    manualSide === 'BUY' ? 'bg-accent-green text-white hover:bg-green-400' : 'bg-accent-red text-white hover:bg-red-400'
                  }`}>
                  {placing ? 'Placing...' : currentPrice === 0 ? 'Loading price...' : `${isPaperMode ? '📋 PAPER' : '⚡ LIVE'} ${manualSide} ${manualQty} shares`}
                </button>
              </div>
            </div>
          )}

          {}
          {tab === 1 && (
            <div className="p-4 space-y-4">
              <div className="panel p-6 text-center space-y-4">
                <div className={`text-3xl font-bold font-mono ${autopilotOn ? 'text-accent-green' : 'text-text-muted'}`}>
                  {autopilotOn ? '🤖 ACTIVE' : '⏸ PAUSED'}
                </div>
                <p className="text-xs text-text-secondary">
                  {autopilotOn
                    ? 'AI is scanning NIFTY50 every 5 minutes and executing trades based on your risk profile.'
                    : 'Enable autopilot to let AI trade automatically on your behalf.'}
                </p>
                <button onClick={toggleAutopilot}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
                    autopilotOn ? 'bg-accent-red/20 text-accent-red border border-accent-red/40 hover:bg-accent-red/30'
                    : 'bg-accent-green text-white hover:bg-green-400'
                  }`}>
                  {autopilotOn ? 'Pause Autopilot' : 'Enable Autopilot'}
                </button>
              </div>

              {autopilotOn && (
                <div className="space-y-3 text-xs font-mono">
                  {[
                    { label: 'AI Mode', value: user.aiMode?.toUpperCase() || 'QUANT' },
                    { label: 'Risk Profile', value: user.riskProfile?.toUpperCase() || 'BALANCED' },
                    { label: 'Capital Alloc', value: `${user.capitalAllocation || 50}%` },
                    { label: 'Daily Loss Limit', value: formatINR(user.dailyLossLimit || 5000) },
                    { label: 'Markets', value: (user.marketsEnabled || ['NSE']).join(', ') },
                  ].map(({ label, value }) => (
                    <div key={label} className="panel p-3 flex justify-between">
                      <span className="text-text-muted">{label}</span>
                      <span className="text-accent-blue font-bold">{value}</span>
                    </div>
                  ))}
                  <div className="panel p-3 text-text-secondary leading-relaxed">
                    ⚡ AI scans every 5 min · Stop-loss on every trade · Auto-exit at daily loss limit
                  </div>
                </div>
              )}
            </div>
          )}

          {}
          {tab === 2 && (
            <div className="flex-1 overflow-y-auto">
              <div className="flex items-center justify-between px-4 py-2 border-b border-bg-border">
                <span className="text-[10px] font-mono text-text-muted">{orders.length} ORDERS</span>
                <button onClick={loadOrders} className="text-text-muted hover:text-text-primary"><RefreshCw size={11} /></button>
              </div>
              {orders.length === 0 ? (
                <div className="p-6 text-center text-text-muted text-xs font-mono">
                  No orders yet.<br />Place your first trade above.
                </div>
              ) : orders.map(order => (
                <div key={order.id} className="px-4 py-3 border-b border-bg-border hover:bg-bg-hover">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono font-bold ${order.order_type === 'BUY' ? 'text-accent-green' : 'text-accent-red'}`}>
                        {order.order_type}
                      </span>
                      <span className="text-xs font-mono text-text-primary">{order.symbol}</span>
                      {order.is_paper && <span className="text-[9px] font-mono text-accent-gold border border-accent-gold/30 px-1 rounded">PAPER</span>}
                    </div>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      order.status === 'OPEN' ? 'bg-accent-blue/10 text-accent-blue' :
                      'bg-bg-secondary text-text-muted'
                    }`}>{order.status}</span>
                  </div>
                  <div className="text-[10px] font-mono text-text-muted">
                    {order.quantity} shares @ ₹{parseFloat(order.price)?.toFixed(2)} · {order.trade_type}
                  </div>
                  <div className="text-[10px] font-mono text-text-muted">
                    Value: <span className="text-text-secondary">{formatINR(order.quantity * order.price)}</span>
                  </div>
                  {order.ai_reasoning && order.ai_confidence > 0 && (
                    <div className="text-[9px] text-text-muted mt-1 italic">{order.ai_reasoning}</div>
                  )}
                  <div className="text-[9px] text-text-muted mt-1">
                    {order.executed_at ? formatDistanceToNow(new Date(order.executed_at), { addSuffix: true }) : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center px-4 py-3 border-b border-bg-border gap-3">
            <span className="text-sm font-mono font-bold text-text-primary">{displaySymbol}</span>
            {loadingPrice ? (
              <span className="text-xs text-text-muted animate-pulse">Loading...</span>
            ) : currentPrice > 0 ? (
              <span className="text-sm font-mono font-bold text-text-primary">₹{currentPrice.toFixed(2)}</span>
            ) : null}
            {isPaperMode && <span className="ai-badge virtual-badge">PAPER</span>}
            <span className="ai-badge ml-auto">AI OVERLAY</span>
          </div>
          <div className="flex-1">
            <StockChart symbol={selectedSymbol || 'RELIANCE.NS'} showAIOverlay />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}