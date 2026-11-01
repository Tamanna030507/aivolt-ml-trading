-- AIVOLT DATABASE SCHEMA
-- Run this entire file in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  dhan_client_id TEXT,
  dhan_access_token TEXT,
  risk_profile TEXT DEFAULT 'balanced' CHECK (risk_profile IN ('conservative', 'balanced', 'aggressive')),
  capital_allocation INTEGER DEFAULT 50,
  ai_mode TEXT DEFAULT 'quant' CHECK (ai_mode IN ('warren', 'quant', 'safe', 'hypergrowth')),
  autopilot_enabled BOOLEAN DEFAULT false,
  markets_enabled TEXT[] DEFAULT ARRAY['NSE', 'BSE'],
  daily_loss_limit DECIMAL DEFAULT 5000,
  max_position_size INTEGER DEFAULT 20,
  virtual_balance DECIMAL DEFAULT 1000000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trades table
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL DEFAULT 'NSE',
  trade_type TEXT DEFAULT 'intraday' CHECK (trade_type IN ('intraday', 'swing', 'options', 'delivery')),
  order_type TEXT NOT NULL CHECK (order_type IN ('BUY', 'SELL')),
  quantity INTEGER NOT NULL,
  price DECIMAL NOT NULL,
  target_price DECIMAL,
  stop_loss DECIMAL,
  ai_confidence INTEGER DEFAULT 70,
  ai_reasoning TEXT DEFAULT '',
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'CANCELLED', 'PENDING')),
  pnl DECIMAL,
  is_paper BOOLEAN DEFAULT false,
  dhan_order_id TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio holdings
CREATE TABLE IF NOT EXISTS public.portfolio (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL DEFAULT 'NSE',
  quantity INTEGER NOT NULL DEFAULT 0,
  avg_buy_price DECIMAL NOT NULL,
  current_price DECIMAL NOT NULL,
  pnl DECIMAL DEFAULT 0,
  pnl_percent DECIMAL DEFAULT 0,
  ai_confidence TEXT DEFAULT 'medium' CHECK (ai_confidence IN ('low', 'medium', 'high')),
  trade_type TEXT DEFAULT 'delivery',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

-- Daily PnL history
CREATE TABLE IF NOT EXISTS public.pnl_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  realized_pnl DECIMAL DEFAULT 0,
  unrealized_pnl DECIMAL DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  is_paper BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date, is_paper)
);

-- Watchlist
CREATE TABLE IF NOT EXISTS public.watchlist (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL DEFAULT 'NSE',
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

-- AI Activity Feed
CREATE TABLE IF NOT EXISTS public.ai_activity (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  symbol TEXT,
  reasoning TEXT DEFAULT '',
  confidence INTEGER DEFAULT 70,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Morning Briefs
CREATE TABLE IF NOT EXISTS public.morning_briefs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  us_market_summary TEXT,
  key_events TEXT,
  ai_stance TEXT,
  top_stocks TEXT[],
  risk_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pnl_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only see their own data)
CREATE POLICY "Users can view own data" ON public.users FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage own trades" ON public.trades FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own portfolio" ON public.portfolio FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own pnl" ON public.pnl_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own watchlist" ON public.watchlist FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own ai activity" ON public.ai_activity FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view morning briefs" ON public.morning_briefs FOR SELECT USING (true);

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER portfolio_updated_at BEFORE UPDATE ON public.portfolio FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS public.system_status (
  id INT PRIMARY KEY DEFAULT 1,
  halted BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID
);

INSERT INTO public.system_status (id, halted) VALUES (1, false) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.paper_accounts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cash NUMERIC NOT NULL DEFAULT 1000000,
  realized_pnl NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.paper_positions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  avg_cost NUMERIC NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

CREATE TABLE IF NOT EXISTS public.paper_ledger (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL,
  symbol TEXT,
  qty NUMERIC,
  price NUMERIC,
  amount NUMERIC NOT NULL,
  cash_after NUMERIC NOT NULL,
  note TEXT,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS paper_ledger_idempotency ON public.paper_ledger(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  detail TEXT DEFAULT '',
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_idempotency (
  user_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL,
  response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, idempotency_key)
);

ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS broker_status TEXT DEFAULT 'OPEN';
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS fill_qty NUMERIC;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS fill_price NUMERIC;

CREATE UNIQUE INDEX IF NOT EXISTS trades_idempotency ON public.trades(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.system_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "system_status_read" ON public.system_status FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "paper_accounts_own" ON public.paper_accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "paper_positions_own" ON public.paper_positions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "paper_ledger_own" ON public.paper_ledger FOR ALL USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "audit_own" ON public.audit_log FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
