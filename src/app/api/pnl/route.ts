import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const period = searchParams.get('period') || 'monthly'
  const isPaper = searchParams.get('isPaper') === 'true'

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  try {
    let fromDate = new Date()

    if (period === 'daily') {
      fromDate.setDate(fromDate.getDate() - 30)
    } else if (period === 'weekly') {
      fromDate.setDate(fromDate.getDate() - 90)
    } else {
      fromDate.setFullYear(fromDate.getFullYear() - 1)
    }

    const { data, error } = await supabase
      .from('pnl_history')
      .select('*')
      .eq('user_id', userId)
      .eq('is_paper', isPaper)
      .gte('date', fromDate.toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (error) throw error

    if (!data || data.length === 0) {
      const { data: trades } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', userId)
        .eq('is_paper', isPaper)
        .eq('status', 'CLOSED')
        .gte('closed_at', fromDate.toISOString())
        .order('closed_at', { ascending: true })

      if (!trades || trades.length === 0) {
        return NextResponse.json({ data: [], summary: { totalPnL: 0, winRate: 0 } })
      }

      const byDay: Record<string, { realized_pnl: number; total: number; winning: number }> = {}

      for (const trade of trades) {
        if (!trade.closed_at || !trade.pnl) continue
        const day = trade.closed_at.split('T')[0]

        if (!byDay[day]) byDay[day] = { realized_pnl: 0, total: 0, winning: 0 }
        byDay[day].realized_pnl += trade.pnl
        byDay[day].total++
        if (trade.pnl > 0) byDay[day].winning++
      }

      const pnlData = Object.entries(byDay).map(([date, v]) => ({
        date,
        realized_pnl: v.realized_pnl,
        total_trades: v.total,
        winning_trades: v.winning,
      }))

      return NextResponse.json({
        data: pnlData,
        summary: {
          totalPnL: pnlData.reduce((s, d) => s + d.realized_pnl, 0),
          winRate: pnlData.length > 0
            ? pnlData.reduce((s, d) => s + d.winning_trades, 0) /
              pnlData.reduce((s, d) => s + d.total_trades, 0) * 100
            : 0,
        }
      })
    }

    const summary = {
      totalPnL: data.reduce((s, d) => s + (d.realized_pnl || 0), 0),
      winRate: data.length > 0
        ? data.reduce((s, d) => s + (d.winning_trades || 0), 0) /
          Math.max(1, data.reduce((s, d) => s + (d.total_trades || 0), 0)) * 100
        : 0,
    }

    return NextResponse.json({ data, summary })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
