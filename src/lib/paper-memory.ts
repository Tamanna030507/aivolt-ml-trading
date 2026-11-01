type Position = { symbol: string; quantity: number; avg_cost: number }
type LedgerEntry = {
  id: string
  entry_type: string
  symbol: string
  qty: number
  price: number
  amount: number
  cash_after: number
  note: string
  created_at: string
  idempotency_key?: string
}
type Account = {
  cash: number
  realized_pnl: number
  positions: Map<string, Position>
  ledger: LedgerEntry[]
}

const accounts = new Map<string, Account>()

function getOrCreate(userId: string): Account {
  let a = accounts.get(userId)
  if (!a) {
    a = { cash: 1_000_000, realized_pnl: 0, positions: new Map(), ledger: [] }
    accounts.set(userId, a)
  }
  return a
}

export function memoryGetAccount(userId: string) {
  const a = getOrCreate(userId)
  return {
    cash: a.cash,
    realized_pnl: a.realized_pnl,
    positions: Array.from(a.positions.values()),
    ledger: a.ledger.slice(0, 100),
  }
}

export function memoryTrade(
  userId: string,
  action: 'BUY' | 'SELL',
  symbol: string,
  qty: number,
  price: number,
  idempotencyKey?: string
) {
  const a = getOrCreate(userId)
  if (idempotencyKey && a.ledger.some((e) => e.idempotency_key === idempotencyKey)) {
    return { ok: true as const, deduplicated: true, cash: a.cash }
  }
  const fee = qty * price * 0.0005
  if (action === 'BUY') {
    const cost = qty * price + fee
    if (a.cash < cost) return { ok: false as const, error: 'Insufficient cash' }
    a.cash -= cost
    const existing = a.positions.get(symbol)
    if (existing) {
      const newQty = existing.quantity + qty
      existing.avg_cost = (existing.avg_cost * existing.quantity + price * qty) / newQty
      existing.quantity = newQty
    } else {
      a.positions.set(symbol, { symbol, quantity: qty, avg_cost: price })
    }
    a.ledger.unshift({
      id: `m-${Date.now()}`,
      entry_type: 'BUY',
      symbol,
      qty,
      price,
      amount: -cost,
      cash_after: a.cash,
      note: `Fee ${fee.toFixed(2)}`,
      created_at: new Date().toISOString(),
      idempotency_key: idempotencyKey,
    })
    return { ok: true as const, cash: a.cash, fee }
  }
  const existing = a.positions.get(symbol)
  if (!existing || existing.quantity < qty) return { ok: false as const, error: 'Insufficient position' }
  const proceeds = qty * price - fee
  const realized = (price - existing.avg_cost) * qty - fee
  a.cash += proceeds
  a.realized_pnl += realized
  existing.quantity -= qty
  if (existing.quantity <= 0) a.positions.delete(symbol)
  a.ledger.unshift({
    id: `m-${Date.now()}`,
    entry_type: 'SELL',
    symbol,
    qty,
    price,
    amount: proceeds,
    cash_after: a.cash,
    note: `Realized ${realized.toFixed(2)}`,
    created_at: new Date().toISOString(),
    idempotency_key: idempotencyKey,
  })
  return { ok: true as const, cash: a.cash, fee, realized }
}
