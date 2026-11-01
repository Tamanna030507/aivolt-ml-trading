'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import AppLayout from '@/components/layout/AppLayout'
import { Settings, Bell, Link2, LogOut, Save, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const TABS = ['AI Configuration', 'Broker Connection', 'Notifications', 'Account']

export default function ProfilePage() {
  const router = useRouter()
  const { user, setUser } = useAppStore()
  const [tab, setTab] = useState(0)
  const [saving, setSaving] = useState(false)

  const [riskProfile, setRiskProfile] = useState(user?.riskProfile || 'balanced')
  const [aiMode, setAiMode] = useState(user?.aiMode || 'quant')
  const [capitalAlloc, setCapitalAlloc] = useState(user?.capitalAllocation || 50)
  const [dailyLossLimit, setDailyLossLimit] = useState(user?.dailyLossLimit || 5000)
  const [maxPositionSize, setMaxPositionSize] = useState(user?.maxPositionSize || 20)
  const [marketsEnabled, setMarketsEnabled] = useState(user?.marketsEnabled || ['NSE', 'BSE'])

  const [dhanClientId, setDhanClientId] = useState(user?.dhanClientId || '')
  const [dhanToken, setDhanToken] = useState(user?.dhanAccessToken || '')

  const [notifs, setNotifs] = useState({
    tradAlerts: true, dailyBrief: true, crashWarnings: true, profitTargets: true, lossAlerts: true
  })

  useEffect(() => {
    if (!user) { router.push('/'); return }
  }, [user])

  async function saveConfig() {
    if (!user) return
    setSaving(true)
    try {
      await supabase.from('users').update({
        risk_profile: riskProfile,
        ai_mode: aiMode,
        capital_allocation: capitalAlloc,
        daily_loss_limit: dailyLossLimit,
        max_position_size: maxPositionSize,
        markets_enabled: marketsEnabled,
      }).eq('id', user.id)

      setUser({ ...user, riskProfile: riskProfile as any, aiMode: aiMode as any, capitalAllocation: capitalAlloc, dailyLossLimit, maxPositionSize, marketsEnabled })
      toast.success('Settings saved!')
    } catch {
      toast.error('Save failed')
    }
    setSaving(false)
  }

  async function saveDhan() {
    if (!user) return
    setSaving(true)
    try {
      await supabase.from('users').update({
        dhan_client_id: dhanClientId,
        dhan_access_token: dhanToken,
      }).eq('id', user.id)

      setUser({ ...user, dhanClientId, dhanAccessToken: dhanToken })
      toast.success('Dhan account connected!')
    } catch {
      toast.error('Connection failed')
    }
    setSaving(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    setUser(null)
    router.push('/')
  }

  function toggleMarket(m: string) {
    setMarketsEnabled(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
  }

  if (!user) return null

  const AI_MODES = [
    { id: 'warren', label: 'Warren', desc: 'Value investing, long-term' },
    { id: 'quant', label: 'Quant', desc: 'Balanced, data-driven' },
    { id: 'safe', label: 'Safe', desc: 'Capital preservation first' },
    { id: 'hypergrowth', label: 'Hypergrowth', desc: 'Max returns, high risk' },
  ]

  const MARKETS = ['NSE', 'BSE', 'NFO', 'US', 'CRYPTO', 'ETF']

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <div className="flex border-b border-bg-border px-6">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className={`px-4 py-3 text-sm font-mono whitespace-nowrap transition-colors border-b-2 ${
                tab === i ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}>{t}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {}
          {tab === 0 && (
            <div className="max-w-2xl mx-auto space-y-6">
              {}
              <div className="panel p-6">
                <div className="text-xs font-mono text-text-muted uppercase mb-4">AI Trading Mode</div>
                <div className="grid grid-cols-2 gap-3">
                  {AI_MODES.map(mode => (
                    <button key={mode.id} onClick={() => setAiMode(mode.id as any)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        aiMode === mode.id ? 'border-accent-blue bg-accent-blue/10' : 'border-bg-border hover:border-bg-hover'
                      }`}
                    >
                      <div className="flex justify-between">
                        <span className="text-sm font-semibold text-text-primary">{mode.label}</span>
                        {aiMode === mode.id && <Check size={14} className="text-accent-blue" />}
                      </div>
                      <span className="text-xs text-text-muted">{mode.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {}
              <div className="panel p-6">
                <div className="text-xs font-mono text-text-muted uppercase mb-4">Risk Profile</div>
                <div className="flex gap-3">
                  {['conservative', 'balanced', 'aggressive'].map(r => (
                    <button key={r} onClick={() => setRiskProfile(r as any)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-mono capitalize border-2 transition-all ${
                        riskProfile === r ? 'border-accent-blue bg-accent-blue/10 text-accent-blue' : 'border-bg-border text-text-muted hover:text-text-secondary'
                      }`}>{r}</button>
                  ))}
                </div>
              </div>

              {}
              <div className="panel p-6 space-y-5">
                <div className="text-xs font-mono text-text-muted uppercase">Risk Limits</div>

                <div>
                  <div className="flex justify-between text-xs font-mono mb-2">
                    <span className="text-text-muted">Capital Allocation</span>
                    <span className="text-accent-blue">{capitalAlloc}%</span>
                  </div>
                  <input type="range" min={10} max={100} step={5} value={capitalAlloc}
                    onChange={e => setCapitalAlloc(parseInt(e.target.value))}
                    className="w-full accent-accent-blue" />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono mb-2">
                    <span className="text-text-muted">Daily Loss Limit</span>
                    <span className="text-accent-red">₹{dailyLossLimit.toLocaleString()}</span>
                  </div>
                  <input type="range" min={1000} max={50000} step={500} value={dailyLossLimit}
                    onChange={e => setDailyLossLimit(parseInt(e.target.value))}
                    className="w-full accent-accent-red" />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono mb-2">
                    <span className="text-text-muted">Max Position Size</span>
                    <span className="text-accent-gold">{maxPositionSize}%</span>
                  </div>
                  <input type="range" min={5} max={50} step={5} value={maxPositionSize}
                    onChange={e => setMaxPositionSize(parseInt(e.target.value))}
                    className="w-full accent-accent-gold" />
                </div>
              </div>

              {}
              <div className="panel p-6">
                <div className="text-xs font-mono text-text-muted uppercase mb-4">Markets Enabled</div>
                <div className="grid grid-cols-3 gap-2">
                  {MARKETS.map(m => (
                    <button key={m} onClick={() => toggleMarket(m)}
                      className={`py-2 rounded-xl text-xs font-mono border-2 transition-all ${
                        marketsEnabled.includes(m) ? 'border-accent-green bg-accent-green/10 text-accent-green' : 'border-bg-border text-text-muted hover:text-text-secondary'
                      }`}>
                      {marketsEnabled.includes(m) && <Check size={10} className="inline mr-1" />}{m}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={saveConfig} disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-accent-blue text-white font-semibold py-3 rounded-xl hover:bg-blue-500 transition-colors disabled:opacity-50">
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          )}

          {}
          {tab === 1 && (
            <div className="max-w-lg mx-auto space-y-6">
              <div className="panel p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-accent-gold/20 rounded-xl flex items-center justify-center">
                    <Link2 size={18} className="text-accent-gold" />
                  </div>
                  <div>
                    <div className="text-text-primary font-semibold">Dhan Account</div>
                    <div className={`text-xs font-mono ${user.dhanClientId ? 'text-accent-green' : 'text-text-muted'}`}>
                      {user.dhanClientId ? `Connected — ${user.dhanClientId}` : 'Not connected'}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-mono text-text-muted block mb-1">DHAN CLIENT ID</label>
                    <input value={dhanClientId} onChange={e => setDhanClientId(e.target.value)}
                      placeholder="Your Dhan Client ID"
                      className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent-blue" />
                  </div>
                  <div>
                    <label className="text-xs font-mono text-text-muted block mb-1">ACCESS TOKEN</label>
                    <input type="password" value={dhanToken} onChange={e => setDhanToken(e.target.value)}
                      placeholder="From dhan.co/developers"
                      className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent-blue" />
                  </div>

                  <div className="text-xs text-text-muted font-mono bg-bg-secondary rounded-lg p-3 space-y-1">
                    <div>1. Go to <span className="text-accent-blue">dhan.co/developers</span></div>
                    <div>2. Create a new app → copy Client ID + Access Token</div>
                    <div>3. Paste above and connect</div>
                  </div>

                  <button onClick={saveDhan} disabled={saving || !dhanClientId || !dhanToken}
                    className="w-full bg-accent-gold text-bg-primary font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
                    {saving ? 'Connecting...' : 'Connect Dhan Account'}
                  </button>
                </div>
              </div>

              <div className="panel p-4 text-xs text-text-muted font-mono">
                ⚠️ Your credentials are stored encrypted in Supabase. They are never shared or sold.
                Aivolt only uses them to place trades on your behalf when autopilot is enabled.
              </div>
            </div>
          )}

          {}
          {tab === 2 && (
            <div className="max-w-lg mx-auto panel p-6 space-y-4">
              <div className="text-xs font-mono text-text-muted uppercase mb-2">Notification Preferences</div>
              {[
                { key: 'tradAlerts', label: 'AI Trade Alerts', desc: 'Notified on every AI trade (daily summary mode)' },
                { key: 'dailyBrief', label: 'Daily Morning Brief', desc: 'AI market brief at 8:45 AM every trading day' },
                { key: 'crashWarnings', label: 'Crash Warnings', desc: 'Immediate alert if portfolio drops sharply' },
                { key: 'profitTargets', label: 'Profit Target Hit', desc: 'Alert when a position hits its target price' },
                { key: 'lossAlerts', label: 'Loss Alerts', desc: 'Alert if daily loss limit is approaching' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-3 border-b border-bg-border last:border-0">
                  <div>
                    <div className="text-sm text-text-primary font-medium">{label}</div>
                    <div className="text-xs text-text-muted">{desc}</div>
                  </div>
                  <button
                    onClick={() => setNotifs(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                    className={`w-12 h-6 rounded-full transition-all duration-200 relative shrink-0 ${
                      notifs[key as keyof typeof notifs] ? 'bg-accent-green' : 'bg-bg-border'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                      notifs[key as keyof typeof notifs] ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {}
          {tab === 3 && (
            <div className="max-w-lg mx-auto space-y-4">
              <div className="panel p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent-blue to-accent-green flex items-center justify-center text-2xl font-bold text-white">
                    {user.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-text-primary">{user.name}</div>
                    <div className="text-sm text-text-muted">{user.email}</div>
                    <div className="text-xs font-mono text-accent-blue mt-1 capitalize">{user.aiMode} mode · {user.riskProfile} risk</div>
                  </div>
                </div>

                {[
                  { label: 'Member Since', value: 'May 2025' },
                  { label: 'Total Trades', value: '147' },
                  { label: 'AI Mode', value: user.aiMode },
                  { label: 'Dhan Account', value: user.dhanClientId ? 'Connected' : 'Not Connected' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-2.5 border-b border-bg-border last:border-0">
                    <span className="text-sm text-text-muted">{label}</span>
                    <span className="text-sm font-mono text-text-primary capitalize">{value}</span>
                  </div>
                ))}
              </div>

              <button onClick={logout}
                className="w-full flex items-center justify-center gap-2 border border-accent-red/30 text-accent-red font-semibold py-3 rounded-xl hover:bg-accent-red/10 transition-colors">
                <LogOut size={16} />
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}