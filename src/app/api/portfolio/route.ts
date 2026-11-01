import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchQuote } from '@/lib/market-data'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId') || req.headers.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({
      holdings: [],
      summary: {
        totalInvested: 0,
        totalCurrent: 0,
        totalPnL: 0,
        totalPnLPercent: 0,
        holdingsCount: 0,
      },
      message: 'Database not configured',
    })
  }

  try {
    const { data: portfolio, error } = await supabase
      .from('portfolio')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) throw error

    const holdings = portfolio || []
    const totalInvested = holdings.reduce((sum, h) => sum + h.avg_buy_price * h.quantity, 0)
    const totalCurrent = holdings.reduce((sum, h) => sum + h.current_price * h.quantity, 0)
    const totalPnL = totalCurrent - totalInvested
    const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0

    return NextResponse.json({
      holdings,
      summary: {
        totalInvested: +totalInvested.toFixed(2),
        totalCurrent: +totalCurrent.toFixed(2),
        totalPnL: +totalPnL.toFixed(2),
        totalPnLPercent: +totalPnLPercent.toFixed(2),
        holdingsCount: holdings.length,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const userId = body.userId || req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const supabase = getSupabase()
    if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 })

    const { data: holdings } = await supabase
      .from('portfolio')
      .select('*')
      .eq('user_id', userId)

    if (!holdings?.length) return NextResponse.json({ success: true, updated: 0 })

    let updated = 0
    for (const h of holdings) {
      const quote = await fetchQuote(h.symbol)
      if (!quote) continue
      const pnl = (quote.price - h.avg_buy_price) * h.quantity
      const pnlPercent = ((quote.price - h.avg_buy_price) / h.avg_buy_price) * 100
      await supabase
        .from('portfolio')
        .update({
          current_price: quote.price,
          pnl: +pnl.toFixed(2),
          pnl_percent: +pnlPercent.toFixed(2),
          updated_at: new Date().toISOString(),
        })
        .eq('id', h.id)
      updated++
    }

    return NextResponse.json({ success: true, updated, source: 'yahoo' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
