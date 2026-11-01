import { NextRequest, NextResponse } from 'next/server'
import { fetchDailyHistory, fetchQuote, toYahooSymbol } from '@/lib/market-data'
import { predictLogistic } from '@/lib/ml-inference'
import { buildFeatureVector } from '@/lib/feature-builder'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { symbol } = body
    if (!symbol || typeof symbol !== 'string') {
      return NextResponse.json({ error: 'symbol required' }, { status: 400 })
    }

    const yahooSymbol = toYahooSymbol(symbol)
    const [quote, history] = await Promise.all([
      fetchQuote(yahooSymbol),
      fetchDailyHistory(yahooSymbol, '2y'),
    ])

    if (!quote || !history || history.candles.length < 60) {
      return NextResponse.json(
        {
          error: 'Insufficient real market data',
          message: 'Need at least 60 verified daily bars. No synthetic series used.',
          symbol: yahooSymbol,
          dataQuality: 'insufficient',
          action: 'ABSTAIN',
        },
        { status: 503 }
      )
    }

    const closes = history.candles.map((c) => c.close)
    const volumes = history.candles.map((c) => c.volume)
    const highs = history.candles.map((c) => c.high)
    const lows = history.candles.map((c) => c.low)
    const features = buildFeatureVector(closes, volumes, highs, lows)
    if (!features) {
      return NextResponse.json(
        { error: 'Feature build failed', action: 'ABSTAIN', dataQuality: 'insufficient' },
        { status: 503 }
      )
    }

    const ml = predictLogistic(features)
    if (!ml) {
      return NextResponse.json({ error: 'Model inference failed', action: 'ABSTAIN' }, { status: 500 })
    }

    const currentPrice = quote.price
    let action: 'BUY' | 'SELL' | 'HOLD' | 'ABSTAIN' = 'HOLD'
    if (ml.probability >= 0.58) action = 'BUY'
    else if (ml.probability <= 0.42) action = 'SELL'
    else action = 'HOLD'

    const testAuc = typeof ml.metrics?.auc === 'number' ? ml.metrics.auc : null
    if (testAuc !== null && testAuc < 0.52) {
      if (action !== 'HOLD' && ml.probability > 0.45 && ml.probability < 0.55) {
        action = 'HOLD'
      }
    }

    const atr = currentPrice * 0.02
    const targetPrice =
      action === 'BUY'
        ? +(currentPrice + atr * 4).toFixed(2)
        : action === 'SELL'
          ? +(currentPrice - atr * 4).toFixed(2)
          : currentPrice
    const stopLoss =
      action === 'BUY'
        ? +(currentPrice - atr * 2).toFixed(2)
        : action === 'SELL'
          ? +(currentPrice + atr * 2).toFixed(2)
          : currentPrice

    return NextResponse.json({
      symbol: yahooSymbol,
      action,
      probability: +ml.probability.toFixed(4),
      confidence: Math.round(ml.probability * 100),
      note:
        'Logistic model on real features. Out-of-sample AUC is near 0.5 — treat as research signal, not a high-accuracy forecast.',
      entryPrice: currentPrice,
      targetPrice,
      stopLoss,
      riskReward:
        Math.abs(stopLoss - currentPrice) > 0
          ? +(Math.abs(targetPrice - currentPrice) / Math.abs(stopLoss - currentPrice)).toFixed(2)
          : 0,
      targetDefinition: `P(forward ${ml.horizon}-session return > ${ml.threshold})`,
      features,
      featureContributions: ml.featureContributions,
      model: ml.model,
      modelVersion: ml.version,
      modelMetrics: ml.metrics,
      dataQuality: 'ok',
      dataSource: history.source,
      dataTimestamp: quote.dataTimestamp,
      predictionTimestamp: new Date().toISOString(),
      tradeType: 'swing',
      timeframe: `${ml.horizon} sessions`,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Signal failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const symbol = new URL(req.url).searchParams.get('symbol')
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 })
  return POST({ json: async () => ({ symbol }) } as NextRequest)
}
