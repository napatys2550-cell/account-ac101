import {
  BOOKS,
  accountName,
  buildGeneralLedger,
  buildTrialBalance,
  partyName,
  sortEntries,
} from '@/lib/accounting'
import { formatDateShort, periodEnd, satangToBaht } from '@/lib/format'
import type { ExportDataset, ExportOptions } from './types'

const csvCell = (val: string | number): string => {
  const s = String(val ?? '')
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const toCsvLine = (cells: (string | number)[]) => cells.map(csvCell).join(',')

/**
 * สร้างไฟล์ CSV เข้ารหัส UTF-8 พร้อม BOM (\uFEFF) เพื่อให้ Excel เปิดภาษาไทยได้ทันทีโดยไม่เพี้ยน
 */
export function buildCsvContent(data: ExportDataset, opts: Partial<ExportOptions> = {}): string {
  const { company, accounts, parties, entries } = data
  const includeClosing = opts.includeClosing ?? true
  const kind = opts.kind ?? 'entries'
  const end = periodEnd(company.period)
  const lines: string[] = []

  if (kind === 'trial') {
    const gl = buildGeneralLedger(entries, accounts, { upto: end, includeClosing })
    const tb = buildTrialBalance(gl, accounts)
    lines.push(toCsvLine(['เลขที่บัญชี', 'ชื่อบัญชี', 'เดบิต', 'เครดิต']))
    for (const r of tb.rows) {
      lines.push(
        toCsvLine([
          r.code,
          r.name,
          r.dr ? satangToBaht(r.dr).toFixed(2) : '',
          r.cr ? satangToBaht(r.cr).toFixed(2) : '',
        ]),
      )
    }
    lines.push(toCsvLine(['', 'รวมทั้งสิ้น', satangToBaht(tb.totalDr).toFixed(2), satangToBaht(tb.totalCr).toFixed(2)]))
  } else {
    lines.push(
      toCsvLine([
        'วันที่',
        'เลขที่เอกสาร',
        'สมุดรายวัน',
        'รายละเอียด',
        'เหตุผลการเลือกสมุด',
        'เลขที่บัญชี',
        'ชื่อบัญชี',
        'ลูกหนี้/เจ้าหนี้',
        'เดบิต',
        'เครดิต',
      ]),
    )
    const list = sortEntries(entries).filter((e) => includeClosing || !e.closing)
    for (const e of list) {
      for (const l of e.lines) {
        lines.push(
          toCsvLine([
            formatDateShort(e.date),
            e.docNo,
            BOOKS[e.book].name,
            e.description,
            e.reason || '',
            l.account,
            accountName(accounts, l.account),
            partyName(parties, l.partyId),
            l.dr ? satangToBaht(l.dr).toFixed(2) : '',
            l.cr ? satangToBaht(l.cr).toFixed(2) : '',
          ]),
        )
      }
    }
  }

  return '\uFEFF' + lines.join('\r\n') + '\r\n'
}
