import { periodEnd, periodPrevEnd } from '@/lib/format'
import { ACC, accountName } from './chart'
import type { Account, Entry } from './types'

type TotalsMap = Record<string, [number, number]>

export function accountTotals(
  entries: Entry[],
  accounts: Account[],
  opts?: { upto?: string; month?: string; skipClosing?: boolean },
): TotalsMap {
  const map: TotalsMap = {}
  for (const a of accounts) map[a.code] = [0, 0]

  for (const e of entries) {
    if (opts?.upto && e.date > opts.upto) continue
    if (opts?.month && !e.date.startsWith(opts.month)) continue
    if (opts?.skipClosing && e.closing) continue
    for (const l of e.lines) {
      if (!map[l.account]) map[l.account] = [0, 0]
      map[l.account][0] += l.dr
      map[l.account][1] += l.cr
    }
  }
  return map
}

export function netOf(map: TotalsMap, code: string): number {
  const pair = map[code]
  return pair ? pair[0] - pair[1] : 0
}

export interface MerchStatement {
  sales: number
  sret: number
  sdisc: number
  netSales: number
  purch: number
  pret: number
  pdisc: number
  fin: number
  netPurch: number
  costPurch: number
  beg: number
  ending: number
  available: number
  cogs: number
  gross: number
  sell: Array<{ code: string; name: string; amount: number }>
  sellTotal: number
  admin: Array<{ code: string; name: string; amount: number }>
  adminTotal: number
  operating: number
  other: number
  netIncome: number
  closed: boolean
  grossMargin: number
  netMargin: number
}

export function buildMerchStatement(
  entries: Entry[],
  accounts: Account[],
  period: string,
): MerchStatement {
  const end = periodEnd(period)
  const prev = periodPrevEnd(period)
  const act = accountTotals(entries, accounts, { month: period, skipClosing: true })
  const cum = accountTotals(entries, accounts, { upto: end })
  const prevTotals = accountTotals(entries, accounts, { upto: prev })

  const sales = -netOf(act, ACC.SALES)
  const sret = netOf(act, ACC.SALES_RET)
  const sdisc = netOf(act, ACC.DISC_ALLOWED)
  const netSales = sales - sret - sdisc

  const purch = netOf(act, ACC.PURCHASE)
  const pret = -netOf(act, ACC.PURCH_RET)
  const pdisc = -netOf(act, ACC.DISC_RECEIVED)
  const fin = netOf(act, ACC.FREIGHT_IN)
  const netPurch = purch - pret - pdisc
  const costPurch = netPurch + fin

  const beg = netOf(prevTotals, ACC.INVENTORY)
  const ending = netOf(cum, ACC.INVENTORY)
  const available = beg + costPurch
  const cogs = available - ending
  const gross = netSales - cogs

  const sellCodes = [ACC.SAL_SALES, ACC.FREIGHT_OUT, ACC.ADVERTISING]
  const sell = sellCodes.map((code) => ({
    code,
    name: accountName(accounts, code),
    amount: netOf(act, code),
  }))
  const sellTotal = sell.reduce((s, r) => s + r.amount, 0)

  const adminCodes = [ACC.SAL_OFFICE, ACC.RENT, ACC.UTILITIES, ACC.SUPPLIES_EXP, ACC.DEP_EXP]
  const admin = adminCodes.map((code) => ({
    code,
    name: accountName(accounts, code),
    amount: netOf(act, code),
  }))
  const adminTotal = admin.reduce((s, r) => s + r.amount, 0)

  const operating = gross - sellTotal - adminTotal
  const other = -netOf(act, ACC.OTHER_REV)
  const netIncome = operating + other
  const closed = entries.some((e) => e.closing && e.date.startsWith(period))

  return {
    sales,
    sret,
    sdisc,
    netSales,
    purch,
    pret,
    pdisc,
    fin,
    netPurch,
    costPurch,
    beg,
    ending,
    available,
    cogs,
    gross,
    sell,
    sellTotal,
    admin,
    adminTotal,
    operating,
    other,
    netIncome,
    closed,
    grossMargin: netSales ? (gross / netSales) * 100 : 0,
    netMargin: netSales ? (netIncome / netSales) * 100 : 0,
  }
}

export interface BalanceSheet {
  assets: Array<{ code: string; name: string; amount: number }>
  totalAssets: number
  liabilities: Array<{ code: string; name: string; amount: number }>
  totalLiabilities: number
  equity: Array<{ name: string; amount: number }>
  totalEquity: number
  balanced: boolean
}

export function buildBalanceSheet(
  entries: Entry[],
  accounts: Account[],
  end: string,
  ownerName: string,
): BalanceSheet {
  const t = accountTotals(entries, accounts, { upto: end })
  const assetCodes = [ACC.CASH, ACC.AR, ACC.SUPPLIES, ACC.INVENTORY, ACC.EQUIP, ACC.ACCUM_DEP]
  const assets = assetCodes.map((code) => ({
    code,
    name: accountName(accounts, code),
    amount: netOf(t, code),
  }))
  const totalAssets = assets.reduce((s, r) => s + r.amount, 0)

  const liabCodes = [ACC.AP, ACC.ACCRUED_SAL, ACC.ACCRUED_UTIL, ACC.UNEARNED]
  const liabilities = liabCodes.map((code) => ({
    code,
    name: accountName(accounts, code),
    amount: -netOf(t, code),
  }))
  const totalLiabilities = liabilities.reduce((s, r) => s + r.amount, 0)

  const profit = accounts
    .filter((a) => a.type === 'revenue' || a.type === 'expense')
    .reduce((s, a) => s - netOf(t, a.code), 0)

  const equity = [
    { name: `ทุน—${ownerName}`, amount: -netOf(t, ACC.CAPITAL) },
    { name: 'หัก ถอนใช้ส่วนตัว', amount: -netOf(t, ACC.DRAWING) },
    { name: profit >= 0 ? 'บวก กำไรสุทธิประจำงวด' : 'หัก ขาดทุนสุทธิประจำงวด', amount: profit },
  ]
  const totalEquity = equity.reduce((s, r) => s + r.amount, 0)

  return {
    assets,
    totalAssets,
    liabilities,
    totalLiabilities,
    equity,
    totalEquity,
    balanced: totalAssets === totalLiabilities + totalEquity,
  }
}
