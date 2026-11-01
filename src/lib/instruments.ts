export type Instrument = {
  symbol: string
  tradingSymbol: string
  securityId: string
  exchange: 'NSE' | 'BSE'
  name: string
}

const NSE_MAP: Record<string, { securityId: string; name: string }> = {
  RELIANCE: { securityId: '2885', name: 'Reliance Industries' },
  TCS: { securityId: '11536', name: 'Tata Consultancy Services' },
  HDFCBANK: { securityId: '1333', name: 'HDFC Bank' },
  INFY: { securityId: '1594', name: 'Infosys' },
  ICICIBANK: { securityId: '4963', name: 'ICICI Bank' },
  SBIN: { securityId: '3045', name: 'State Bank of India' },
  BHARTIARTL: { securityId: '10604', name: 'Bharti Airtel' },
  ITC: { securityId: '1660', name: 'ITC Limited' },
  KOTAKBANK: { securityId: '1922', name: 'Kotak Mahindra Bank' },
  LT: { securityId: '11483', name: 'Larsen & Toubro' },
  AXISBANK: { securityId: '5900', name: 'Axis Bank' },
  WIPRO: { securityId: '3787', name: 'Wipro' },
  MARUTI: { securityId: '10999', name: 'Maruti Suzuki' },
  SUNPHARMA: { securityId: '3351', name: 'Sun Pharmaceutical' },
  TATAMOTORS: { securityId: '3456', name: 'Tata Motors' },
  NTPC: { securityId: '11630', name: 'NTPC' },
  POWERGRID: { securityId: '14977', name: 'Power Grid' },
  TITAN: { securityId: '3506', name: 'Titan Company' },
  BAJFINANCE: { securityId: '317', name: 'Bajaj Finance' },
  HINDUNILVR: { securityId: '1394', name: 'Hindustan Unilever' },
  ULTRACEMCO: { securityId: '11532', name: 'UltraTech Cement' },
  ASIANPAINT: { securityId: '236', name: 'Asian Paints' },
  ONGC: { securityId: '2475', name: 'ONGC' },
  'M&M': { securityId: '2031', name: 'Mahindra & Mahindra' },
  NESTLEIND: { securityId: '17963', name: 'Nestle India' },
  HCLTECH: { securityId: '7229', name: 'HCL Technologies' },
  ADANIENT: { securityId: '25', name: 'Adani Enterprises' },
  ADANIPORTS: { securityId: '15083', name: 'Adani Ports' },
  JSWSTEEL: { securityId: '11723', name: 'JSW Steel' },
  TATASTEEL: { securityId: '3499', name: 'Tata Steel' },
  TECHM: { securityId: '13538', name: 'Tech Mahindra' },
  INDUSINDBK: { securityId: '5258', name: 'IndusInd Bank' },
  BAJAJFINSV: { securityId: '16675', name: 'Bajaj Finserv' },
  COALINDIA: { securityId: '20374', name: 'Coal India' },
  CIPLA: { securityId: '694', name: 'Cipla' },
  DRREDDY: { securityId: '881', name: 'Dr Reddys Laboratories' },
  EICHERMOT: { securityId: '910', name: 'Eicher Motors' },
  GRASIM: { securityId: '1232', name: 'Grasim Industries' },
  HEROMOTOCO: { securityId: '1348', name: 'Hero MotoCorp' },
  HINDALCO: { securityId: '1363', name: 'Hindalco Industries' },
  BPCL: { securityId: '526', name: 'BPCL' },
  BRITANNIA: { securityId: '547', name: 'Britannia Industries' },
  DIVISLAB: { securityId: '10940', name: 'Divis Laboratories' },
  APOLLOHOSP: { securityId: '157', name: 'Apollo Hospitals' },
  TATACONSUM: { securityId: '3432', name: 'Tata Consumer' },
  SBILIFE: { securityId: '21808', name: 'SBI Life Insurance' },
  HDFCLIFE: { securityId: '467', name: 'HDFC Life Insurance' },
}

export function normalizeSymbol(symbol: string): string {
  return symbol
    .toUpperCase()
    .replace(/\.NS$/i, '')
    .replace(/\.BO$/i, '')
    .replace(/\.NSE$/i, '')
    .trim()
}

export function resolveInstrument(symbol: string, exchange: 'NSE' | 'BSE' = 'NSE'): Instrument | null {
  const s = normalizeSymbol(symbol)
  const row = NSE_MAP[s]
  if (!row) return null
  return {
    symbol: s,
    tradingSymbol: s,
    securityId: row.securityId,
    exchange,
    name: row.name,
  }
}

export function listInstruments(): Instrument[] {
  return Object.entries(NSE_MAP).map(([symbol, row]) => ({
    symbol,
    tradingSymbol: symbol,
    securityId: row.securityId,
    exchange: 'NSE' as const,
    name: row.name,
  }))
}
