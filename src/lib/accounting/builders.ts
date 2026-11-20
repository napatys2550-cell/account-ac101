import { ACC } from './chart'
import type { Book, Entry, JournalLine } from './types'

export function lineTotals(lines: JournalLine[]) {
  const dr = lines.reduce((s, l) => s + (Number.isFinite(l.dr) ? l.dr : 0), 0)
  const cr = lines.reduce((s, l) => s + (Number.isFinite(l.cr) ? l.cr : 0), 0)
  return { dr, cr, diff: dr - cr, balanced: dr === cr && dr > 0 }
}

export function nextDocNo(entries: Entry[], book: Book): string {
  const nums = entries
    .filter((e) => e.book === book)
    .map((e) => {
      const m = String(e.docNo).match(/(\d+)$/)
      return m ? parseInt(m[1], 10) : 0
    })
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `${book}-${String(next).padStart(3, '0')}`
}

export function buildPurchaseLines(amount: number, creditorId: string): JournalLine[] {
  return [
    { account: ACC.PURCHASE, dr: amount, cr: 0, column: 'purchase' },
    { account: ACC.AP, dr: 0, cr: amount, column: 'ap', partyId: creditorId },
  ]
}

export function buildSalesLines(amount: number, debtorId: string): JournalLine[] {
  return [
    { account: ACC.AR, dr: amount, cr: 0, column: 'ar', partyId: debtorId },
    { account: ACC.SALES, dr: 0, cr: amount, column: 'sales' },
  ]
}

export type ReceiptKind = 'cash-sale' | 'ar-collect' | 'other'

export function buildReceiptLines(params: {
  kind: ReceiptKind
  cash: number
  discount?: number
  debtorId?: string
  otherAccount?: string
}): JournalLine[] {
  const discount = params.discount ?? 0
  const lines: JournalLine[] = [{ account: ACC.CASH, dr: params.cash, cr: 0, column: 'cash' }]
  if (params.kind === 'ar-collect') {
    if (discount > 0) {
      lines.push({ account: ACC.DISC_ALLOWED, dr: discount, cr: 0, column: 'discAllowed' })
    }
    lines.push({
      account: ACC.AR,
      dr: 0,
      cr: params.cash + discount,
      column: 'ar',
      partyId: params.debtorId,
    })
  } else if (params.kind === 'cash-sale') {
    lines.push({ account: ACC.SALES, dr: 0, cr: params.cash, column: 'sales' })
  } else {
    lines.push({
      account: params.otherAccount || ACC.CAPITAL,
      dr: 0,
      cr: params.cash,
      column: 'other',
    })
  }
  return lines
}

export type PaymentKind = 'ap-pay' | 'expense' | 'other'

export function buildPaymentLines(params: {
  kind: PaymentKind
  cash: number
  discount?: number
  creditorId?: string
  otherAccount?: string
}): JournalLine[] {
  const discount = params.discount ?? 0
  const lines: JournalLine[] = []
  if (params.kind === 'ap-pay') {
    lines.push({
      account: ACC.AP,
      dr: params.cash + discount,
      cr: 0,
      column: 'ap',
      partyId: params.creditorId,
    })
    lines.push({ account: ACC.CASH, dr: 0, cr: params.cash, column: 'cash' })
    if (discount > 0) {
      lines.push({ account: ACC.DISC_RECEIVED, dr: 0, cr: discount, column: 'discReceived' })
    }
  } else {
    lines.push({
      account: params.otherAccount || ACC.RENT,
      dr: params.cash,
      cr: 0,
      column: 'other',
    })
    lines.push({ account: ACC.CASH, dr: 0, cr: params.cash, column: 'cash' })
  }
  return lines
}
