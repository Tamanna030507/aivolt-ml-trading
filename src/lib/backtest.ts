export type Bar = { time: number; open: number; high: number; low: number; close: number; volume: number }

export type BacktestConfig = {
  initialCash: number
  feeBps: number
  slippageBps: number
  positionPct: number
  probabilityBuy: number
  probabilitySell: number
  holdBars: number
}

export type TradeRecord = {
  entryTime: number
  exitTime: number
  side: 'LONG' | 'SHORT'
  entryPrice: number
  exitPrice: number
  qty: number
  pnl: number
  returnPct: number
}

export type BacktestResult = {
  equityCurve: { time: number; equity: number }[]
  trades: TradeRecord[]
  metrics: {
    totalReturn: number
    annualizedReturn: number | null
    maxDrawdown: number
    volatility: number | null
    sharpe: number | null
    winRate: number
    profitFactor: number | null
    nTrades: number
    avgWin: number
    avgLoss: number
  }
  assumptions: BacktestConfig
}

const DEFAULT: BacktestConfig = {
  initialCash: 1_000_000,
  feeBps: 5,
  slippageBps: 5,
  positionPct: 0.1,
  probabilityBuy: 0.58,
  probabilitySell: 0.42,
  holdBars: 5,
}

function cost(notional: number, cfg: BacktestConfig) {
  return notional * ((cfg.feeBps + cfg.slippageBps) / 10000)
}

export function runWalkForwardBacktest(
  bars: Bar[],
  probabilities: number[],
  cfg: Partial<BacktestConfig> = {}
): BacktestResult {
  const c = { ...DEFAULT, ...cfg }
  if (bars.length !== probabilities.length || bars.length < 30) {
    return {
      equityCurve: [],
      trades: [],
      metrics: {
        totalReturn: 0,
        annualizedReturn: null,
        maxDrawdown: 0,
        volatility: null,
        sharpe: null,
        winRate: 0,
        profitFactor: null,
        nTrades: 0,
        avgWin: 0,
        avgLoss: 0,
      },
      assumptions: c,
    }
  }

  let cash = c.initialCash
  let position = 0
  let entryPrice = 0
  let entryTime = 0
  let side: 'LONG' | 'SHORT' | null = null
  let holdLeft = 0
  const trades: TradeRecord[] = []
  const equityCurve: { time: number; equity: number }[] = []
  const dailyRets: number[] = []
  let prevEquity = c.initialCash

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i]
    const p = probabilities[i]
    const mark = bar.close
    let equity = cash + position * mark

    if (side && holdLeft <= 0) {
      const exitPx = side === 'LONG' ? mark * (1 - c.slippageBps / 10000) : mark * (1 + c.slippageBps / 10000)
      const notional = Math.abs(position) * exitPx
      const fee = cost(notional, c)
      const pnl =
        side === 'LONG'
          ? position * (exitPx - entryPrice) - fee
          : Math.abs(position) * (entryPrice - exitPx) - fee
      cash += position * exitPx - fee * Math.sign(position || 1)
      if (side === 'SHORT') cash += -position * exitPx - fee
      trades.push({
        entryTime,
        exitTime: bar.time,
        side,
        entryPrice,
        exitPrice: exitPx,
        qty: Math.abs(position),
        pnl,
        returnPct: entryPrice ? pnl / (Math.abs(position) * entryPrice) : 0,
      })
      position = 0
      side = null
      equity = cash
    }

    if (!side && p >= c.probabilityBuy) {
      const budget = equity * c.positionPct
      const px = mark * (1 + c.slippageBps / 10000)
      const qty = Math.floor(budget / px)
      if (qty > 0) {
        const fee = cost(qty * px, c)
        if (cash >= qty * px + fee) {
          cash -= qty * px + fee
          position = qty
          entryPrice = px
          entryTime = bar.time
          side = 'LONG'
          holdLeft = c.holdBars
        }
      }
    } else if (!side && p <= c.probabilitySell) {
      const budget = equity * c.positionPct
      const px = mark * (1 - c.slippageBps / 10000)
      const qty = Math.floor(budget / px)
      if (qty > 0) {
        const fee = cost(qty * px, c)
        cash += qty * px - fee
        position = -qty
        entryPrice = px
        entryTime = bar.time
        side = 'SHORT'
        holdLeft = c.holdBars
      }
    }

    if (holdLeft > 0) holdLeft -= 1
    equity = cash + position * mark
    equityCurve.push({ time: bar.time, equity })
    if (prevEquity > 0) dailyRets.push(equity / prevEquity - 1)
    prevEquity = equity
  }

  const finalEquity = equityCurve.length ? equityCurve[equityCurve.length - 1].equity : c.initialCash
  const totalReturn = finalEquity / c.initialCash - 1
  let peak = c.initialCash
  let maxDd = 0
  for (const pt of equityCurve) {
    peak = Math.max(peak, pt.equity)
    maxDd = Math.max(maxDd, peak > 0 ? (peak - pt.equity) / peak : 0)
  }
  const wins = trades.filter((t) => t.pnl > 0)
  const losses = trades.filter((t) => t.pnl <= 0)
  const grossWin = wins.reduce((s, t) => s + t.pnl, 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0))
  const mean = dailyRets.length ? dailyRets.reduce((a, b) => a + b, 0) / dailyRets.length : 0
  const variance =
    dailyRets.length > 1
      ? dailyRets.reduce((s, r) => s + (r - mean) ** 2, 0) / (dailyRets.length - 1)
      : 0
  const vol = Math.sqrt(variance)
  const sharpe = vol > 0 ? (mean / vol) * Math.sqrt(252) : null
  const years = bars.length / 252
  const ann = years > 0 ? Math.pow(1 + totalReturn, 1 / years) - 1 : null

  return {
    equityCurve,
    trades,
    metrics: {
      totalReturn,
      annualizedReturn: ann,
      maxDrawdown: maxDd,
      volatility: vol > 0 ? vol * Math.sqrt(252) : null,
      sharpe,
      winRate: trades.length ? wins.length / trades.length : 0,
      profitFactor: grossLoss > 0 ? grossWin / grossLoss : null,
      nTrades: trades.length,
      avgWin: wins.length ? grossWin / wins.length : 0,
      avgLoss: losses.length ? -grossLoss / losses.length : 0,
    },
    assumptions: c,
  }
}
