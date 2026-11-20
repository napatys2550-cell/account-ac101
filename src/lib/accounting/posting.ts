import { ACC, BOOKS, accountName } from './chart'
import type { Account, Book, Entry, JournalLine, Party, PartyKind, Posting, Side } from './types'

export const sideOf = (l: JournalLine): Side => (l.dr > 0 ? 'dr' : 'cr')
export const amountOf = (l: JournalLine): number => (l.dr > 0 ? l.dr : l.cr)
export const monthKey = (iso: string) => iso.slice(0, 7)

export function lastDayOfMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return `${ym}-${String(d).padStart(2, '0')}`
}

export function sortEntries(entries: Entry[]): Entry[] {
  return [...entries].sort(
    (a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt || a.docNo.localeCompare(b.docNo),
  )
}

export function pageMap(entries: Entry[]): Map<string, number> {
  const months = [...new Set(entries.map((e) => monthKey(e.date)))].sort()
  return new Map(months.map((m, i) => [m, i + 1]))
}

export function refOf(book: Book, date: string, pages: Map<string, number>): string {
  return `${BOOKS[book].abbr}.${pages.get(monthKey(date)) ?? 1}`
}

export const isSpecialBook = (book: Book) => book !== 'JNL'

export function isTotalPosted(entry: Entry, line: JournalLine): boolean {
  return isSpecialBook(entry.book) && line.column !== 'other'
}

function contraNames(entry: Entry, line: JournalLine, accounts: Account[]): string {
  const side = sideOf(line)
  const names = entry.lines
    .filter((l) => amountOf(l) > 0 && sideOf(l) !== side)
    .map((l) => accountName(accounts, l.account))
  const unique = [...new Set(names)]
  return unique.length ? unique.join(', ') : entry.description || '-'
}

export type GeneralLedger = Record<string, Posting[]>

/**
 * สร้างบัญชีแยกประเภททั่วไป (General Ledger)
 * mode = 'textbook' : ผ่านยอดรวมสิ้นเดือนสำหรับช่องเฉพาะของสมุดรายวันเฉพาะ และผ่านรายตัวสำหรับช่องบัญชีอื่น ๆ + สมุดทั่วไป (มาตรฐาน AC101)
 * mode = 'detail'   : ผ่านรายตัวทุกบรรทัดเพื่อดูรายละเอียดทีละรายการ
 */
export function buildGeneralLedger(
  entries: Entry[],
  accounts: Account[],
  opts?: { upto?: string; includeClosing?: boolean; mode?: 'textbook' | 'detail' },
): GeneralLedger {
  const mode = opts?.mode ?? 'textbook'
  const includeClosing = opts?.includeClosing ?? true
  const filtered = sortEntries(entries).filter((e) => {
    if (opts?.upto && e.date > opts.upto) return false
    if (!includeClosing && e.closing) return false
    return true
  })

  const pages = pageMap(filtered)
  const gl: GeneralLedger = {}
  const push = (code: string, p: Posting) => {
    ;(gl[code] ??= []).push(p)
  }
  const totals = new Map<string, Posting>()

  for (const entry of filtered) {
    entry.lines.forEach((line, idx) => {
      const amt = amountOf(line)
      if (amt <= 0) return
      const side = sideOf(line)
      if (mode === 'textbook' && isTotalPosted(entry, line)) {
        const ym = monthKey(entry.date)
        const key = `${entry.book}|${ym}|${line.account}|${side}`
        const existing = totals.get(key)
        if (existing) {
          existing.dr += line.dr
          existing.cr += line.cr
        } else {
          totals.set(key, {
            key,
            date: lastDayOfMonth(ym),
            description: `ยอดรวม${BOOKS[entry.book].name}`,
            ref: refOf(entry.book, entry.date, pages),
            dr: line.dr,
            cr: line.cr,
            kind: 'total',
            book: entry.book,
          })
        }
      } else {
        push(line.account, {
          key: `${entry.id}:${idx}`,
          date: entry.date,
          description: mode === 'detail' ? entry.description : contraNames(entry, line, accounts),
          ref: mode === 'detail' ? entry.docNo : refOf(entry.book, entry.date, pages),
          dr: line.dr,
          cr: line.cr,
          kind: 'line',
          book: entry.book,
          entryId: entry.id,
          docNo: entry.docNo,
          memo: entry.description,
        })
      }
    })
  }

  for (const t of totals.values()) {
    const code = t.key.split('|')[2]
    push(code, t)
  }

  for (const code of Object.keys(gl)) {
    gl[code].sort(
      (a, b) => a.date.localeCompare(b.date) || (a.kind === b.kind ? 0 : a.kind === 'line' ? -1 : 1),
    )
  }
  return gl
}

export const controlOf = (kind: PartyKind) => (kind === 'debtor' ? ACC.AR : ACC.AP)

export type SubLedger = Record<string, Posting[]>

export function buildSubLedger(entries: Entry[], kind: PartyKind, opts?: { upto?: string }): SubLedger {
  const filtered = sortEntries(entries).filter((e) => (!opts?.upto || e.date <= opts.upto))
  const pages = pageMap(filtered)
  const control = controlOf(kind)
  const sub: SubLedger = {}

  for (const entry of filtered) {
    entry.lines.forEach((line, idx) => {
      if (line.account !== control || !line.partyId || amountOf(line) <= 0) return
      ;(sub[line.partyId] ??= []).push({
        key: `${entry.id}:${idx}`,
        date: entry.date,
        description: entry.description || entry.docNo || BOOKS[entry.book].name,
        ref: refOf(entry.book, entry.date, pages),
        docNo: entry.docNo,
        dr: line.dr,
        cr: line.cr,
        kind: 'line',
        book: entry.book,
        entryId: entry.id,
      })
    })
  }
  return sub
}

/** ยอดคงเหลือ (เดบิต − เครดิต) หน่วย: สตางค์ */
export function balanceOf(postings: Posting[] | undefined): number {
  return (postings ?? []).reduce((s, p) => s + p.dr - p.cr, 0)
}

export interface TraceStep {
  account: string
  accountName: string
  side: Side
  amount: number
  mode: 'individual' | 'total'
  party?: Party
}

export function traceEntry(entry: Entry, accounts: Account[], parties: Party[]): TraceStep[] {
  return entry.lines
    .filter((l) => amountOf(l) > 0)
    .map((l) => ({
      account: l.account,
      accountName: accountName(accounts, l.account),
      side: sideOf(l),
      amount: amountOf(l),
      mode: isTotalPosted(entry, l) ? 'total' : 'individual',
      party: l.partyId ? parties.find((p) => p.id === l.partyId) : undefined,
    }))
}
