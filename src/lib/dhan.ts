
const DHAN_BASE_URL = 'https://api.dhan.co'

export interface DhanOrder {
  dhanClientId: string
  correlationId?: string
  transactionType: 'BUY' | 'SELL'
  exchangeSegment: 'NSE_EQ' | 'BSE_EQ' | 'NSE_FNO' | 'BSE_FNO' | 'NSE_CURRENCY' | 'MCX_COMM'
  productType: 'CNC' | 'INTRADAY' | 'MARGIN' | 'MTF' | 'CO' | 'BO'
  orderType: 'LIMIT' | 'MARKET' | 'STOP_LOSS' | 'STOP_LOSS_MARKET'
  validity: 'DAY' | 'IOC'
  tradingSymbol: string
  securityId: string
  quantity: number
  disclosedQuantity?: number
  price: number
  triggerPrice?: number
  afterMarketOrder?: boolean
  amoTime?: string
  boProfitValue?: number
  boStopLossValue?: number
}

export interface DhanHolding {
  exchangeSegment: string
  tradingSymbol: string
  securityId: string
  totalQty: number
  dpQty: number
  t1Qty: number
  availableQty: number
  collateralQty: number
  avgCostPrice: number
}

export interface DhanFunds {
  availbal: number
  sodLimit: number
  utilisedAmount: number
  receiveableAmount: number
  blockedPayoutAmount: number
  withdrawableBalance: number
}

class DhanAPI {
  private clientId: string
  private accessToken: string

  constructor(clientId: string, accessToken: string) {
    this.clientId = clientId
    this.accessToken = accessToken
  }

  private async request(endpoint: string, method = 'GET', body?: object) {
    const res = await fetch(`${DHAN_BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'access-token': this.accessToken,
        'client-id': this.clientId,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      const error = await res.text()
      throw new Error(`Dhan API Error: ${res.status} - ${error}`)
    }

    return res.json()
  }

  async getFunds(): Promise<DhanFunds> {
    return this.request('/fundlimit')
  }

  async getHoldings(): Promise<DhanHolding[]> {
    return this.request('/holdings')
  }

  async getPositions() {
    return this.request('/positions')
  }

  async getOrders() {
    return this.request('/orders')
  }

  async getOrder(orderId: string) {
    return this.request(`/orders/${orderId}`)
  }

  async placeOrder(order: DhanOrder) {
    return this.request('/orders', 'POST', order)
  }

  async modifyOrder(orderId: string, modifications: Partial<DhanOrder>) {
    return this.request(`/orders/${orderId}`, 'PUT', modifications)
  }

  async cancelOrder(orderId: string) {
    return this.request(`/orders/${orderId}`, 'DELETE')
  }

  async getTradeHistory(fromDate: string, toDate: string, page = 0) {
    return this.request(`/tradeHistory/${fromDate}/${toDate}/${page}`)
  }

  async getHistoricalData(
    securityId: string,
    exchangeSegment: string,
    instrument: string,
    interval: string,
    fromDate: string,
    toDate: string
  ) {
    return this.request('/charts/historical', 'POST', {
      securityId,
      exchangeSegment,
      instrument,
      interval,
      fromDate,
      toDate,
    })
  }

  async getIntradayData(securityId: string, exchangeSegment: string) {
    return this.request('/charts/intraday', 'POST', {
      securityId,
      exchangeSegment,
      interval: '1',
    })
  }
}

export function getDhanClient(clientId?: string, accessToken?: string) {
  const id = clientId || process.env.NEXT_PUBLIC_DHAN_CLIENT_ID || ''
  const token = accessToken || process.env.DHAN_ACCESS_TOKEN || ''
  
  if (!id || !token) {
    return null
  }
  
  return new DhanAPI(id, token)
}

export function mapTradeType(tradeType: string): string {
  switch (tradeType) {
    case 'intraday': return 'INTRADAY'
    case 'swing': return 'CNC'
    case 'delivery': return 'CNC'
    case 'options': return 'MARGIN'
    default: return 'CNC'
  }
}

export function mapExchange(exchange: string): string {
  switch (exchange.toUpperCase()) {
    case 'NSE': return 'NSE_EQ'
    case 'BSE': return 'BSE_EQ'
    case 'NFO': return 'NSE_FNO'
    default: return 'NSE_EQ'
  }
}
