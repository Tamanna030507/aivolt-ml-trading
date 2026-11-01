import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  email: string
  name: string
  riskProfile: 'conservative' | 'balanced' | 'aggressive'
  capitalAllocation: number
  aiMode: 'warren' | 'quant' | 'safe' | 'hypergrowth'
  autopilotEnabled: boolean
  marketsEnabled: string[]
  dailyLossLimit: number
  maxPositionSize: number
  dhanClientId?: string
  dhanAccessToken?: string
  virtualBalance: number
}

export interface Holding {
  id: string
  symbol: string
  exchange: string
  quantity: number
  avgBuyPrice: number
  currentPrice: number
  pnl: number
  pnlPercent: number
  aiConfidence: 'low' | 'medium' | 'high'
  tradeType: string
}

export interface AIActivity {
  id: string
  action: string
  symbol: string | null
  reasoning: string
  confidence: number
  createdAt: string
}

interface AppState {
  user: User | null
  setUser: (user: User | null) => void

  isPaperMode: boolean
  setIsPaperMode: (v: boolean) => void

  holdings: Holding[]
  setHoldings: (holdings: Holding[]) => void

  portfolioValue: number
  todayPnL: number
  todayPnLPercent: number
  setPortfolioData: (value: number, pnl: number, pnlPercent: number) => void

  aiActivities: AIActivity[]
  addAIActivity: (activity: AIActivity) => void

  aiStatus: 'Active' | 'Hibernating' | 'Paused'
  setAIStatus: (status: 'Active' | 'Hibernating' | 'Paused') => void
  lastAIAction: string
  setLastAIAction: (action: string) => void

  autopilotEnabled: boolean
  setAutopilotEnabled: (v: boolean) => void

  selectedSymbol: string
  setSelectedSymbol: (symbol: string) => void

  panicMode: boolean
  setPanicMode: (v: boolean) => void

  unreadNotifications: number
  setUnreadNotifications: (n: number) => void

  onboardingComplete: boolean
  setOnboardingComplete: (v: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),

      isPaperMode: true,
      setIsPaperMode: (v) => set({ isPaperMode: v }),

      holdings: [],
      setHoldings: (holdings) => set({ holdings }),

      portfolioValue: 0,
      todayPnL: 0,
      todayPnLPercent: 0,
      setPortfolioData: (value, pnl, pnlPercent) =>
        set({ portfolioValue: value, todayPnL: pnl, todayPnLPercent: pnlPercent }),

      aiActivities: [],
      addAIActivity: (activity) =>
        set((state) => ({
          aiActivities: [activity, ...state.aiActivities].slice(0, 50),
        })),

      aiStatus: 'Active',
      setAIStatus: (status) => set({ aiStatus: status }),
      lastAIAction: 'Analyzing markets...',
      setLastAIAction: (action) => set({ lastAIAction: action }),

      autopilotEnabled: false,
      setAutopilotEnabled: (v) => set({ autopilotEnabled: v }),

      selectedSymbol: 'RELIANCE.NS',
      setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),

      panicMode: false,
      setPanicMode: (v) => set({ panicMode: v }),

      unreadNotifications: 0,
      setUnreadNotifications: (n) => set({ unreadNotifications: n }),

      onboardingComplete: false,
      setOnboardingComplete: (v) => set({ onboardingComplete: v }),
    }),
    {
      name: 'aivolt-storage',
      partialize: (state) => ({
        user: state.user,
        isPaperMode: state.isPaperMode,
        onboardingComplete: state.onboardingComplete,
        autopilotEnabled: state.autopilotEnabled,
      }),
    }
  )
)