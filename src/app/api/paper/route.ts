import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getServiceSupabase } from '@/lib/auth'
import { fetchQuote } from '@/lib/market-data'
import { evaluateOrderRisk, DEFAULT_RISK } from '@/lib/risk'
import { isSystemHalted, writeAuditLog } from '@/lib/system'
import { normalizeSymbol } from '@/lib/instruments'
import { memoryGetAccount, memoryTrade } from '@/lib/paper-memory'

async function ensureAccount(userId: string) {
  const sb = getServiceSupabase()
  if (!sb) return null
  const { data } = await sb.from('paper_accounts').select('*').eq('user_id', userId).maybeSingle()
  if (data) return data
  const { data: created } = await sb
    .from('paper_accounts')
    .insert({ user_id: userId, cash: 1000000, realized_pnl: 0 })
    .select()
    .single()
  return created
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if ('error' in auth) {
    const uid = req.headers.get('x-user-id') || 'anonymous'
    const mem = memoryGetAccount(uid)
    const prices: Record<string, number> = {}
    for (const p of mem.positions) {
      const q = await fetchQuote(p.symbol)
      if (q) prices[p.symbol] = q.price
    }
    let equity = mem.cash
    const details = mem.positions.map((p) => {
      const px = prices[p.symbol] ?? p.avg_cost
      equity += px * p.quantity
      return {
        symbol: p.symbol,
        qty: p.quantity,
        avgCost: p.avg_cost,
        price: px,
        upnl: (px - p.avg_cost) * p.quantity,
      }
    })
    return NextResponse.json({
      cash: mem.cash,
      realizedPnl: mem.realized_pnl,
      equity,
      positions: details,
      ledger: mem.ledger,
      mode: 'paper',
      durable: false,
    })
  }

  const sb = getServiceSupabase()
  if (!sb) {
    const mem = memoryGetAccount(auth.userId)
    const prices: Record<string, number> = {}
    for (const p of mem.positions) {
      const q = await fetchQuote(p.symbol)
      if (q) prices[p.symbol] = q.price
    }
    let equity = mem.cash
    const details = mem.positions.map((p) => {
      const px = prices[p.symbol] ?? p.avg_cost
      equity += px * p.quantity
      return {
        symbol: p.symbol,
        qty: p.quantity,
        avgCost: p.avg_cost,
        price: px,
        upnl: (px - p.avg_cost) * p.quantity,
      }
    })
    return NextResponse.json({
      cash: mem.cash,
      realizedPnl: mem.realized_pnl,
      equity,
      positions: details,
      ledger: mem.ledger,
      mode: 'paper',
      durable: false,
    })
  }

  const account = await ensureAccount(auth.userId)
  const { data: positions } = await sb.from('paper_positions').select('*').eq('user_id', auth.userId)
  const { data: ledger } = await sb
    .from('paper_ledger')
    .select('*')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })
    .limit(100)

  const prices: Record<string, number> = {}
  for (const p of positions || []) {
    const q = await fetchQuote(p.symbol)
    if (q) prices[p.symbol] = q.price
  }
  let equity = Number(account?.cash || 0)
  const details = (positions || []).map((p) => {
    const px = prices[p.symbol] ?? Number(p.avg_cost)
    equity += px * Number(p.quantity)
    return {
      symbol: p.symbol,
      qty: Number(p.quantity),
      avgCost: Number(p.avg_cost),
      price: px,
      upnl: (px - Number(p.avg_cost)) * Number(p.quantity),
    }
  })

  return NextResponse.json({
    cash: Number(account?.cash || 0),
    realizedPnl: Number(account?.realized_pnl || 0),
    equity,
    positions: details,
    ledger: ledger || [],
    mode: 'paper',
    durable: true,
  })
}

export async function POST(req: NextRequest) {
  if (await isSystemHalted()) {
    return NextResponse.json({ error: 'System halted', code: 'KILL_SWITCH' }, { status: 403 })
  }
  const body = await req.json()
  const auth = await requireAuth(req)
  const userId = 'userId' in auth ? auth.userId : body.userId || req.headers.get('x-user-id') || 'anonymous'

  const { action, symbol, quantity, idempotencyKey } = body
  if (!symbol || !quantity || !action) {
    return NextResponse.json({ error: 'action, symbol, quantity required' }, { status: 400 })
  }
  const sym = normalizeSymbol(symbol)
  const qty = Number(quantity)
  if (!Number.isFinite(qty) || qty < 1) {
    return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 })
  }
  if (action !== 'BUY' && action !== 'SELL') {
    return NextResponse.json({ error: 'action must be BUY or SELL' }, { status: 400 })
  }

  const quote = await fetchQuote(sym)
  if (!quote) return NextResponse.json({ error: 'Quote unavailable' }, { status: 503 })

  const sb = getServiceSupabase()
  if (!sb) {
    const result = memoryTrade(userId, action, sym, qty, quote.price, idempotencyKey)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({
      success: true,
      price: quote.price,
      fee: result.fee,
      durable: false,
      message: 'Paper fill (in-memory — set Supabase for permanent ledger)',
    })
  }

  const account = await ensureAccount(userId)
  if (!account) return NextResponse.json({ error: 'Could not open paper account' }, { status: 500 })

  const { data: positions } = await sb.from('paper_positions').select('*').eq('user_id', userId)
  let equity = Number(account.cash || 0)
  const map: Record<string, number> = {}
  for (const p of positions || []) {
    const n = Number(p.avg_cost) * Number(p.quantity)
    map[p.symbol] = n
    equity += n
  }

  const risk = evaluateOrderRisk(
    {
      symbol: sym,
      side: action,
      quantity: qty,
      price: quote.price,
      isPaper: true,
    },
    {
      equity: Math.max(equity, Number(account.cash)),
      cash: Number(account.cash),
      openPositions: (positions || []).length,
      positionNotionalBySymbol: map,
      realizedPnlToday: Number(account.realized_pnl || 0),
    },
    { ...DEFAULT_RISK, paperOnly: false, maxOrderNotional: 500_000, maxPositionNotional: 1_000_000 }
  )
  if (!risk.allowed) {
    return NextResponse.json({ error: 'Risk blocked', reasons: risk.reasons }, { status: 403 })
  }

  const fee = qty * quote.price * 0.0005

  if (action === 'BUY') {
    const cost = qty * quote.price + fee
    if (Number(account.cash) < cost) {
      return NextResponse.json(
        { error: 'Insufficient cash', cash: account.cash, need: cost },
        { status: 400 }
      )
    }
    const newCash = Number(account.cash) - cost
    await sb.from('paper_accounts').update({ cash: newCash, updated_at: new Date().toISOString() }).eq('user_id', userId)
    const existing = (positions || []).find((p) => p.symbol === sym)
    if (existing) {
      const newQty = Number(existing.quantity) + qty
      const avg = (Number(existing.avg_cost) * Number(existing.quantity) + quote.price * qty) / newQty
      await sb
        .from('paper_positions')
        .update({ quantity: newQty, avg_cost: avg, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await sb.from('paper_positions').insert({
        user_id: userId,
        symbol: sym,
        quantity: qty,
        avg_cost: quote.price,
      })
    }
    await sb.from('paper_ledger').insert({
      user_id: userId,
      entry_type: 'BUY',
      symbol: sym,
      qty,
      price: quote.price,
      amount: -cost,
      cash_after: newCash,
      note: `Fee ${fee.toFixed(2)}`,
      idempotency_key: idempotencyKey || null,
    })
    await writeAuditLog({ userId, action: 'PAPER_BUY', detail: `${qty} ${sym} @ ${quote.price}` })
    return NextResponse.json({ success: true, price: quote.price, fee, durable: true })
  }

  const existing = (positions || []).find((p) => p.symbol === sym)
  if (!existing || Number(existing.quantity) < qty) {
    return NextResponse.json({ error: 'Insufficient position' }, { status: 400 })
  }
  const proceeds = qty * quote.price - fee
  const realized = (quote.price - Number(existing.avg_cost)) * qty - fee
  const newCash = Number(account.cash) + proceeds
  await sb
    .from('paper_accounts')
    .update({
      cash: newCash,
      realized_pnl: Number(account.realized_pnl) + realized,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
  const left = Number(existing.quantity) - qty
  if (left <= 0) await sb.from('paper_positions').delete().eq('id', existing.id)
  else
    await sb
      .from('paper_positions')
      .update({ quantity: left, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
  await sb.from('paper_ledger').insert({
    user_id: userId,
    entry_type: 'SELL',
    symbol: sym,
    qty,
    price: quote.price,
    amount: proceeds,
    cash_after: newCash,
    note: `Realized ${realized.toFixed(2)}`,
    idempotency_key: idempotencyKey || null,
  })
  await writeAuditLog({ userId, action: 'PAPER_SELL', detail: `${qty} ${sym} @ ${quote.price}` })
  return NextResponse.json({ success: true, price: quote.price, fee, realized, durable: true })
}
