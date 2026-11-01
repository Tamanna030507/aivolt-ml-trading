import { NextResponse } from 'next/server'
import { listInstruments, resolveInstrument } from '@/lib/instruments'

export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get('symbol')
  if (symbol) {
    const inst = resolveInstrument(symbol)
    if (!inst) return NextResponse.json({ error: 'Unknown symbol' }, { status: 404 })
    return NextResponse.json(inst)
  }
  return NextResponse.json({ instruments: listInstruments() })
}
