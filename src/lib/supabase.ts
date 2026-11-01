import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  supabaseUrl.startsWith('http')

function createSafeClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    return createClient('https://placeholder.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder', {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return createClient(supabaseUrl, supabaseAnonKey)
}

export const supabase = createSafeClient()

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          dhan_client_id: string | null
          dhan_access_token: string | null
          risk_profile: 'conservative' | 'balanced' | 'aggressive'
          capital_allocation: number
          ai_mode: 'warren' | 'quant' | 'safe' | 'hypergrowth'
          autopilot_enabled: boolean
          markets_enabled: string[]
          daily_loss_limit: number
          max_position_size: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      trades: {
        Row: {
          id: string
          user_id: string
          symbol: string
          exchange: string
          trade_type: 'intraday' | 'swing' | 'options' | 'delivery'
          order_type: 'BUY' | 'SELL'
          quantity: number
          price: number
          target_price: number | null
          stop_loss: number | null
          ai_confidence: number
          ai_reasoning: string
          status: 'OPEN' | 'CLOSED' | 'CANCELLED'
          pnl: number | null
          is_paper: boolean
          dhan_order_id: string | null
          executed_at: string
          closed_at: string | null
          created_at: string
        }
      }
      portfolio: {
        Row: {
          id: string
          user_id: string
          symbol: string
          exchange: string
          quantity: number
          avg_buy_price: number
          current_price: number
          pnl: number
          pnl_percent: number
          ai_confidence: 'low' | 'medium' | 'high'
          trade_type: string
          updated_at: string
        }
      }
      pnl_history: {
        Row: {
          id: string
          user_id: string
          date: string
          realized_pnl: number
          unrealized_pnl: number
          total_trades: number
          winning_trades: number
          is_paper: boolean
        }
      }
      watchlist: {
        Row: {
          id: string
          user_id: string
          symbol: string
          exchange: string
          added_at: string
        }
      }
      ai_activity: {
        Row: {
          id: string
          user_id: string
          action: string
          symbol: string | null
          reasoning: string
          confidence: number
          created_at: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          is_read: boolean
          created_at: string
        }
      }
    }
  }
}
