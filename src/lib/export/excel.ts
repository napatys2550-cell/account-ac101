import * as XLSX from 'xlsx'
import {
  ACCOUNT_TYPE_LABELS,
  ACC,
  BOOKS,
  BOOK_ORDER,
  accountName,
  balanceOf,
  buildBalanceSheet,
  buildGeneralLedger,
  buildMerchStatement,
  buildSubLedger,
  buildTrialBalance,
  partyName,
  reconcile,
  sortEntries,
} from '@/lib/accounting'
import { formatDateLong, formatDateShort, formatPeriodLabel, periodEnd, satangToBaht } from '@/lib/format'
import type { ExportDataset, ExportOptions } from './types'

const ACC_NUM_FMT = '#,##0.00;(#,##0.00);"-"'

function applyNumberFormat(ws: XLSX.WorkSheet) {
  for (const key of Object.keys(ws)) {
    if (key.startsWith('!')) continue
    const cell = ws[key]
    if (cell && cell.t === 'n') {
      cell.z = ACC_NUM_FMT
    }
  }
}

function addHeaderMerge(ws: XLSX.WorkSheet, colCount: number, headerRows = 3) {
  ws['!merges'] = Array.from({ length: headerRows }, (_, r) => ({
    s: { r, c: 0 },
    e: { r, c: colCount - 1 },
  }))
}

function sheetHeader(companyName: string, title: string, subtitle: string, colCount: number): (string | number)[][] {
  const unitRow = Array(colCount).fill('')
  unitRow[colCount - 1] = 'หน่วย : บาท'
  return [[companyName], [title], [subtitle], unitRow]
}

/**
 * สร้าง Workbook Excel (.xlsx) ที่ถูกต้องตามมาตรฐานบัญชีไทย
 * แยกฟังก์ชันสร้าง WorkBook เพื่อรองรับทั้งการดาวน์โหลดและการทดสอบอัตโนมัติ (Vitest)
 */
export function buildExcelWorkbook(data: ExportDataset, opts: Partial<ExportOptions> = {}): XLSX.WorkBook {
  const { company, accounts, parties, entries } = data
  const includeClosing = opts.includeClosing ?? true
  const kind = opts.kind ?? 'packet'
  const end = periodEnd(company.period)
  const pLabel = formatPeriodLabel(company.period)
  const wb = XLSX.utils.book_new()

  const gl = buildGeneralLedger(entries, accounts, { upto: end, includeClosing })
  const tb = buildTrialBalance(gl, accounts)
  const merch = buildMerchStatement(entries, accounts, company.period)
  const bs = buildBalanceSheet(entries, accounts, end, company.owner)
  const ar = reconcile(gl, entries, parties, 'debtor', { upto: end })
  const ap = reconcile(gl, entries, parties, 'creditor', { upto: end })

  const want = (k: ExportOptions['kind']) => kind === 'packet' || kind === k

  // 1. งบทดลอง
  if (want('trial')) {
    const rows: (string | number)[][] = [
      ...sheetHeader(company.name, 'งบทดลอง (Trial Balance)', `ณ วันที่ ${formatDateLong(end)}`, 4),
      ['เลขที่บัญชี', 'ชื่อบัญชี', 'เดบิต', 'เครดิต'],
      ...tb.rows.map((r) => [
        r.code,
        r.name,
        r.dr ? satangToBaht(r.dr) : '',
        r.cr ? satangToBaht(r.cr) : '',
      ]),
      ['', 'รวมทั้งสิ้น', satangToBaht(tb.totalDr), satangToBaht(tb.totalCr)],
      ['', 'สถานะการตรวจสอบ', tb.balanced ? 'สมดุล (เดบิต = เครดิต)' : `ไม่สมดุล (ผลต่าง ${satangToBaht(Math.abs(tb.diff))})`, ''],
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 14 }, { wch: 36 }, { wch: 18 }, { wch: 18 }]
    addHeaderMerge(ws, 4)
    applyNumberFormat(ws)
    XLSX.utils.book_append_sheet(wb, ws, 'งบทดลอง')
  }

  // 2. งบกำไรขาดทุน
  if (want('income')) {
    const rows: (string | number)[][] = [
      ...sheetHeader(
        company.name,
        'งบกำไรขาดทุน (แบบหลายขั้นตอน)',
        `สำหรับงวด 1 เดือน สิ้นสุดวันที่ ${formatDateLong(end)} (งวด${pLabel})`,
        2,
      ),
      ['รายการ', 'จำนวนเงิน (บาท)'],
      ['รายได้จากการขาย', ''],
      ['  ขายสินค้า', satangToBaht(merch.sales)],
      ['  หัก รับคืนสินค้าขาย', satangToBaht(-merch.sret)],
      ['  หัก ส่วนลดจ่าย', satangToBaht(-merch.sdisc)],
      ['ยอดขายสุทธิ', satangToBaht(merch.netSales)],
      ['ต้นทุนขายสินค้า', ''],
      ['  สินค้าคงเหลือต้นงวด', satangToBaht(merch.beg)],
      ['  ซื้อสินค้า', satangToBaht(merch.purch)],
      ['  หัก ส่งคืนสินค้าซื้อ', satangToBaht(-merch.pret)],
      ['  หัก ส่วนลดรับ', satangToBaht(-merch.pdisc)],
      ['  ซื้อสุทธิ', satangToBaht(merch.netPurch)],
      ['  บวก ค่าขนส่งเข้า', satangToBaht(merch.fin)],
      ['  ต้นทุนซื้อสุทธิ', satangToBaht(merch.costPurch)],
      ['  สินค้าที่มีไว้เพื่อขาย', satangToBaht(merch.available)],
      ['  หัก สินค้าคงเหลือปลายงวด', satangToBaht(-merch.ending)],
      ['ต้นทุนขาย', satangToBaht(merch.cogs)],
      ['กำไรขั้นต้น', satangToBaht(merch.gross)],
      ['ค่าใช้จ่ายในการขาย', ''],
      ...merch.sell.map((r) => [`  ${r.name}`, satangToBaht(r.amount)]),
      ['รวมค่าใช้จ่ายในการขาย', satangToBaht(merch.sellTotal)],
      ['ค่าใช้จ่ายในการบริหาร', ''],
      ...merch.admin.map((r) => [`  ${r.name}`, satangToBaht(r.amount)]),
      ['รวมค่าใช้จ่ายในการบริหาร', satangToBaht(merch.adminTotal)],
      ['กำไรจากการดำเนินงาน', satangToBaht(merch.operating)],
      ['บวก รายได้อื่น', satangToBaht(merch.other)],
      ['กำไรสุทธิประจำงวด', satangToBaht(merch.netIncome)],
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 44 }, { wch: 20 }]
    addHeaderMerge(ws, 2)
    applyNumberFormat(ws)
    XLSX.utils.book_append_sheet(wb, ws, 'งบกำไรขาดทุน')
  }

  // 3. งบแสดงฐานะการเงิน
  if (want('balance')) {
    const rows: (string | number)[][] = [
      ...sheetHeader(company.name, 'งบแสดงฐานะการเงิน', `ณ วันที่ ${formatDateLong(end)}`, 2),
      ['รายการ', 'จำนวนเงิน (บาท)'],
      ['สินทรัพย์', ''],
      ...bs.assets.map((r) => [`  ${r.code} ${r.name}`, satangToBaht(r.amount)]),
      ['รวมสินทรัพย์', satangToBaht(bs.totalAssets)],
      ['', ''],
      ['หนี้สิน', ''],
      ...bs.liabilities.map((r) => [`  ${r.code} ${r.name}`, satangToBaht(r.amount)]),
      ['รวมหนี้สิน', satangToBaht(bs.totalLiabilities)],
      ['', ''],
      ['ส่วนของเจ้าของ', ''],
      ...bs.equity.map((r) => [`  ${r.name}`, satangToBaht(r.amount)]),
      ['รวมส่วนของเจ้าของ', satangToBaht(bs.totalEquity)],
      ['รวมหนี้สินและส่วนของเจ้าของ', satangToBaht(bs.totalLiabilities + bs.totalEquity)],
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 44 }, { wch: 20 }]
    addHeaderMerge(ws, 2)
    applyNumberFormat(ws)
    XLSX.utils.book_append_sheet(wb, ws, 'งบฐานะการเงิน')
  }

  // 4. สมุดรายวัน 5 เล่ม
  if (want('journals')) {
    for (const book of BOOK_ORDER) {
      const list = sortEntries(entries).filter(
        (e) => e.book === book && (includeClosing || !e.closing),
      )
      const rows: (string | number)[][] = [
        ...sheetHeader(company.name, BOOKS[book].name, `งวดเดือน ${pLabel}`, 8),
        ['วันที่', 'เลขที่เอกสาร', 'รายละเอียดรายการ', 'เลขที่บัญชี', 'ชื่อบัญชี', 'ลูกหนี้/เจ้าหนี้', 'เดบิต', 'เครดิต'],
      ]
      let sumDr = 0
      let sumCr = 0
      for (const e of list) {
        for (const l of e.lines) {
          sumDr += l.dr
          sumCr += l.cr
          rows.push([
            formatDateShort(e.date),
            e.docNo,
            e.description,
            l.account,
            accountName(accounts, l.account),
            partyName(parties, l.partyId),
            l.dr ? satangToBaht(l.dr) : '',
            l.cr ? satangToBaht(l.cr) : '',
          ])
        }
      }
      rows.push(['', '', 'รวมยอดทั้งเล่ม', '', '', '', satangToBaht(sumDr), satangToBaht(sumCr)])
      const ws = XLSX.utils.aoa_to_sheet(rows)
      ws['!cols'] = [
        { wch: 14 },
        { wch: 12 },
        { wch: 40 },
        { wch: 12 },
        { wch: 26 },
        { wch: 24 },
        { wch: 16 },
        { wch: 16 },
      ]
      addHeaderMerge(ws, 8)
      applyNumberFormat(ws)
      XLSX.utils.book_append_sheet(wb, ws, BOOKS[book].shortName)
    }
  }

  // 5. ทะเบียนรายการค้าทั้งหมด (พร้อมเหตุผลการเลือกสมุด)
  if (want('entries')) {
    const list = sortEntries(entries).filter((e) => includeClosing || !e.closing)
    const rows: (string | number)[][] = [
      ...sheetHeader(company.name, 'ทะเบียนรายการค้าทั้งหมด (พร้อมเหตุผลการเลือกสมุด)', `งวดเดือน ${pLabel}`, 8),
      ['ลำดับ', 'วันที่', 'เลขที่', 'สมุดรายวัน', 'รายละเอียดรายการ', 'เหตุผลการเลือกสมุด', 'เดบิต', 'เครดิต'],
    ]
    let sumDr = 0
    let sumCr = 0
    list.forEach((e, idx) => {
      const d = e.lines.reduce((s, l) => s + l.dr, 0)
      const c = e.lines.reduce((s, l) => s + l.cr, 0)
      sumDr += d
      sumCr += c
      rows.push([
        idx + 1,
        formatDateShort(e.date),
        e.docNo,
        BOOKS[e.book].name,
        e.description,
        e.reason || '-',
        satangToBaht(d),
        satangToBaht(c),
      ])
    })
    rows.push(['', '', '', '', '', 'รวมทั้งสิ้น', satangToBaht(sumDr), satangToBaht(sumCr)])
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [
      { wch: 8 },
      { wch: 14 },
      { wch: 12 },
      { wch: 20 },
      { wch: 38 },
      { wch: 44 },
      { wch: 16 },
      { wch: 16 },
    ]
    addHeaderMerge(ws, 8)
    applyNumberFormat(ws)
    // ลำดับเป็นจำนวนเต็ม ไม่ใช่ทศนิยม
    for (let r = 5; r < 5 + list.length; r++) {
      const ref = XLSX.utils.encode_cell({ r, c: 0 })
      if (ws[ref]) ws[ref].z = '0'
    }
    XLSX.utils.book_append_sheet(wb, ws, 'ทะเบียนรายการค้า')
  }

  // 6. บัญชีแยกประเภททั่วไป
  if (want('ledger')) {
    const rows: (string | number)[][] = [
      ...sheetHeader(company.name, 'บัญชีแยกประเภททั่วไป (General Ledger)', `ณ วันที่ ${formatDateLong(end)}`, 8),
      ['เลขที่บัญชี', 'ชื่อบัญชี', 'วันที่', 'รายการ', 'หน้าบัญชี', 'เดบิต', 'เครดิต', 'คงเหลือ (ดบ.-คด.)'],
    ]
    for (const code of Object.keys(gl).sort()) {
      let running = 0
      for (const p of gl[code]) {
        running += p.dr - p.cr
        rows.push([
          code,
          accountName(accounts, code),
          formatDateShort(p.date),
          p.description,
          p.ref,
          p.dr ? satangToBaht(p.dr) : '',
          p.cr ? satangToBaht(p.cr) : '',
          satangToBaht(running),
        ])
      }
      const bal = balanceOf(gl[code])
      rows.push([
        '',
        `รวม/คงเหลือบัญชี ${code} ${accountName(accounts, code)}`,
        '',
        '',
        '',
        bal > 0 ? satangToBaht(bal) : '',
        bal < 0 ? satangToBaht(-bal) : '',
        satangToBaht(bal),
      ])
    }
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [
      { wch: 12 },
      { wch: 26 },
      { wch: 14 },
      { wch: 34 },
      { wch: 12 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
    ]
    addHeaderMerge(ws, 8)
    applyNumberFormat(ws)
    XLSX.utils.book_append_sheet(wb, ws, 'แยกประเภททั่วไป')
  }

  // 7. บัญชีย่อยลูกหนี้และเจ้าหนี้
  if (want('subledger')) {
    const addSub = (kindParty: 'debtor' | 'creditor', sheetName: string, rec: typeof ar) => {
      const sub = buildSubLedger(entries, kindParty, { upto: end })
      const sign = kindParty === 'debtor' ? 1 : -1
      const title =
        kindParty === 'debtor'
          ? 'บัญชีแยกประเภทย่อยลูกหนี้การค้า'
          : 'บัญชีแยกประเภทย่อยเจ้าหนี้การค้า'
      const rows: (string | number)[][] = [
        ...sheetHeader(company.name, title, `ณ วันที่ ${formatDateLong(end)}`, 8),
        ['รหัส', 'ชื่อลูกหนี้/เจ้าหนี้', 'วันที่', 'รายการ', 'หน้าบัญชี', 'เดบิต', 'เครดิต', 'คงเหลือ'],
      ]
      for (const { party } of rec.parties) {
        let running = 0
        const list = sub[party.id] ?? []
        for (const p of list) {
          running += sign * (p.dr - p.cr)
          rows.push([
            party.id,
            party.name,
            formatDateShort(p.date),
            p.description,
            p.ref,
            p.dr ? satangToBaht(p.dr) : '',
            p.cr ? satangToBaht(p.cr) : '',
            satangToBaht(running),
          ])
        }
        if (!list.length) {
          rows.push([party.id, party.name, '', '(ไม่มีรายการเคลื่อนไหว)', '', '', '', 0])
        }
      }
      rows.push([])
      rows.push(['', 'รวมยอดคงเหลือบัญชีย่อย', '', '', '', '', '', satangToBaht(rec.subTotal)])
      rows.push([
        '',
        `ยอดคงเหลือบัญชีคุม (${kindParty === 'debtor' ? ACC.AR : ACC.AP})`,
        '',
        '',
        '',
        '',
        '',
        satangToBaht(rec.control),
      ])
      rows.push([
        '',
        'ผลการกระทบยอด',
        rec.ok ? 'ตรงกัน (ถูกต้อง)' : `ไม่ตรงกัน (ผลต่าง ${satangToBaht(Math.abs(rec.diff))})`,
      ])
      const ws = XLSX.utils.aoa_to_sheet(rows)
      ws['!cols'] = [
        { wch: 10 },
        { wch: 28 },
        { wch: 14 },
        { wch: 36 },
        { wch: 12 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
      ]
      addHeaderMerge(ws, 8)
      applyNumberFormat(ws)
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
    }
    addSub('debtor', 'บัญชีย่อยลูกหนี้', ar)
    addSub('creditor', 'บัญชีย่อยเจ้าหนี้', ap)
  }

  // 8. ผังบัญชี
  if (want('accounts')) {
    const rows: (string | number)[][] = [
      ...sheetHeader(company.name, 'ผังบัญชีกิจการซื้อมาขายไป', company.businessType, 5),
      ['เลขที่บัญชี', 'ชื่อบัญชี', 'หมวดบัญชี', 'ด้านปกติ', 'หมายเหตุ'],
      ...accounts.map((a) => [
        a.code,
        a.name,
        ACCOUNT_TYPE_LABELS[a.type],
        a.normal === 'dr' ? 'เดบิต' : 'เครดิต',
        a.note ?? '-',
      ]),
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 14 }, { wch: 30 }, { wch: 18 }, { wch: 12 }, { wch: 32 }]
    addHeaderMerge(ws, 5)
    XLSX.utils.book_append_sheet(wb, ws, 'ผังบัญชี')
  }

  return wb
}

export function buildExcelBuffer(data: ExportDataset, opts: Partial<ExportOptions> = {}): Uint8Array {
  const wb = buildExcelWorkbook(data, opts)
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as Uint8Array
}
