export type LedgerEntry = {
  id: string
  ts: string
  type: 'DEPOSIT' | 'WITHDRAW' | 'BUY' | 'SELL' | 'FEE'
  symbol?: string
  qty?: number
  price?: number
  amount: number
  cashAfter: number
  note?: string
}

export type PaperPosition = {
  symbol: string
  qty: number
  avgCost: number
}

export type PaperState = {
  cash: number
  positions: Record<string, PaperPosition>
  ledger: LedgerEntry[]
  realizedPnl: number
}

export function createPaperAccount(initialCash = 1_000_000): PaperState {
  const entry: LedgerEntry = {
    id: `dep-${Date.now()}`,
    ts: new Date().toISOString(),
    type: 'DEPOSIT',
    amount: initialCash,
    cashAfter: initialCash,
    note: 'Initial virtual balance',
  }
  return { cash: initialCash, positions: {}, ledger: [entry], realizedPnl: 0 }
}

export function paperBuy(
  state: PaperState,
  symbol: string,
  qty: number,
  price: number,
  fee = 0
): { ok: true; state: PaperState } | { ok: false; reason: string } {
  const cost = qty * price + fee
  if (qty < 1 || price <= 0) return { ok: false, reason: 'Invalid qty/price' }
  if (state.cash < cost) return { ok: false, reason: 'Insufficient cash' }
  const cash = state.cash - cost
  const pos = state.positions[symbol]
  const positions = { ...state.positions }
  if (pos) {
    const newQty = pos.qty + qty
    const avgCost = (pos.avgCost * pos.qty + price * qty) / newQty
    positions[symbol] = { symbol, qty: newQty, avgCost }
  } else {
    positions[symbol] = { symbol, qty, avgCost: price }
  }
  const entry: LedgerEntry = {
    id: `buy-${Date.now()}-${symbol}`,
    ts: new Date().toISOString(),
    type: 'BUY',
    symbol,
    qty,
    price,
    amount: -cost,
    cashAfter: cash,
  }
  return {
    ok: true,
    state: {
      cash,
      positions,
      ledger: [...state.ledger, entry],
      realizedPnl: state.realizedPnl,
    },
  }
}

export function paperSell(
  state: PaperState,
  symbol: string,
  qty: number,
  price: number,
  fee = 0
): { ok: true; state: PaperState; realized: number } | { ok: false; reason: string } {
  const pos = state.positions[symbol]
  if (!pos || pos.qty < qty) return { ok: false, reason: 'Insufficient position' }
  if (qty < 1 || price <= 0) return { ok: false, reason: 'Invalid qty/price' }
  const proceeds = qty * price - fee
  const realized = (price - pos.avgCost) * qty - fee
  const cash = state.cash + proceeds
  const positions = { ...state.positions }
  const left = pos.qty - qty
  if (left <= 0) delete positions[symbol]
  else positions[symbol] = { symbol, qty: left, avgCost: pos.avgCost }
  const entry: LedgerEntry = {
    id: `sell-${Date.now()}-${symbol}`,
    ts: new Date().toISOString(),
    type: 'SELL',
    symbol,
    qty,
    price,
    amount: proceeds,
    cashAfter: cash,
  }
  return {
    ok: true,
    realized,
    state: {
      cash,
      positions,
      ledger: [...state.ledger, entry],
      realizedPnl: state.realizedPnl + realized,
    },
  }
}

export function markToMarket(state: PaperState, prices: Record<string, number>) {
  let equity = state.cash
  const details: { symbol: string; qty: number; avgCost: number; price: number; upnl: number }[] = []
  for (const p of Object.values(state.positions)) {
    const px = prices[p.symbol] ?? p.avgCost
    const upnl = (px - p.avgCost) * p.qty
    equity += px * p.qty
    details.push({ symbol: p.symbol, qty: p.qty, avgCost: p.avgCost, price: px, upnl })
  }
  return { equity, unrealizedPnl: equity - state.cash - Object.values(state.positions).reduce((s, p) => s + p.avgCost * p.qty, 0), details }
}
