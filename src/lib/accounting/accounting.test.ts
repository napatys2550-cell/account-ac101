import { describe, expect, it } from 'vitest'
import {
  ACC,
  DEFAULT_ACCOUNTS,
  DEFAULT_COMPANY,
  DEFAULT_PARTIES,
  buildBalanceSheet,
  buildGeneralLedger,
  buildMerchStatement,
  buildTrialBalance,
  collectWarnings,
  createSampleEntries,
  reconcile,
  validateEntry,
} from './index'

describe('Accounting Engine (AC101 Merchandising Special Journals)', () => {
  const entries = createSampleEntries()

  it('has at least 15 sample transactions covering all 5 journals with reasons', () => {
    expect(entries.length).toBeGreaterThanOrEqual(15)
    const books = new Set(entries.map((e) => e.book))
    expect(books).toEqual(new Set(['PUR', 'SAL', 'REC', 'PAY', 'JNL']))
    for (const e of entries) {
      expect(e.reason.trim().length).toBeGreaterThan(5)
    }
  })

  it('builds a balanced trial balance from sample entries', () => {
    const gl = buildGeneralLedger(entries, DEFAULT_ACCOUNTS, { upto: '2026-10-31' })
    const tb = buildTrialBalance(gl, DEFAULT_ACCOUNTS)
    expect(tb.balanced).toBe(true)
    expect(tb.totalDr).toBe(tb.totalCr)
    expect(tb.totalDr).toBeGreaterThan(0)
  })

  it('reconciles AR and AP subsidiary ledgers with control accounts 110 and 201', () => {
    const gl = buildGeneralLedger(entries, DEFAULT_ACCOUNTS, { upto: '2026-10-31' })
    const ar = reconcile(gl, entries, DEFAULT_PARTIES, 'debtor', { upto: '2026-10-31' })
    const ap = reconcile(gl, entries, DEFAULT_PARTIES, 'creditor', { upto: '2026-10-31' })
    expect(ar.ok).toBe(true)
    expect(ar.diff).toBe(0)
    // AR: ร้านซีค้าขาย (70,000 - 5,000 - 65,000 = 0) + คุณดีใจ (40,000) + ร้านอีสเตชั่น (30,000) = 70,000 บาท
    expect(ar.control).toBe(7000000)
    expect(ap.ok).toBe(true)
    expect(ap.diff).toBe(0)
    // AP: บ.เอเทรดดิ้ง (100,000 - 10,000 - 90,000 = 0) + ห้างบีซัพพลาย (60,000) = 60,000 บาท
    expect(ap.control).toBe(6000000)

    const tb = buildTrialBalance(gl, DEFAULT_ACCOUNTS)
    const warnings = collectWarnings(tb, ar, ap)
    expect(warnings.some((w) => w.level === 'error')).toBe(false)
  })

  it('computes accurate Multi-step Income Statement and balanced Balance Sheet', () => {
    const merch = buildMerchStatement(entries, DEFAULT_ACCOUNTS, '2026-10')
    expect(merch.closed).toBe(true)
    // Sales: 70k + 25k + 40k + 30k + 12k + 15k = 192,000
    expect(merch.sales).toBe(19200000)
    // Net Sales: 192,000 - 5,000 - 1,300 = 185,700
    expect(merch.netSales).toBe(18570000)
    // Net Purch: 160,000 - 10,000 - 1,800 = 148,200; + Freight In 2,000 = 150,200; - Ending 45,000 = 105,200 COGS
    expect(merch.cogs).toBe(10520000)
    expect(merch.gross).toBe(8050000)

    const bs = buildBalanceSheet(entries, DEFAULT_ACCOUNTS, '2026-10-31', DEFAULT_COMPANY.owner)
    expect(bs.balanced).toBe(true)
    expect(bs.totalAssets).toBe(bs.totalLiabilities + bs.totalEquity)
  })

  it('blocks unbalanced entries in normal mode and alerts in test mode', () => {
    const badEntry = {
      book: 'JNL' as const,
      date: '2026-10-25',
      docNo: 'JNL-999',
      description: 'ทดสอบรายการไม่สมดุล',
      reason: 'ทดสอบแจ้งเตือนงบทดลอง',
      lines: [
        { account: ACC.SUPPLIES_EXP, dr: 500000, cr: 0, column: 'general' as const },
        { account: ACC.SUPPLIES, dr: 0, cr: 300000, column: 'general' as const },
      ],
    }

    const normalRes = validateEntry(badEntry, {
      accounts: DEFAULT_ACCOUNTS,
      parties: DEFAULT_PARTIES,
      testMode: false,
    })
    expect(normalRes.ok).toBe(false)
    expect(normalRes.errors.some((e) => e.code === 'V-01')).toBe(true)

    const testRes = validateEntry(badEntry, {
      accounts: DEFAULT_ACCOUNTS,
      parties: DEFAULT_PARTIES,
      testMode: true,
    })
    expect(testRes.ok).toBe(true)
    expect(testRes.warnings.some((w) => w.code === 'V-01')).toBe(true)

    // And Trial Balance detects the imbalance!
    const withBad = [...entries, { ...badEntry, id: 'test-1', isTest: true, createdAt: Date.now() }]
    const gl = buildGeneralLedger(withBad, DEFAULT_ACCOUNTS, { upto: '2026-10-31' })
    const tb = buildTrialBalance(gl, DEFAULT_ACCOUNTS)
    expect(tb.balanced).toBe(false)
    expect(tb.diff).toBe(200000)
  })
})
