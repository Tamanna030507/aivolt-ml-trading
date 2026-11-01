export type RiskProfile = {
  maxPositionNotional: number
  maxOrderNotional: number
  maxPositionPctOfEquity: number
  dailyLossLimit: number
  maxOpenPositions: number
  killSwitch: boolean
  paperOnly: boolean
}

export const DEFAULT_RISK: RiskProfile = {
  maxPositionNotional: 2_000_000,
  maxOrderNotional: 1_000_000,
  maxPositionPctOfEquity: 0.15,
  dailyLossLimit: 25_000,
  maxOpenPositions: 20,
  killSwitch: false,
  paperOnly: false,
}

export type OrderIntent = {
  symbol: string
  side: 'BUY' | 'SELL'
  quantity: number
  price: number
  isPaper: boolean
}

export type PortfolioSnapshot = {
  equity: number
  cash: number
  openPositions: number
  positionNotionalBySymbol: Record<string, number>
  realizedPnlToday: number
}

export type RiskDecision = {
  allowed: boolean
  reasons: string[]
  code?: string
}

export function evaluateOrderRisk(
  intent: OrderIntent,
  snapshot: PortfolioSnapshot,
  profile: RiskProfile = DEFAULT_RISK
): RiskDecision {
  const reasons: string[] = []

  if (profile.killSwitch) {
    return { allowed: false, reasons: ['Kill switch is active — no new orders'], code: 'KILL_SWITCH' }
  }

  if (!intent.isPaper && profile.paperOnly) {
    return {
      allowed: false,
      reasons: ['Live trading is disabled by risk profile'],
      code: 'LIVE_DISABLED',
    }
  }

  if (intent.quantity < 1 || !Number.isFinite(intent.quantity)) {
    return { allowed: false, reasons: ['Invalid quantity'], code: 'INVALID_QTY' }
  }

  if (intent.price <= 0 || !Number.isFinite(intent.price)) {
    return { allowed: false, reasons: ['Invalid price'], code: 'INVALID_PRICE' }
  }

  const notional = intent.quantity * intent.price

  if (notional > profile.maxOrderNotional) {
    reasons.push(`Order notional ₹${notional.toFixed(0)} exceeds max order limit ₹${profile.maxOrderNotional}`)
  }

  if (intent.side === 'BUY') {
    const existing = snapshot.positionNotionalBySymbol[intent.symbol] || 0
    const newPositionNotional = existing + notional
    if (newPositionNotional > profile.maxPositionNotional) {
      reasons.push(`Position notional would exceed ₹${profile.maxPositionNotional}`)
    }
    if (snapshot.equity > 0 && newPositionNotional / snapshot.equity > profile.maxPositionPctOfEquity) {
      reasons.push(
        `Position would exceed ${(profile.maxPositionPctOfEquity * 100).toFixed(0)}% of equity`
      )
    }
    if (intent.isPaper && snapshot.cash < notional) {
      reasons.push(`Insufficient cash: need ₹${notional.toFixed(2)}, have ₹${snapshot.cash.toFixed(2)}`)
    }
    if (snapshot.openPositions >= profile.maxOpenPositions && existing === 0) {
      reasons.push(`Max open positions (${profile.maxOpenPositions}) reached`)
    }
  }

  if (Math.abs(snapshot.realizedPnlToday) >= profile.dailyLossLimit && snapshot.realizedPnlToday < 0) {
    reasons.push(`Daily loss limit ₹${profile.dailyLossLimit} reached`)
  }

  if (reasons.length > 0) {
    return { allowed: false, reasons, code: 'RISK_LIMIT' }
  }

  return { allowed: true, reasons: [] }
}

export function isLiveTradingEnabled(): boolean {
  return process.env.LIVE_TRADING_ENABLED === 'true'
}

export function getDhanCredentials(): { clientId: string; accessToken: string } | null {
  const clientId = process.env.DHAN_CLIENT_ID || ''
  const accessToken = process.env.DHAN_ACCESS_TOKEN || ''
  if (!clientId || !accessToken) return null
  return { clientId, accessToken }
}
