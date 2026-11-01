import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const [crudeRes, forexRes] = await Promise.allSettled([
      fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/BZ=F?interval=1m&range=1d`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      ),
      fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/USDINR=X?interval=1m&range=1d`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      ),
    ])

    let crudePrice = 0
    let crudeChange = 0
    let forexPrice = 0
    let forexChange = 0

    if (crudeRes.status === 'fulfilled' && crudeRes.value.ok) {
      const data = await crudeRes.value.json()
      const meta = data?.chart?.result?.[0]?.meta
      if (meta) {
        crudePrice = meta.regularMarketPrice || 0
        crudeChange = ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100
      }
    }

    if (forexRes.status === 'fulfilled' && forexRes.value.ok) {
      const data = await forexRes.value.json()
      const meta = data?.chart?.result?.[0]?.meta
      if (meta) {
        forexPrice = meta.regularMarketPrice || 0
        forexChange = ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100
      }
    }

    const macroData = [
      {
        title: 'US Federal Reserve',
        value: '4.25–4.50%',
        label: 'Fed Funds Rate',
        trend: 'HOLD',
        impact: 'Fed held rates steady in May 2025. Markets pricing in 1-2 cuts in H2 2025. Stable US rates reduce FII outflow pressure from India.',
        color: 'text-accent-blue',
        live: false,
      },
      {
        title: 'RBI India',
        value: '6.00%',
        label: 'Repo Rate',
        trend: 'CUT',
        impact: 'RBI cut repo rate by 25bps to 6% in April 2025 MPC meeting. Positive for banking, housing finance, and rate-sensitive sectors.',
        color: 'text-accent-green',
        live: false,
      },
      {
        title: 'Crude Oil (Brent)',
        value: crudePrice > 0 ? `$${crudePrice.toFixed(2)}` : '$65–70 range',
        label: 'per barrel (USD)',
        trend: crudeChange > 1 ? 'UP' : crudeChange < -1 ? 'DOWN' : 'STABLE',
        impact: crudePrice > 80
          ? `Crude at $${crudePrice.toFixed(2)} — elevated. Higher oil increases India's import costs. Negative for aviation (IndiGo), paints (Asian Paints), tyres (MRF). Watch for OMC pressure.`
          : crudePrice > 0
          ? `Crude at $${crudePrice.toFixed(2)} — manageable range for India. CAD pressure limited. Aviation, paints, and tyre stocks breathing easier.`
          : 'Crude oil in a range. Impact on inflation and current account deficit being monitored. Low crude is positive for Indian macro.',
        color: crudeChange > 1 ? 'text-accent-red' : 'text-accent-green',
        live: true,
      },
      {
        title: 'USD/INR',
        value: forexPrice > 0 ? `₹${forexPrice.toFixed(2)}` : '₹84–86 range',
        label: 'Exchange Rate (Live)',
        trend: forexChange > 0.3 ? 'WEAKENING' : forexChange < -0.3 ? 'STRENGTHENING' : 'STABLE',
        impact: forexPrice > 0
          ? `Rupee at ₹${forexPrice.toFixed(2)}/USD. ${
              forexPrice > 86 ? 'Weak rupee increases import costs. Negative for oil importers and foreign debt holders. IT exporters benefit.' :
              forexPrice < 83 ? 'Strong rupee reduces IT export earnings in INR terms. Positive for importers and foreign travel.' :
              'Rupee in stable range. Predictable earnings for IT exporters. Import costs manageable.'
            }`
          : 'Rupee tracking global dollar strength. RBI actively managing volatility. IT exporters benefit from weaker rupee.',
        color: forexChange > 0 ? 'text-accent-red' : 'text-accent-gold',
        live: true,
      },
    ]

    return NextResponse.json(macroData)
  } catch (error) {
    return NextResponse.json([
      { title: 'US Federal Reserve', value: '4.25–4.50%', label: 'Fed Funds Rate', trend: 'HOLD', impact: 'Fed held rates. 1-2 cuts expected H2 2025.', color: 'text-accent-blue', live: false },
      { title: 'RBI India', value: '6.00%', label: 'Repo Rate', trend: 'CUT', impact: 'RBI cut 25bps in April 2025. Rate-sensitives benefit.', color: 'text-accent-green', live: false },
      { title: 'Crude Oil (Brent)', value: 'Fetch failed', label: 'per barrel', trend: '—', impact: 'Unable to fetch live crude price. Check network.', color: 'text-accent-gold', live: true },
      { title: 'USD/INR', value: 'Fetch failed', label: 'Exchange Rate', trend: '—', impact: 'Unable to fetch live forex rate. Check network.', color: 'text-accent-gold', live: true },
    ])
  }
}