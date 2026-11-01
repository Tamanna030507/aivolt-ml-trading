# AIVOLT
**Production-oriented Indian equity research, ML signals, risk-gated paper trading, and live broker integration.**

AIVOLT is a full-stack quantitative trading platform engineered with a "safety-first" architecture. It fuses real-time market data, machine learning inference, strict server-side risk controls, and an optional live execution path via Dhan.

---

##  System Metrics (v1.0)
*Proof of engineering rigor and pipeline speed.*

- **21** Engineered technical features (MACD, RSI, Bollinger Bands, volume profiles, etc.)
- **~1.2 ms** Average inference latency per signal (CPU, in-memory model)
- **0** Synthetic/Fake prices in production (Yahoo Finance API + 503 fallback)
- **100%** Risk-gate coverage (All orders pass through kill-switch and margin checks)
- **~0.55** Best out-of-sample AUC (20-day up/down prediction)

---

##  Core Features & What Actually Works

- **Real Data Only:** Ingests real-time Yahoo Finance data. No synthetic or fake production OHLC.
- **Intelligent Broker Routing:** Auto-resolves NSE symbols to Dhan `securityId` via an internal resolver map (no manual IDs required for mapped names).
- **ML Signal Engine:** Trained Logistic Regression inference on live features, complete with a "Why?" feature-contribution drawer for explainability.
- **Durable Paper Trading:** Fully persistent paper ledger backed by Supabase (with an in-memory fallback for quick testing).
- **Live Execution Path:** Integrated Dhan order submission (gated by `LIVE_TRADING_ENABLED` and API keys) with auto-securityId mapping.
- **Order Lifecycle Tracking:** Dedicated `/api/orders/status` polling to track fills and rejections.
- **Global Kill Switch:** A server-side `/api/system` endpoint and UI "Safety Console" to instantly halt all trading activity.
- **Risk Gating:** Global mode banner (LIVE / PAPER / HALTED) and idempotency keys on all orders to prevent double-buys.
- **Analytics:** Dedicated backtest page with interactive equity and drawdown charts.

---

##  The ML Model Card (Honest & Rigorous)

We don't claim to predict the future. We build a rigorous ML pipeline.

| Metric | Value |
|--------|-------|
| **Model Architecture** | Logistic Regression (with L2 regularization) |
| **Feature Count** | 21 (Normalized TA indicators) |
| **Training Window** | 5 Years (Walk-forward validated) |
| **Holdout AUC** | ~0.52 – 0.55 (vs. Random 0.50) |
| **Win Rate (Backtest)** | ~48% (Before transaction fees/slippage) |
| **Inference Latency** | ~1.2 ms |

**Why include a 0.55 AUC model?**
Because building a safe, honest ML pipeline is more valuable than faking a 99% accuracy. The value is in the **architecture**: robust data ingestion, reproducible walk-forward validation, and a risk engine that prevents the model from blowing up your account when it's wrong.

---

##  Architecture & Tech Stack

- **Frontend:** Next.js 14, React, Tailwind CSS, Recharts (for backtest visualization).
- **Backend:** Next.js API Routes, Python ML Pipeline, Supabase (PostgreSQL + Auth).
- **ML / Data:** Scikit-learn, Yahoo Finance API.
- **Security:** Row Level Security (RLS) on Supabase, Server-side API key management, Idempotency handling.

---

##  Setup & Installation

### 1. Clone & Install
```bash
git clone https://github.com/Tamanna030507/aivolt.git
cd aivolt
npm install
