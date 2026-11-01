import { NextRequest, NextResponse } from 'next/server'
import { fetchDailyHistory, toYahooSymbol } from '@/lib/market-data'
import { buildFeatureVector } from '@/lib/feature-builder'
import { predictLogistic } from '@/lib/ml-inference'
import { runWalkForwardBacktest } from '@/lib/backtest'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const symbol = body.symbol || 'RELIANCE'
    const yahoo = toYahooSymbol(symbol)
    const history = await fetchDailyHistory(yahoo, body.range || '2y')
    if (!history || history.candles.length < 80) {
      return NextResponse.json(
        { error: 'Insufficient history for backtest', candles: history?.candles.length || 0 },
        { status: 503 }
      )
    }

    const bars = history.candles
    const probabilities: number[] = []
    for (let i = 0; i < bars.length; i++) {
      if (i < 60) {
        probabilities.push(0.5)
        continue
      }
      const window = bars.slice(0, i + 1)
      const closes = window.map((b) => b.close)
      const volumes = window.map((b) => b.volume)
      const highs = window.map((b) => b.high)
      const lows = window.map((b) => b.low)
      const feats = buildFeatureVector(closes, volumes, highs, lows)
      if (!feats) {
        probabilities.push(0.5)
        continue
      }
      const pred = predictLogistic(feats)
      probabilities.push(pred ? pred.probability : 0.5)
    }

    const result = runWalkForwardBacktest(bars, probabilities, {
      initialCash: body.initialCash || 1_000_000,
      feeBps: body.feeBps ?? 5,
      slippageBps: body.slippageBps ?? 5,
      positionPct: body.positionPct ?? 0.1,
      probabilityBuy: body.probabilityBuy ?? 0.58,
      probabilitySell: body.probabilitySell ?? 0.42,
      holdBars: body.holdBars ?? 5,
    })

    return NextResponse.json({
      symbol: yahoo,
      source: history.source,
      nBars: bars.length,
      metrics: result.metrics,
      assumptions: result.assumptions,
      nTrades: result.trades.length,
      trades: result.trades.slice(-50),
      equityCurve: result.equityCurve.filter((_, i) => i % 5 === 0 || i === result.equityCurve.length - 1),
      note: 'Walk-forward simulation using only information available at each bar. Costs included. Not a guarantee of live performance.',
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Backtest failed' }, { status: 500 })
  }
}
