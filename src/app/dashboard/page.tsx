'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import AppLayout from '@/components/layout/AppLayout'
import { supabase } from '@/lib/supabase'
import {
  TrendingUp, TrendingDown, RefreshCw, Activity,
  ArrowUpRight, ArrowDownRight, Cpu, Eye
} from 'lucide-react'
import { formatINR } from '@/lib/market'
import AIActivityFeed from '@/components/ai/AIActivityFeed'
import HoldingsTable from '@/components/dashboard/HoldingsTable'
import StockChart from '@/components/charts/StockChart'
import MarketOverview from '@/components/dashboard/MarketOverview'
import AIRecommendationBox from '@/components/ai/AIRecommendationBox'
import PortfolioSummary from '@/components/dashboard/PortfolioSummary'

export default function DashboardPage() {
  const router = useRouter()
  const {
    user, selectedSymbol, setSelectedSymbol,
    holdings, setHoldings, setPortfolioData,
    aiActivities, addAIActivity, setLastAIAction,
    isPaperMode
  } = useAppStore()

  const [loading, setLoading] = useState(true)
  const [portfolioSummary, setPortfolioSummary] = useState({
    totalInvested: 0, totalCurrent: 0, totalPnL: 0, totalPnLPercent: 0, holdingsCount: 0
  })

  useEffect(() => {
    if (!user) {
      router.push('/')
    }
  }, [user, router])

  const loadPortfolio = useCallback(async () => {
    if (!user) return

    try {
      const res = await fetch(`/api/portfolio?userId=${user.id}`)
      if (res.ok) {
        const data = await res.json()
        setHoldings(data.holdings || [])
        setPortfolioSummary(data.summary || {})
        setPortfolioData(
          data.summary?.totalCurrent || 0,
          data.summary?.totalPnL || 0,
          data.summary?.totalPnLPercent || 0
        )
      }

      const { data: activities } = await supabase
        .from('ai_activity')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (activities) {
        activities.forEach(a => addAIActivity({
          id: a.id,
          action: a.action,
          symbol: a.symbol,
          reasoning: a.reasoning,
          confidence: a.confidence,
          createdAt: a.created_at,
        }))
      }
    } catch (e) {
      console.error('Portfolio load error:', e)
    } finally {
      setLoading(false)
    }
  }, [user, setHoldings, setPortfolioData, addAIActivity])

  useEffect(() => {
    loadPortfolio()
    const interval = setInterval(loadPortfolio, 60000)
    return () => clearInterval(interval)
  }, [loadPortfolio])

  if (!user) return null

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {}
        <div className="flex items-center justify-between px-6 py-4 border-b border-bg-border">
          <div className="flex items-center gap-8">
            <div>
              <div className="text-xs font-mono text-text-muted mb-0.5">PORTFOLIO VALUE</div>
              <div className="text-2xl font-mono font-bold text-text-primary">
                {formatINR(portfolioSummary.totalCurrent || (isPaperMode ? user.virtualBalance : 0))}
              </div>
            </div>
            <div>
              <div className="text-xs font-mono text-text-muted mb-0.5">TODAY'S P&L</div>
              <div className={`text-xl font-mono font-bold flex items-center gap-1 ${
                portfolioSummary.totalPnL >= 0 ? 'text-accent-green' : 'text-accent-red'
              }`}>
                {portfolioSummary.totalPnL >= 0
                  ? <ArrowUpRight size={18} />
                  : <ArrowDownRight size={18} />
                }
                {portfolioSummary.totalPnL >= 0 ? '+' : ''}{formatINR(portfolioSummary.totalPnL)}
                <span className="text-sm font-normal ml-1">
                  ({portfolioSummary.totalPnLPercent >= 0 ? '+' : ''}
                  {portfolioSummary.totalPnLPercent.toFixed(2)}%)
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs font-mono text-text-muted mb-0.5">HOLDINGS</div>
              <div className="text-xl font-mono font-bold text-text-primary">{portfolioSummary.holdingsCount}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isPaperMode && (
              <span className="ai-badge virtual-badge">VIRTUAL ₹{(user.virtualBalance / 100000).toFixed(0)}L</span>
            )}
            <button
              onClick={loadPortfolio}
              className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-hover transition-colors"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {}
        <div className="flex-1 overflow-hidden flex gap-px bg-bg-border">
          {}
          <div className="w-[280px] flex flex-col bg-bg-primary overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border">
              <span className="text-xs font-mono text-text-secondary uppercase tracking-wider">Holdings</span>
              <span className="text-xs font-mono text-text-muted">{holdings.length} positions</span>
            </div>
            <HoldingsTable
              holdings={holdings}
              selectedSymbol={selectedSymbol}
              onSelect={setSelectedSymbol}
            />
          </div>

          {}
          <div className="flex-1 flex flex-col bg-bg-primary overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border">
              <div className="flex items-center gap-2">
                <Eye size={14} className="text-text-muted" />
                <span className="text-xs font-mono text-text-secondary uppercase tracking-wider">
                  {selectedSymbol.replace('.NS', '').replace('.BO', '')}
                </span>
                <span className="ai-badge">AI OVERLAY</span>
              </div>
            </div>
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 min-h-[280px]">
                <StockChart symbol={selectedSymbol} showAIOverlay />
              </div>
              <div className="p-3 border-t border-bg-border max-h-[280px] overflow-y-auto">
                <AIRecommendationBox
                  symbol={selectedSymbol.replace('.NS','').replace('.BO','')}
                  currentPrice={0}
                  isPaper={isPaperMode}
                />
              </div>
            </div>
          </div>

          {}
          <div className="w-[280px] flex flex-col bg-bg-primary overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-bg-border">
              <Cpu size={14} className="text-accent-blue" />
              <span className="text-xs font-mono text-text-secondary uppercase tracking-wider">AI Activity</span>
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-green animate-ping" />
            </div>
            <AIActivityFeed activities={aiActivities} />
          </div>
        </div>

        {}
        <div className="border-t border-bg-border">
          <MarketOverview />
        </div>
      </div>
    </AppLayout>
  )
}
