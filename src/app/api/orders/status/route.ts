import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getServiceSupabase } from '@/lib/auth'
import { getDhanCredentials } from '@/lib/risk'
import { writeAuditLog } from '@/lib/system'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const orderId = new URL(req.url).searchParams.get('orderId')
  const tradeId = new URL(req.url).searchParams.get('tradeId')
  if (!orderId && !tradeId) {
    return NextResponse.json({ error: 'orderId or tradeId required' }, { status: 400 })
  }

  const sb = getServiceSupabase()
  let dhanOrderId = orderId
  let trade: any = null
  if (sb && tradeId) {
    const { data } = await sb.from('trades').select('*').eq('id', tradeId).eq('user_id', auth.userId).maybeSingle()
    trade = data
    if (data?.dhan_order_id) dhanOrderId = data.dhan_order_id
  }

  const creds = getDhanCredentials()
  if (!creds || !dhanOrderId) {
    return NextResponse.json({
      trade,
      broker: null,
      message: !creds ? 'Dhan not configured' : 'No dhan order id',
    })
  }

  try {
    const res = await fetch(`https://api.dhan.co/orders/${dhanOrderId}`, {
      headers: {
        'access-token': creds.accessToken,
        'client-id': creds.clientId,
        Accept: 'application/json',
      },
    })
    const text = await res.text()
    let data: any = null
    try {
      data = JSON.parse(text)
    } catch {
      data = { raw: text }
    }
    if (!res.ok) {
      return NextResponse.json({ error: 'Dhan status failed', detail: text.slice(0, 400) }, { status: 502 })
    }

    const status = (data?.orderStatus || data?.status || data?.data?.orderStatus || '').toString().toUpperCase()
    let brokerStatus = status || 'UNKNOWN'
    if (['TRADED', 'FILLED', 'COMPLETE', 'COMPLETED'].includes(status)) brokerStatus = 'FILLED'
    if (['REJECTED', 'CANCELLED', 'CANCELED', 'EXPIRED'].includes(status)) brokerStatus = status

    if (sb && trade) {
      const fillQty = Number(data?.filledQty || data?.tradedQty || data?.quantity || trade.quantity)
      const fillPrice = Number(data?.avgPrice || data?.price || trade.price)
      await sb
        .from('trades')
        .update({
          broker_status: brokerStatus,
          status: brokerStatus === 'FILLED' ? 'OPEN' : brokerStatus === 'REJECTED' ? 'CANCELLED' : trade.status,
          fill_qty: fillQty,
          fill_price: fillPrice,
        })
        .eq('id', trade.id)
      await writeAuditLog({
        userId: auth.userId,
        action: 'ORDER_STATUS_POLL',
        detail: `${dhanOrderId} -> ${brokerStatus}`,
      })
    }

    return NextResponse.json({ orderId: dhanOrderId, brokerStatus, broker: data, tradeId: trade?.id || null })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Status poll failed' }, { status: 500 })
  }
}
