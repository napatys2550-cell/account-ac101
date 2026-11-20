import { formatMoney } from '@/lib/format'
import { lineTotals } from './builders'
import { ACC, BOOKS } from './chart'
import type { Account, Entry, Party } from './types'

export interface ValidationContext {
  accounts: Account[]
  parties: Party[]
  testMode: boolean
}

export interface ValidationIssue {
  code: 'V-01' | 'V-02' | 'V-03' | 'V-04' | 'V-05' | 'V-06'
  message: string
}

export interface ValidationResult {
  ok: boolean
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
}

export function validateEntry(
  entry: Omit<Entry, 'id' | 'createdAt'>,
  ctx: ValidationContext,
): ValidationResult {
  const errors: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []
  const meta = BOOKS[entry.book]

  if (!entry.date || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
    errors.push({ code: 'V-02', message: 'กรุณาระบุวันที่ให้ถูกต้อง' })
  }

  if (!entry.description.trim()) {
    errors.push({ code: 'V-06', message: 'กรุณาระบุรายละเอียดรายการค้า' })
  }

  if (entry.lines.length < 2) {
    errors.push({ code: 'V-03', message: 'ต้องมีอย่างน้อย 2 บรรทัด (เดบิตและเครดิต)' })
  }

  const hasNaN = entry.lines.some((l) => Number.isNaN(l.dr) || Number.isNaN(l.cr))
  const hasNegative = entry.lines.some((l) => l.dr < 0 || l.cr < 0)
  const hasBoth = entry.lines.some((l) => l.dr > 0 && l.cr > 0)
  const { dr, cr, diff } = lineTotals(entry.lines)

  if (hasNaN) errors.push({ code: 'V-03', message: 'จำนวนเงินต้องเป็นตัวเลขเท่านั้น' })
  else if (hasNegative) errors.push({ code: 'V-03', message: 'จำนวนเงินต้องไม่ติดลบ' })
  else if (hasBoth)
    errors.push({ code: 'V-03', message: 'หนึ่งบรรทัดต้องกรอกเฉพาะเดบิตหรือเครดิตอย่างใดอย่างหนึ่ง' })
  else if (dr === 0 && cr === 0) errors.push({ code: 'V-03', message: 'จำนวนเงินต้องมากกว่า 0' })

  for (const l of entry.lines) {
    if (!l.account) {
      errors.push({ code: 'V-06', message: 'กรุณาเลือกชื่อบัญชีให้ครบทุกบรรทัด' })
      break
    }
    if (!ctx.accounts.some((a) => a.code === l.account)) {
      errors.push({ code: 'V-06', message: `ไม่พบบัญชีเลขที่ ${l.account} ในผังบัญชี` })
      break
    }
  }

  for (const l of entry.lines) {
    if (l.account === ACC.AR && (l.dr > 0 || l.cr > 0)) {
      const p = ctx.parties.find((x) => x.id === l.partyId)
      if (!p || p.kind !== 'debtor') {
        errors.push({ code: 'V-04', message: 'กรุณาเลือกชื่อลูกหนี้สำหรับบัญชีลูกหนี้การค้า (110)' })
        break
      }
    }
    if (l.account === ACC.AP && (l.dr > 0 || l.cr > 0)) {
      const p = ctx.parties.find((x) => x.id === l.partyId)
      if (!p || p.kind !== 'creditor') {
        errors.push({ code: 'V-04', message: 'กรุณาเลือกชื่อเจ้าหนี้สำหรับบัญชีเจ้าหนี้การค้า (201)' })
        break
      }
    }
  }

  if (entry.book === 'JNL' && entry.lines.some((l) => l.account === ACC.CASH && (l.dr > 0 || l.cr > 0))) {
    errors.push({
      code: 'V-05',
      message: 'รายการรับ/จ่ายเงินสดต้องบันทึกในสมุดรายวันรับเงินหรือสมุดรายวันจ่ายเงิน',
    })
  }
  if (entry.lines.some((l) => l.column === 'other' && l.account === ACC.CASH)) {
    errors.push({
      code: 'V-05',
      message: `ห้ามใช้บัญชีเงินสดในช่องบัญชีอื่น ๆ ของ${meta.name}`,
    })
  }

  if (!hasNaN && diff !== 0) {
    const issue: ValidationIssue = {
      code: 'V-01',
      message: `เดบิต (${formatMoney(dr)}) ไม่เท่ากับเครดิต (${formatMoney(cr)}) — ผลต่าง ${formatMoney(Math.abs(diff))} บาท`,
    }
    if (ctx.testMode) warnings.push(issue)
    else errors.push(issue)
  }

  return { ok: errors.length === 0, errors, warnings }
}
