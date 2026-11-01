import { NextRequest, NextResponse } from 'next/server'
import {
  requireAuth,
  getServiceSupabase,
} from '@/lib/auth'
import {
  DEFAULT_RISK,
  evaluateOrderRisk,
  getDhanCredentials,
  isLiveTradingEnabled,
  type PortfolioSnapshot,
} from '@/lib/risk'
import { fetchQuote } from '@/lib/market-data'
import { resolveInstrument, normalizeSymbol } from '@/lib/instruments'
import { isSystemHalted, writeAuditLog } from '@/lib/system'

async function placeDhanOrder(params: {
  clientId: string
  accessToken: string
  orderType: 'BUY' | 'SELL'
  tradingSymbol: string
  securityId: string
  exchange: string
  quantity: number
  price: number
  tradeType: string
  orderMode?: string
}) {
  const productType = params.tradeType === 'intraday' ? 'INTRADAY' : 'CNC'
  const segment = params.exchange === 'BSE' ? 'BSE_EQ' : 'NSE_EQ'
  const body = {
    dhanClientId: params.clientId,
    transactionType: params.orderType,
    exchangeSegment: segment,
    productType,
    orderType: params.orderMode === 'LIMIT' ? 'LIMIT' : 'MARKET',
    validity: 'DAY',
    tradingSymbol: params.tradingSymbol,
    securityId: String(params.securityId),
    quantity: params.quantity,
    price: params.orderMode === 'LIMIT' ? params.price : 0,
  }
  const res = await fetch('https://api.dhan.co/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access-token': params.accessToken,
      'client-id': params.clientId,
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let data: any = null
  try {
    data = JSON.parse(text)
  } catch {
    data = { raw: text }
  }
  if (!res.ok) throw new Error(`Dhan order rejected (${res.status}): ${text.slice(0, 500)}`)
  const orderId = data?.orderId || data?.data?.orderId || data?.order_id || null
  if (!orderId) throw new Error(`Dhan response missing orderId: ${text.slice(0, 500)}`)
  return { orderId: String(orderId), raw: data }
}

export async function POST(req: NextRequest) {
  try {
    if (await isSystemHalted()) {
      return NextResponse.json({ error: 'System halted', code: 'KILL_SWITCH' }, { status: 403 })
    }

    const body = await req.json()
    const auth = await requireAuth(req)
    if ('error' in auth) {
      const fallback = body.userId
      if (!fallback) return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const userId = 'userId' in auth ? auth.userId : body.userId

    const {
      symbol,
      exchange = 'NSE',
      orderType,
      quantity,
      price: clientPrice,
      tradeType = 'swing',
      targetPrice,
      stopLoss,
      aiConfidence = 0,
      aiReasoning = '',
      isPaper = true,
      orderMode = 'MARKET',
      idempotencyKey,
    } = body

    if (!symbol || typeof symbol !== 'string') {
      return NextResponse.json({ error: 'symbol required' }, { status: 400 })
    }
    if (orderType !== 'BUY' && orderType !== 'SELL') {
      return NextResponse.json({ error: 'orderType must be BUY or SELL' }, { status: 400 })
    }
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty < 1) {
      return NextResponse.json({ error: 'quantity must be >= 1' }, { status: 400 })
    }

    const sym = normalizeSymbol(symbol)
    const instrument = resolveInstrument(sym, exchange === 'BSE' ? 'BSE' : 'NSE')

    const wantLive = isPaper === false
    const liveEnabled = isLiveTradingEnabled()
    const dhanCreds = getDhanCredentials()

    if (wantLive && !liveEnabled) {
      return NextResponse.json(
        { error: 'Live trading flag off', message: 'Set LIVE_TRADING_ENABLED=true' },
        { status: 403 }
      )
    }
    if (wantLive && !dhanCreds) {
      return NextResponse.json(
        { error: 'Dhan credentials missing', message: 'Set DHAN_CLIENT_ID and DHAN_ACCESS_TOKEN' },
        { status: 403 }
      )
    }
    if (wantLive && !instrument) {
      return NextResponse.json(
        { error: 'Unknown instrument', message: `No securityId mapping for ${sym}` },
        { status: 400 }
      )
    }

    const usePaper = !wantLive || !liveEnabled || !dhanCreds
    const quote = await fetchQuote(sym)
    if (!quote || quote.price <= 0) {
      return NextResponse.json(
        { error: 'Market data unavailable', message: 'No verified quote' },
        { status: 503 }
      )
    }
    const execPrice = clientPrice && Number(clientPrice) > 0 ? Number(clientPrice) : quote.price

    const supabase = getServiceSupabase()

    if (supabase && idempotencyKey) {
      const { data: prior } = await supabase
        .from('order_idempotency')
        .select('response')
        .eq('user_id', userId)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle()
      if (prior?.response) {
        return NextResponse.json({ ...prior.response, deduplicated: true })
      }
    }

    let snapshot: PortfolioSnapshot = {
      equity: 5_000_000,
      cash: 5_000_000,
      openPositions: 0,
      positionNotionalBySymbol: {},
      realizedPnlToday: 0,
    }
    if (supabase) {
      const { data: holdings } = await supabase
        .from('portfolio')
        .select('symbol, quantity, avg_buy_price, current_price')
        .eq('user_id', userId)
      if (holdings) {
        let equity = 0
        const map: Record<string, number> = {}
        for (const h of holdings) {
          const n = (h.current_price || h.avg_buy_price) * h.quantity
          map[h.symbol] = n
          equity += n
        }
        snapshot.openPositions = holdings.length
        snapshot.positionNotionalBySymbol = map
        snapshot.equity = Math.max(equity, 5_000_000)
        snapshot.cash = Math.max(500_000, 5_000_000 - equity)
      }
    }

    const risk = evaluateOrderRisk(
      {
        symbol: sym,
        side: orderType,
        quantity: qty,
        price: execPrice,
        isPaper: usePaper,
      },
      snapshot,
      { ...DEFAULT_RISK, paperOnly: false }
    )
    if (!risk.allowed) {
      return NextResponse.json(
        { error: 'Order blocked by risk engine', reasons: risk.reasons, code: risk.code },
        { status: 403 }
      )
    }

    let dhanOrderId: string | null = null
    let brokerStatus = usePaper ? 'OPEN' : 'SUBMITTED'

    if (!usePaper && dhanCreds && instrument) {
      try {
        const placed = await placeDhanOrder({
          clientId: dhanCreds.clientId,
          accessToken: dhanCreds.accessToken,
          orderType,
          tradingSymbol: instrument.tradingSymbol,
          securityId: instrument.securityId,
          exchange: instrument.exchange,
          quantity: qty,
          price: execPrice,
          tradeType,
          orderMode,
        })
        dhanOrderId = placed.orderId
        brokerStatus = 'SUBMITTED'
      } catch (err: any) {
        await writeAuditLog({
          userId,
          action: 'LIVE_ORDER_FAILED',
          detail: err.message,
        })
        return NextResponse.json(
          { error: 'Dhan order failed', message: err.message || 'Broker rejected', success: false },
          { status: 502 }
        )
      }
    }

    const responsePayload: any = {
      success: true,
      paper: usePaper,
      dhanOrderId,
      brokerStatus,
      securityId: instrument?.securityId || null,
      message: usePaper
        ? `${orderType} ${qty}× ${sym} @ ₹${execPrice.toFixed(2)} [PAPER]`
        : `${orderType} ${qty}× ${sym} submitted to Dhan (${dhanOrderId})`,
      dataSource: quote.source,
      dataTimestamp: quote.dataTimestamp,
    }

    if (!supabase) {
      responsePayload.trade = {
        symbol: sym,
        order_type: orderType,
        quantity: qty,
        price: execPrice,
        is_paper: usePaper,
        status: brokerStatus,
        dhan_order_id: dhanOrderId,
      }
      return NextResponse.json(responsePayload)
    }

    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .insert({
        user_id: userId,
        symbol: sym,
        exchange,
        trade_type: tradeType,
        order_type: orderType,
        quantity: qty,
        price: execPrice,
        target_price: targetPrice ?? null,
        stop_loss: stopLoss ?? null,
        ai_confidence: aiConfidence,
        ai_reasoning: aiReasoning || (usePaper ? 'Paper order' : 'Live Dhan order'),
        status: usePaper ? 'OPEN' : 'SUBMITTED',
        broker_status: brokerStatus,
        is_paper: usePaper,
        dhan_order_id: dhanOrderId,
        idempotency_key: idempotencyKey || null,
        executed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (tradeError) {
      return NextResponse.json(
        {
          error: tradeError.message,
          warning: dhanOrderId ? `Dhan accepted ${dhanOrderId} but DB insert failed` : undefined,
          dhanOrderId,
        },
        { status: 500 }
      )
    }

    if (usePaper) {
      if (orderType === 'BUY') {
        const { data: existing } = await supabase
          .from('portfolio')
          .select('*')
          .eq('user_id', userId)
          .eq('symbol', sym)
          .maybeSingle()
        if (existing) {
          const newQty = existing.quantity + qty
          const newAvg = (existing.avg_buy_price * existing.quantity + execPrice * qty) / newQty
          await supabase
            .from('portfolio')
            .update({
              quantity: newQty,
              avg_buy_price: +newAvg.toFixed(2),
              current_price: execPrice,
              pnl: +((execPrice - newAvg) * newQty).toFixed(2),
              pnl_percent: +(((execPrice - newAvg) / newAvg) * 100).toFixed(2),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
        } else {
          await supabase.from('portfolio').insert({
            user_id: userId,
            symbol: sym,
            exchange,
            quantity: qty,
            avg_buy_price: execPrice,
            current_price: execPrice,
            pnl: 0,
            pnl_percent: 0,
            trade_type: tradeType,
          })
        }
      } else {
        const { data: existing } = await supabase
          .from('portfolio')
          .select('*')
          .eq('user_id', userId)
          .eq('symbol', sym)
          .maybeSingle()
        if (existing) {
          const newQty = existing.quantity - qty
          if (newQty <= 0) await supabase.from('portfolio').delete().eq('id', existing.id)
          else {
            await supabase
              .from('portfolio')
              .update({
                quantity: newQty,
                current_price: execPrice,
                pnl: +((execPrice - existing.avg_buy_price) * newQty).toFixed(2),
              })
              .eq('id', existing.id)
          }
        }
      }
    }

    responsePayload.trade = trade
    if (idempotencyKey) {
      await supabase.from('order_idempotency').upsert({
        user_id: userId,
        idempotency_key: idempotencyKey,
        response: responsePayload,
      })
    }
    await writeAuditLog({
      userId,
      action: usePaper ? 'PAPER_TRADE' : 'LIVE_TRADE_SUBMIT',
      detail: `${orderType} ${qty} ${sym}`,
      meta: { dhanOrderId, brokerStatus },
    })
    return NextResponse.json(responsePayload)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  const { searchParams } = new URL(req.url)
  const userId = 'userId' in auth ? auth.userId : searchParams.get('userId') || req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
  const isPaper = searchParams.get('isPaper') !== 'false'
  const limit = Math.min(100, parseInt(searchParams.get('limit') || '50', 10))
  const supabase = getServiceSupabase()
  if (!supabase) return NextResponse.json([])
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .eq('is_paper', isPaper)
    .order('executed_at', { ascending: false })
    .limit(limit)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}
