
import { supabase } from './supabase'

export interface TradingSignal {
  symbol: string
  action: 'BUY' | 'SELL' | 'HOLD' | 'AVOID'
  confidence: number
  entryPrice: number
  targetPrice: number
  stopLoss: number
  reasoning: string
  tradeType: 'intraday' | 'swing' | 'options' | 'delivery'
  timeframe: string
  riskReward: number
}

export interface MarketCondition {
  trend: 'BULL' | 'BEAR' | 'SIDEWAYS'
  volatility: 'LOW' | 'MEDIUM' | 'HIGH'
  momentum: number
  suggestion: string
}

function calculateRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50

  let gains = 0
  let losses = 0

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1]
    if (diff >= 0) gains += diff
    else losses += Math.abs(diff)
  }

  let avgGain = gains / period
  let avgLoss = losses / period

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1]
    const gain = diff >= 0 ? diff : 0
    const loss = diff < 0 ? Math.abs(diff) : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
  }

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0
  const k = 2 / (period + 1)
  let ema = prices[0]
  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k)
  }
  return ema
}

function calculateMACD(prices: number[]) {
  if (prices.length < 26) return { macd: 0, signal: 0, histogram: 0 }
  const ema12Series: number[] = []
  const ema26Series: number[] = []
  const k12 = 2 / (12 + 1)
  const k26 = 2 / (26 + 1)
  let e12 = prices[0]
  let e26 = prices[0]
  for (let i = 0; i < prices.length; i++) {
    e12 = prices[i] * k12 + e12 * (1 - k12)
    e26 = prices[i] * k26 + e26 * (1 - k26)
    ema12Series.push(e12)
    ema26Series.push(e26)
  }
  const macdSeries = ema12Series.map((v, i) => v - ema26Series[i])
  const k9 = 2 / (9 + 1)
  let signal = macdSeries[0]
  for (let i = 1; i < macdSeries.length; i++) {
    signal = macdSeries[i] * k9 + signal * (1 - k9)
  }
  const macd = macdSeries[macdSeries.length - 1]
  return { macd, signal, histogram: macd - signal }
}

function calculateBollingerBands(prices: number[], period = 20) {
  if (prices.length < period) return { upper: 0, middle: 0, lower: 0 }
  
  const slice = prices.slice(-period)
  const mean = slice.reduce((a, b) => a + b, 0) / period
  const variance = slice.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / period
  const stdDev = Math.sqrt(variance)
  
  return {
    upper: mean + 2 * stdDev,
    middle: mean,
    lower: mean - 2 * stdDev,
  }
}

function calculateVolumeProfile(volumes: number[]): number {
  if (volumes.length === 0) return 1
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length
  const currentVolume = volumes[volumes.length - 1]
  return currentVolume / avgVolume
}

export function analyzeStock(
  symbol: string,
  currentPrice: number,
  prices: number[],
  volumes: number[],
  changePercent: number,
  aiMode: 'warren' | 'quant' | 'safe' | 'hypergrowth' = 'quant'
): TradingSignal {
  
  const rsi = calculateRSI(prices)
  const ema20 = calculateEMA(prices, 20)
  const ema50 = calculateEMA(prices, 50)
  const { upper, lower, middle } = calculateBollingerBands(prices)
  const { macd, histogram } = calculateMACD(prices)
  const volumeRatio = calculateVolumeProfile(volumes)

  let action: 'BUY' | 'SELL' | 'HOLD' | 'AVOID' = 'HOLD'
  let confidence = 50
  let reasons: string[] = []

  if (rsi < 30) {
    action = 'BUY'
    confidence += 20
    reasons.push(`RSI oversold at ${rsi.toFixed(0)}`)
  } else if (rsi > 70) {
    action = 'SELL'
    confidence += 15
    reasons.push(`RSI overbought at ${rsi.toFixed(0)}`)
  }

  if (ema20 > ema50) {
    if (action !== 'SELL') action = 'BUY'
    confidence += 15
    reasons.push('EMA20 above EMA50 — bullish trend')
  } else if (ema20 < ema50) {
    if (action !== 'BUY') action = 'SELL'
    confidence += 10
    reasons.push('EMA20 below EMA50 — bearish trend')
  }

  if (currentPrice < lower) {
    if (action !== 'SELL') action = 'BUY'
    confidence += 15
    reasons.push('Price below lower Bollinger Band — reversal likely')
  } else if (currentPrice > upper) {
    if (action !== 'BUY') action = 'SELL'
    confidence += 10
    reasons.push('Price above upper Bollinger Band — overextended')
  }

  if (volumeRatio > 1.5) {
    confidence += 10
    reasons.push(`Volume ${volumeRatio.toFixed(1)}x above average — conviction move`)
  }

  if (macd > 0 && histogram > 0) {
    confidence += 8
    reasons.push('MACD bullish')
  } else if (macd < 0 && histogram < 0) {
    confidence -= 5
  }

  if (changePercent > 3) {
    confidence += 10
    reasons.push(`Strong momentum +${changePercent.toFixed(1)}% today`)
  } else if (changePercent < -3) {
    confidence -= 5
  }

  switch (aiMode) {
    case 'safe':
      confidence -= 10
      if (confidence < 70) action = 'HOLD'
      break
    case 'hypergrowth':
      confidence += 5
      break
    case 'warren':
      if (rsi < 40 && changePercent > -2) confidence += 10
      break
    case 'quant':
      break
  }

  confidence = Math.min(92, Math.max(35, confidence))

  const atrApprox = (currentPrice * 0.02)
  const riskMultiplier = aiMode === 'hypergrowth' ? 2.5 : aiMode === 'safe' ? 1.5 : 2

  const targetPrice = action === 'BUY'
    ? currentPrice + atrApprox * riskMultiplier * 2
    : currentPrice - atrApprox * riskMultiplier * 2

  const stopLoss = action === 'BUY'
    ? currentPrice - atrApprox * riskMultiplier
    : currentPrice + atrApprox * riskMultiplier

  const riskReward = Math.abs(targetPrice - currentPrice) / Math.abs(stopLoss - currentPrice)

  let tradeType: 'intraday' | 'swing' | 'delivery' | 'options' = 'swing'
  if (Math.abs(changePercent) > 3) tradeType = 'intraday'
  if (rsi < 30 || rsi > 70) tradeType = 'swing'

  const timeframes = {
    intraday: 'Same day',
    swing: '3–7 trading days',
    delivery: '2–4 weeks',
    options: '1–2 weeks',
  }

  return {
    symbol,
    action,
    confidence: Math.round(confidence),
    entryPrice: currentPrice,
    targetPrice: Math.round(targetPrice * 100) / 100,
    stopLoss: Math.round(stopLoss * 100) / 100,
    reasoning: reasons.slice(0, 3).join('. ') + '.',
    tradeType,
    timeframe: timeframes[tradeType],
    riskReward: Math.round(riskReward * 10) / 10,
  }
}

export function assessPortfolioRisk(
  holdings: Array<{ symbol: string; pnl_percent: number; pnl: number }>,
  totalValue: number,
  dailyLossLimit: number
): { status: 'GREEN' | 'YELLOW' | 'RED'; message: string; shouldHibernate: boolean } {
  
  const totalPnL = holdings.reduce((sum, h) => sum + h.pnl, 0)
  const lossPercent = (Math.abs(Math.min(0, totalPnL)) / totalValue) * 100

  if (lossPercent === 0 || totalPnL > 0) {
    return { status: 'GREEN', message: 'Portfolio healthy. AI trading optimally.', shouldHibernate: false }
  }

  if (Math.abs(totalPnL) > dailyLossLimit * 0.8) {
    return {
      status: 'RED',
      message: `⚠️ Approaching daily loss limit. AI hibernating to protect capital.`,
      shouldHibernate: true,
    }
  }

  if (Math.abs(totalPnL) > dailyLossLimit * 0.5) {
    return {
      status: 'YELLOW',
      message: `Caution: ${lossPercent.toFixed(1)}% drawdown today. AI reducing position sizes.`,
      shouldHibernate: false,
    }
  }

  return { status: 'GREEN', message: 'Portfolio healthy. AI trading optimally.', shouldHibernate: false }
}

export async function logAIActivity(
  userId: string,
  action: string,
  symbol: string | null,
  reasoning: string,
  confidence: number
) {
  await supabase.from('ai_activity').insert({
    user_id: userId,
    action,
    symbol,
    reasoning,
    confidence,
  })
}

export function generateMorningBrief(
  niftyChange: number,
  usMarketClose: number,
  vix: number
): {
  stance: 'Aggressive' | 'Cautious' | 'Neutral'
  summary: string
  topWatches: string[]
  riskNote: string
} {
  
  let stance: 'Aggressive' | 'Cautious' | 'Neutral' = 'Neutral'
  
  if (niftyChange > 0.5 && usMarketClose > 0 && vix < 15) {
    stance = 'Aggressive'
  } else if (niftyChange < -0.5 || vix > 20) {
    stance = 'Cautious'
  }

  const summary = `US markets closed ${usMarketClose > 0 ? 'positive' : 'negative'} at ${usMarketClose > 0 ? '+' : ''}${usMarketClose.toFixed(2)}%. India VIX at ${vix.toFixed(1)} — ${vix < 15 ? 'low volatility, good for trending trades' : vix < 20 ? 'moderate volatility' : 'high volatility, reduce position sizes'}.`

  const riskNotes = [
    'Watch crude oil — any spike above $85 pressures Indian margins.',
    'Dollar-Rupee at key level — currency risk for IT exporters.',
    'FII flow data at 3:30 PM will be key for tomorrow\'s direction.',
    'RBI policy stance unchanged — rate-sensitives remain stable.',
  ]

  return {
    stance,
    summary,
    topWatches: ['RELIANCE', 'TCS', 'HDFCBANK'],
    riskNote: riskNotes[Math.floor(Math.random() * riskNotes.length)],
  }
}
