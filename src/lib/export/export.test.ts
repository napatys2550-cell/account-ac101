import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import { DEFAULT_ACCOUNTS, DEFAULT_COMPANY, DEFAULT_PARTIES, createSampleEntries } from '@/lib/accounting'
import {
  DEFAULT_EXPORT_OPTIONS,
  buildCsvContent,
  buildExcelBuffer,
  buildFormalHtml,
  buildJsonBackup,
  parseJsonBackup,
} from './index'

describe('Official Export Verification (XLSX, Formal HTML/PDF, CSV, JSON)', () => {
  const dataset = {
    company: DEFAULT_COMPANY,
    accounts: DEFAULT_ACCOUNTS,
    parties: DEFAULT_PARTIES,
    entries: createSampleEntries(),
  }

  it('produces a valid multi-sheet .xlsx workbook with intact Thai text and balanced Trial Balance', () => {
    const buf = buildExcelBuffer(dataset, { ...DEFAULT_EXPORT_OPTIONS, kind: 'packet' })
    expect(buf.byteLength).toBeGreaterThan(5000)

    const wb = XLSX.read(buf, { type: 'array' })
    expect(wb.SheetNames).toContain('งบทดลอง')
    expect(wb.SheetNames).toContain('งบกำไรขาดทุน')
    expect(wb.SheetNames).toContain('งบฐานะการเงิน')
    expect(wb.SheetNames).toContain('รายวันซื้อ')
    expect(wb.SheetNames).toContain('รายวันขาย')
    expect(wb.SheetNames).toContain('รายวันรับเงิน')
    expect(wb.SheetNames).toContain('รายวันจ่ายเงิน')
    expect(wb.SheetNames).toContain('รายวันทั่วไป')
    expect(wb.SheetNames).toContain('แยกประเภททั่วไป')
    expect(wb.SheetNames).toContain('บัญชีย่อยลูกหนี้')
    expect(wb.SheetNames).toContain('บัญชีย่อยเจ้าหนี้')

    const tbSheet = wb.Sheets['งบทดลอง']
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(tbSheet, { header: 1 })
    expect(rows[0][0]).toBe('ร้านเครื่องเขียนคุณแมวน้ำ')
    expect(rows[1][0]).toBe('งบทดลอง (Trial Balance)')

    const totalRow = rows.find((r) => r[1] === 'รวมทั้งสิ้น')
    expect(totalRow).toBeDefined()
    expect(typeof totalRow?.[2]).toBe('number')
    expect(totalRow?.[2]).toBe(totalRow?.[3])
  })

  it('produces formal HTML without broken template literals or foreign branding', () => {
    const html = buildFormalHtml(dataset, { ...DEFAULT_EXPORT_OPTIONS, kind: 'packet', format: 'html' })
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('ร้านเครื่องเขียนคุณแมวน้ำ')
    expect(html).toContain('หน่วย : บาท')
    expect(html).toContain('ผู้จัดทำบัญชี')
    expect(html).toContain('ผู้สอบทาน / ผู้อนุมัติ')
    expect(html).not.toContain('Dun Accounting')
    expect(html).not.toContain('esc(')
    expect(html).not.toContain('${')
  })

  it('produces UTF-8 BOM CSV with proper Thai headers and rows', () => {
    const csv = buildCsvContent(dataset, { kind: 'entries' })
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('วันที่,เลขที่เอกสาร,สมุดรายวัน,รายละเอียด,เหตุผลการเลือกสมุด')
    expect(csv).toContain('ร้านซีค้าขาย')
  })

  it('round-trips JSON backup cleanly', () => {
    const json = buildJsonBackup(dataset)
    const parsed = parseJsonBackup(json)
    expect(parsed.company.name).toBe(dataset.company.name)
    expect(parsed.entries.length).toBe(dataset.entries.length)
  })
})
