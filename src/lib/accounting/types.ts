/**
 * ประเภทข้อมูลหลักของระบบบัญชีสมุดรายวันเฉพาะ (กิจการซื้อมาขายไป ไม่มี VAT)
 * จำนวนเงินทั้งหมดเก็บเป็น "สตางค์" (จำนวนเต็ม) เพื่อป้องกันความคลาดเคลื่อนของทศนิยม
 */

export type Book = 'PUR' | 'SAL' | 'REC' | 'PAY' | 'JNL'

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'

export type AccountGroup = '' | 'sales' | 'purch' | 'cogs' | 'sell' | 'admin' | 'other'

export type Side = 'dr' | 'cr'

export interface Account {
  code: string
  name: string
  type: AccountType
  normal: Side
  group: AccountGroup
  note?: string
}

export type PartyKind = 'debtor' | 'creditor'

export interface Party {
  id: string
  kind: PartyKind
  name: string
  terms: string
}

/** ช่องของสมุดรายวันที่บรรทัดนั้นอยู่ ใช้กำหนดวิธีผ่านรายการตามมาตรฐานบัญชี */
export type Column =
  | 'cash'
  | 'ar'
  | 'ap'
  | 'sales'
  | 'purchase'
  | 'discAllowed'
  | 'discReceived'
  | 'other'
  | 'general'

export interface JournalLine {
  account: string
  /** เดบิต (หน่วย: สตางค์) */
  dr: number
  /** เครดิต (หน่วย: สตางค์) */
  cr: number
  column: Column
  /** รหัสลูกหนี้หรือเจ้าหนี้ (จำเป็นเมื่อลงบัญชีคุม 110 หรือ 201) */
  partyId?: string
}

export interface Entry {
  id: string
  book: Book
  /** วันที่แบบ ISO (ค.ศ.) YYYY-MM-DD */
  date: string
  docNo: string
  description: string
  /** เหตุผลว่าทำไมรายการนี้บันทึกในสมุดรายวันเล่มนี้ (ตามข้อ 4 ใบงาน AC101) */
  reason: string
  terms?: string
  lines: JournalLine[]
  /** รายการปิดบัญชีสินค้าคงเหลือปลายงวด */
  closing?: boolean
  /** รายการทดสอบระบบในโหมดทดสอบ (อนุญาตให้เดบิต ≠ เครดิต เพื่อทดสอบแจ้งเตือนงบทดลอง) */
  isTest?: boolean
  createdAt: number
}

export interface Posting {
  key: string
  date: string
  description: string
  ref: string
  dr: number
  cr: number
  kind: 'line' | 'total'
  book: Book
  entryId?: string
  docNo?: string
  memo?: string
}

export interface CompanyInfo {
  name: string
  owner: string
  businessType: string
  basis: string
  inventoryMethod: string
  period: string // YYYY-MM
}

export interface SavedView {
  id: string
  name: string
  book: Book | ''
  q: string
  sort: SortKey
}

export type SortKey = 'date-asc' | 'date-desc' | 'amt-desc' | 'amt-asc' | 'doc'

export interface ExportRecord {
  id: string
  name: string
  format: string
  docKind: string
  size: number
  period: string
  createdAt: string
}
