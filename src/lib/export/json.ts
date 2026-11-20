import type { ExportDataset } from './types'

export function buildJsonBackup(data: ExportDataset): string {
  return JSON.stringify(
    {
      app: 'account-v3-maewnam',
      version: 3,
      exportedAt: new Date().toISOString(),
      ...data,
    },
    null,
    2,
  )
}

export function parseJsonBackup(raw: string): ExportDataset {
  const d = JSON.parse(raw)
  if (!d || typeof d !== 'object') throw new Error('ไฟล์ JSON ไม่ถูกต้อง')
  if (!Array.isArray(d.entries) || !Array.isArray(d.accounts) || !Array.isArray(d.parties) || !d.company) {
    throw new Error('โครงสร้างไฟล์ไม่ครบถ้วน (ต้องมี company, accounts, parties, entries)')
  }
  return {
    company: d.company,
    accounts: d.accounts,
    parties: d.parties,
    entries: d.entries,
  }
}
