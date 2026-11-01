'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { Shield, TrendingUp, Zap, ChevronRight, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const steps = ['Risk Profile', 'Capital Allocation', 'Market Access']

const riskProfiles = [
  {
    id: 'conservative',
    label: 'Conservative',
    icon: Shield,
    color: 'text-accent-green',
    border: 'border-accent-green',
    bg: 'bg-accent-green/10',
    desc: 'Slow and steady. AI prioritizes capital protection over high returns. Max 15% drawdown allowed.',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    icon: TrendingUp,
    color: 'text-accent-blue',
    border: 'border-accent-blue',
    bg: 'bg-accent-blue/10',
    desc: 'Best of both worlds. AI balances growth with risk management. The recommended setting for most users.',
  },
  {
    id: 'aggressive',
    label: 'Aggressive',
    icon: Zap,
    color: 'text-accent-red',
    border: 'border-accent-red',
    bg: 'bg-accent-red/10',
    desc: 'Max returns. AI takes higher-risk, higher-reward positions. Only for experienced investors.',
  },
]

const markets = [
  { id: 'NSE', label: 'NSE Stocks', desc: 'National Stock Exchange equities' },
  { id: 'BSE', label: 'BSE Stocks', desc: 'Bombay Stock Exchange equities' },
  { id: 'NFO', label: 'F&O', desc: 'Futures & Options (high risk)' },
  { id: 'US', label: 'US Stocks', desc: 'NYSE & NASDAQ (via ADRs)' },
  { id: 'CRYPTO', label: 'Crypto', desc: 'Bitcoin, Ethereum (Indian exchanges)' },
  { id: 'ETF', label: 'Gold ETFs', desc: 'Gold exchange-traded funds' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { user, setUser, setOnboardingComplete } = useAppStore()
  const [step, setStep] = useState(0)
  const [riskProfile, setRiskProfile] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced')
  const [capitalAlloc, setCapitalAlloc] = useState(50)
  const [enabledMarkets, setEnabledMarkets] = useState(['NSE', 'BSE'])
  const [loading, setLoading] = useState(false)

  function toggleMarket(id: string) {
    setEnabledMarkets(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  async function finish() {
    if (!user) return
    setLoading(true)

    await supabase.from('users').update({
      risk_profile: riskProfile,
      capital_allocation: capitalAlloc,
      markets_enabled: enabledMarkets,
    }).eq('id', user.id)

    setUser({ ...user, riskProfile, capitalAllocation: capitalAlloc, marketsEnabled: enabledMarkets })
    setOnboardingComplete(true)
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-bg-primary grid-bg flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {}
        <div className="text-center mb-10">
          <div className="text-xs font-mono text-text-muted mb-2">AIVOLT SETUP</div>
          <h1 className="text-3xl font-display font-bold text-text-primary mb-2">Configure Your AI</h1>
          <p className="text-text-secondary">3 quick settings and the AI takes over.</p>
        </div>

        {}
        <div className="flex items-center justify-center gap-4 mb-10">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                i < step ? 'bg-accent-green text-white' :
                i === step ? 'bg-accent-blue text-white' :
                'bg-bg-card border border-bg-border text-text-muted'
              }`}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <span className={`text-sm hidden md:block ${i === step ? 'text-text-primary' : 'text-text-muted'}`}>{s}</span>
              {i < steps.length - 1 && <div className="w-8 h-px bg-bg-border hidden md:block" />}
            </div>
          ))}
        </div>

        {}
        <div className="panel p-8 mb-6">
          {step === 0 && (
            <div>
              <h2 className="text-xl font-display font-semibold text-text-primary mb-2">Risk Profile</h2>
              <p className="text-text-secondary text-sm mb-6">How much risk is the AI allowed to take with your money?</p>
              <div className="grid gap-4">
                {riskProfiles.map(({ id, label, icon: Icon, color, border, bg, desc }) => (
                  <button
                    key={id}
                    onClick={() => setRiskProfile(id as any)}
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                      riskProfile === id ? `${border} ${bg}` : 'border-bg-border hover:border-bg-hover'
                    }`}
                  >
                    <Icon size={22} className={color} />
                    <div>
                      <div className="text-text-primary font-semibold mb-1">{label}</div>
                      <div className="text-text-secondary text-sm">{desc}</div>
                    </div>
                    {riskProfile === id && <Check size={18} className={`ml-auto ${color} shrink-0`} />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-xl font-display font-semibold text-text-primary mb-2">Capital Allocation</h2>
              <p className="text-text-secondary text-sm mb-8">
                What percentage of your Dhan wallet can the AI use for trading?
              </p>
              <div className="text-center mb-6">
                <span className="text-6xl font-mono font-bold text-accent-blue">{capitalAlloc}%</span>
                <p className="text-text-muted text-sm mt-2 font-mono">of your available funds</p>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={capitalAlloc}
                onChange={e => setCapitalAlloc(parseInt(e.target.value))}
                className="w-full accent-accent-blue"
              />
              <div className="flex justify-between text-xs font-mono text-text-muted mt-2">
                <span>10% (Safe)</span>
                <span>50% (Recommended)</span>
                <span>100% (All-in)</span>
              </div>
              <div className="mt-6 p-4 bg-accent-blue/5 border border-accent-blue/20 rounded-lg text-sm text-text-secondary">
                <strong className="text-text-primary">Default: 50%</strong> — The AI will never use more than this.
                The rest stays in your Dhan wallet as a safety buffer.
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-display font-semibold text-text-primary mb-2">Market Access</h2>
              <p className="text-text-secondary text-sm mb-6">Which markets can the AI trade in?</p>
              <div className="grid grid-cols-2 gap-3">
                {markets.map(({ id, label, desc }) => {
                  const isEnabled = enabledMarkets.includes(id)
                  return (
                    <button
                      key={id}
                      onClick={() => toggleMarket(id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        isEnabled ? 'border-accent-green bg-accent-green/10' : 'border-bg-border hover:border-bg-hover'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-text-primary font-semibold text-sm">{label}</span>
                        {isEnabled && <Check size={14} className="text-accent-green" />}
                      </div>
                      <span className="text-text-muted text-xs">{desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {}
        <div className="flex gap-4">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 py-3 border border-bg-border text-text-secondary hover:text-text-primary rounded-xl transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={() => step < 2 ? setStep(s => s + 1) : finish()}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-accent-blue to-accent-green text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {step < 2 ? 'Continue' : loading ? 'Setting up...' : 'Launch Dashboard'}
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
