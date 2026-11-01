function evaluate(intent, snapshot, profile) {
  const reasons = []
  if (profile.killSwitch) return { allowed: false, reasons: ['kill'] }
  if (!intent.isPaper && profile.paperOnly) return { allowed: false, reasons: ['live off'] }
  const notional = intent.quantity * intent.price
  if (notional > profile.maxOrderNotional) reasons.push('order limit')
  if (intent.side === 'BUY' && snapshot.cash < notional) reasons.push('cash')
  return { allowed: reasons.length === 0, reasons }
}

const profile = { maxOrderNotional: 100000, paperOnly: true, killSwitch: false }
let r = evaluate({ symbol: 'X', side: 'BUY', quantity: 10, price: 1000, isPaper: true }, { cash: 5000 }, profile)
if (r.allowed) { console.error('should block cash'); process.exit(1) }
r = evaluate({ symbol: 'X', side: 'BUY', quantity: 10, price: 1000, isPaper: true }, { cash: 20000 }, profile)
if (!r.allowed) { console.error('should allow'); process.exit(1) }
r = evaluate({ symbol: 'X', side: 'BUY', quantity: 10, price: 1000, isPaper: false }, { cash: 20000 }, profile)
if (r.allowed) { console.error('should block live'); process.exit(1) }
console.log('risk_ok')
