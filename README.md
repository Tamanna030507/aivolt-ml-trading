# AIVOLT

Production-oriented Indian equity research, ML signals, paper trading, backtesting, and optional live Dhan orders.

## Working

- Real Yahoo market data only (no synthetic production OHLC)
- Symbol → Dhan securityId resolver (no manual securityId for mapped NSE names)
- Trained logistic inference + feature contribution "Why?" drawer
- Durable paper ledger tables (Supabase) + in-memory fallback messaging
- Live Dhan submit when LIVE_TRADING_ENABLED + DHAN_* keys (auto securityId)
- Order status poll `/api/orders/status`
- Server kill switch `/api/system` + UI Safety console
- Mode banner (LIVE / PAPER / HALTED)
- Backtest sidebar page (equity + drawdown charts)
- Idempotency keys on orders
- Audit log API

## Setup

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

Run the full `supabase-schema.sql` in Supabase SQL editor (includes paper_*, system_status, audit_log).

## Env

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEWS_API_KEY=
DHAN_CLIENT_ID=
DHAN_ACCESS_TOKEN=
LIVE_TRADING_ENABLED=true
```

## Honest ML note

Out-of-sample directional AUC is roughly 0.5–0.55 on TA features. Signals are research tools, not guaranteed profit.

## Still optional / improve next

- Full JWT-only enforcement everywhere (Bearer preferred)
- Fill reconciliation into portfolio on FILLED
- Monte Carlo bands on backtest
- Broader instrument master from Dhan file download
