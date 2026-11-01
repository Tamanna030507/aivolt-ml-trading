'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import {
  Bot, TrendingUp, Shield, Zap, ChevronRight,
  BarChart2, Clock, Lock, Star, ArrowRight
} from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()
  const { user, setUser, setOnboardingComplete, onboardingComplete } = useAppStore()
  const [showLogin, setShowLogin] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      router.push(onboardingComplete ? '/dashboard' : '/onboarding')
    }
  }, [user, onboardingComplete, router])

  async function handleAuth() {
    if (!email || !password) return
    setLoading(true)
    setError('')

    try {
      if (!isSupabaseConfigured) {
        setError('Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local then restart npm run dev')
        setLoading(false)
        return
      }
      if (isSignup) {
        if (!name) { setError('Name required'); setLoading(false); return }
        const { data, error: signupError } = await supabase.auth.signUp({ email, password })
        if (signupError) throw signupError

        if (data.user) {
          await supabase.from('users').insert({
            id: data.user.id,
            email,
            name,
            risk_profile: 'balanced',
            capital_allocation: 50,
            ai_mode: 'quant',
            autopilot_enabled: false,
            markets_enabled: ['NSE', 'BSE'],
            daily_loss_limit: 5000,
            max_position_size: 20,
            virtual_balance: 1000000,
          })

          setUser({
            id: data.user.id, email, name,
            riskProfile: 'balanced', capitalAllocation: 50,
            aiMode: 'quant', autopilotEnabled: false,
            marketsEnabled: ['NSE', 'BSE'], dailyLossLimit: 5000,
            maxPositionSize: 20, virtualBalance: 1000000,
          })
          router.push('/onboarding')
        }
      } else {
        const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password })
        if (loginError) throw loginError

        if (data.user) {
          const { data: userData } = await supabase
            .from('users').select('*').eq('id', data.user.id).single()

          if (userData) {
            setUser({
              id: userData.id, email: userData.email, name: userData.name,
              riskProfile: userData.risk_profile, capitalAllocation: userData.capital_allocation,
              aiMode: userData.ai_mode, autopilotEnabled: userData.autopilot_enabled,
              marketsEnabled: userData.markets_enabled, dailyLossLimit: userData.daily_loss_limit,
              maxPositionSize: userData.max_position_size, virtualBalance: userData.virtual_balance,
              dhanClientId: userData.dhan_client_id, dhanAccessToken: userData.dhan_access_token,
            })
            setOnboardingComplete(true)
            router.push('/dashboard')
          }
        }
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-bg-primary grid-bg overflow-hidden">
      {}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-bg-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-blue to-accent-green flex items-center justify-center">
            <Bot size={16} className="text-white" />
          </div>
          <span className="text-lg font-bold font-display tracking-widest text-text-primary">AIVOLT</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setIsSignup(false); setShowLogin(true) }}
            className="text-text-secondary hover:text-text-primary text-sm transition-colors"
          >
            Log In
          </button>
          <button
            onClick={() => { setIsSignup(true); setShowLogin(true) }}
            className="bg-accent-blue text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors font-medium"
          >
            Get Started
          </button>
        </div>
      </nav>

      {}
      <div className="max-w-6xl mx-auto px-8 pt-20 pb-16">
        <div className="flex flex-col items-center text-center mb-16">
          {}
          <div className="flex items-center gap-2 ai-badge mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
            <span>Live market data · Research mode</span>
          </div>

          {}
          <h1 className="text-5xl md:text-7xl font-display font-bold text-text-primary mb-6 leading-tight">
            Market research.<br />
            <span className="bg-gradient-to-r from-accent-blue to-accent-green bg-clip-text text-transparent">
              Clear signals.
            </span><br />
            Your control.
          </h1>

          <p className="text-xl text-text-secondary max-w-2xl mb-10 leading-relaxed">
            Charts, signals, and paper trading on real market data.
            and protects your capital — without you lifting a finger.
          </p>

          <div className="flex items-center gap-4">
            <button
              onClick={() => { setIsSignup(true); setShowLogin(true) }}
              className="flex items-center gap-2 bg-gradient-to-r from-accent-blue to-accent-green text-white font-semibold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity text-lg ai-glow"
            >
              Start with ₹10L Virtual <ArrowRight size={20} />
            </button>
            <button
              onClick={() => { setIsSignup(false); setShowLogin(true) }}
              className="flex items-center gap-2 border border-bg-border text-text-secondary hover:text-text-primary px-8 py-4 rounded-xl transition-colors text-lg"
            >
              Log In
            </button>
          </div>

          <p className="text-text-muted text-sm mt-4 font-mono">
            Paper trade with real prices first. Connect a broker only when you choose.
          </p>
        </div>

        {}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {[
            {
              icon: Bot,
              title: 'Autonomous Trading',
              desc: 'AI analyzes charts, news, and market data in real-time. Places, manages, and exits trades automatically ',
              color: 'text-accent-blue',
              glow: 'ai-glow',
            },
            {
              icon: BarChart2,
              title: 'Paper Trading Simulator',
              desc: 'Practice with virtual cash on live market prices before using real money.',
              color: 'text-accent-green',
              glow: 'green-glow',
            },
            {
              icon: Shield,
              title: 'AI Risk Protection',
              desc: 'Risk limits, kill switch, and paper mode by default.',
              color: 'text-accent-red',
              glow: 'red-glow',
            },
          ].map(({ icon: Icon, title, desc, color, glow }) => (
            <div key={title} className={`panel p-6 ${glow} hover:scale-[1.02] transition-transform`}>
              <Icon size={28} className={`${color} mb-4`} />
              <h3 className="text-text-primary font-semibold text-lg mb-2 font-display">{title}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-display font-bold text-text-primary mb-2">How AIVOLT Works</h2>
          <p className="text-text-secondary mb-10">Three steps to get started</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Connect & Configure', desc: 'Sign up, set your risk profile, and connect your Dhan account. Takes 5 minutes.' },
              { step: '02', title: 'Review signals', desc: 'Review charts and model signals on NSE names you care about.' },
              { step: '03', title: 'Track activity', desc: 'Monitor paper or live activity. Nothing is guaranteed profit.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex flex-col items-center">
                <div className="text-4xl font-mono font-bold text-accent-blue/30 mb-3">{step}</div>
                <h3 className="text-text-primary font-semibold mb-2">{title}</h3>
                <p className="text-text-secondary text-sm text-center">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {}
        <div className="flex flex-wrap items-center justify-center gap-8 text-text-muted text-sm font-mono border border-bg-border rounded-xl p-6">
          {[
            { icon: Lock, text: 'Bank-Grade Encryption' },
            { icon: Shield, text: 'SEBI Compliant Framework' },
            { icon: Clock, text: 'Full Audit Trail' },
            { icon: Star, text: 'Real-Time Risk Monitoring' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2">
              <Icon size={14} className="text-accent-green" />
              {text}
            </div>
          ))}
        </div>
      </div>

      {}
      {showLogin && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-bg-border rounded-2xl p-8 w-full max-w-md ai-glow">
            <div className="flex items-center gap-2 mb-6">
              <Bot size={20} className="text-accent-blue" />
              <h2 className="text-xl font-display font-bold text-text-primary">
                {isSignup ? 'Create Account' : 'Welcome Back'}
              </h2>
            </div>

            <div className="space-y-4">
              {isSignup && (
                <div>
                  <label className="text-xs font-mono text-text-secondary mb-1 block">FULL NAME</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-bg-secondary border border-bg-border rounded-lg px-4 py-3 text-text-primary text-sm outline-none focus:border-accent-blue transition-colors"
                    placeholder="Your name"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-mono text-text-secondary mb-1 block">EMAIL</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-bg-secondary border border-bg-border rounded-lg px-4 py-3 text-text-primary text-sm outline-none focus:border-accent-blue transition-colors"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-text-secondary mb-1 block">PASSWORD</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAuth()}
                  className="w-full bg-bg-secondary border border-bg-border rounded-lg px-4 py-3 text-text-primary text-sm outline-none focus:border-accent-blue transition-colors"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="text-accent-red text-xs font-mono bg-accent-red/10 border border-accent-red/30 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <button
                onClick={handleAuth}
                disabled={loading}
                className="w-full bg-gradient-to-r from-accent-blue to-accent-green text-white font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Please wait...' : isSignup ? 'Create Account' : 'Log In'}
              </button>

              <p className="text-center text-text-muted text-sm">
                {isSignup ? 'Already have an account?' : "Don't have an account?"}
                {' '}
                <button
                  onClick={() => { setIsSignup(!isSignup); setError('') }}
                  className="text-accent-blue hover:underline"
                >
                  {isSignup ? 'Log In' : 'Sign Up Free'}
                </button>
              </p>
            </div>

            <button
              onClick={() => setShowLogin(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
