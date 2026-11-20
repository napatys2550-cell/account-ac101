import type { Account, CompanyInfo, Entry, Party } from '@/lib/accounting'

export type ExportDocKind =
  | 'packet'
  | 'trial'
  | 'income'
  | 'balance'
  | 'journals'
  | 'ledger'
  | 'subledger'
  | 'entries'
  | 'accounts'

export type ExportFormat = 'xlsx' | 'pdf' | 'html' | 'csv' | 'json'

export interface ExportOptions {
  kind: ExportDocKind
  format: ExportFormat
  paper: 'a4' | 'letter'
  landscape: boolean
  letterhead: boolean
  signature: boolean
  footer: boolean
  includeClosing: boolean
  preparedBy: string
  approvedBy: string
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  kind: 'packet',
  format: 'xlsx',
  paper: 'a4',
  landscape: false,
  letterhead: true,
  signature: true,
  footer: true,
  includeClosing: true,
  preparedBy: 'ฝ่ายบัญชี ร้านเครื่องเขียนคุณแมวน้ำ',
  approvedBy: 'คุณแมวน้ำ (เจ้าของกิจการ)',
}

export const DOC_KIND_LABELS: Record<ExportDocKind, string> = {
  packet: 'ชุดงบการเงินและรายงานบัญชีฉบับสมบูรณ์',
  trial: 'งบทดลอง (Trial Balance)',
  income: 'งบกำไรขาดทุน (แบบหลายขั้นตอน)',
  balance: 'งบแสดงฐานะการเงิน (Balance Sheet)',
  journals: 'สมุดรายวันเฉพาะ 4 เล่ม + สมุดรายวันทั่วไป',
  ledger: 'บัญชีแยกประเภททั่วไป (General Ledger)',
  subledger: 'บัญชีแยกประเภทย่อยลูกหนี้และเจ้าหนี้การค้า',
  entries: 'ทะเบียนรายการค้าทั้งหมด (พร้อมเหตุผลการเลือกสมุด)',
  accounts: 'ผังบัญชีกิจการซื้อมาขายไป',
}

export interface ExportDataset {
  company: CompanyInfo
  accounts: Account[]
  parties: Party[]
  entries: Entry[]
}
