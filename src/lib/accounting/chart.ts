import type { Account, AccountType, Book, CompanyInfo, Party } from './types'

/** เลขที่บัญชีสำคัญที่เครื่องยนต์บัญชีอ้างอิง */
export const ACC = {
  CASH: '101',
  AR: '110',
  SUPPLIES: '120',
  EQUIP: '140',
  ACCUM_DEP: '145',
  INVENTORY: '150',
  AP: '201',
  ACCRUED_SAL: '210',
  ACCRUED_UTIL: '220',
  UNEARNED: '240',
  CAPITAL: '301',
  DRAWING: '310',
  SALES: '401',
  SALES_RET: '402',
  DISC_ALLOWED: '403',
  OTHER_REV: '420',
  COGS: '501',
  PURCHASE: '502',
  PURCH_RET: '503',
  DISC_RECEIVED: '504',
  FREIGHT_IN: '505',
  SAL_SALES: '520',
  FREIGHT_OUT: '521',
  ADVERTISING: '522',
  SAL_OFFICE: '530',
  RENT: '531',
  UTILITIES: '532',
  SUPPLIES_EXP: '533',
  DEP_EXP: '534',
} as const

export const DEFAULT_COMPANY: CompanyInfo = {
  name: 'ร้านเครื่องเขียนคุณแมวน้ำ',
  owner: 'คุณแมวน้ำ',
  businessType: 'กิจการร้านค้าปลีกประเภทซื้อมาขายไป (ไม่มีภาษีมูลค่าเพิ่ม)',
  basis: 'เกณฑ์คงค้าง (Accrual Basis)',
  inventoryMethod: 'บันทึกสินค้าคงเหลือแบบสิ้นงวด (Periodic)',
  period: '2026-10',
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  asset: 'สินทรัพย์',
  liability: 'หนี้สิน',
  equity: 'ส่วนของเจ้าของ',
  revenue: 'รายได้',
  expense: 'ค่าใช้จ่าย',
}

export const ACCOUNT_GROUP_NOTES: Record<string, string> = {
  sales: 'บัญชีรายได้ / ปรับยอดขาย',
  purch: 'บัญชีคำนวณต้นทุนซื้อ',
  cogs: 'ต้นทุนขาย',
  sell: 'ค่าใช้จ่ายในการขาย',
  admin: 'ค่าใช้จ่ายในการบริหาร',
  other: 'รายได้อื่น',
}

export interface BookMeta {
  code: Book
  name: string
  shortName: string
  abbr: string
  desc: string
  rule: string
  colorVar: string
  softVar: string
  hex: string
}

export const BOOK_ORDER: Book[] = ['PUR', 'SAL', 'REC', 'PAY', 'JNL']

export const BOOKS: Record<Book, BookMeta> = {
  PUR: {
    code: 'PUR',
    name: 'สมุดรายวันซื้อ',
    shortName: 'รายวันซื้อ',
    abbr: 'รซ',
    desc: 'บันทึกการซื้อสินค้าเพื่อขายเป็นเงินเชื่อเท่านั้น',
    rule: 'เดบิต ซื้อสินค้า (502) · เครดิต เจ้าหนี้การค้า (201) + ระบุชื่อเจ้าหนี้',
    colorVar: 'var(--j-pur)',
    softVar: 'var(--j-pur-soft)',
    hex: '#b45309',
  },
  SAL: {
    code: 'SAL',
    name: 'สมุดรายวันขาย',
    shortName: 'รายวันขาย',
    abbr: 'รข',
    desc: 'บันทึกการขายสินค้าเป็นเงินเชื่อเท่านั้น',
    rule: 'เดบิต ลูกหนี้การค้า (110) + ระบุชื่อลูกหนี้ · เครดิต ขายสินค้า (401)',
    colorVar: 'var(--j-sal)',
    softVar: 'var(--j-sal-soft)',
    hex: '#047857',
  },
  REC: {
    code: 'REC',
    name: 'สมุดรายวันรับเงิน',
    shortName: 'รายวันรับเงิน',
    abbr: 'รร',
    desc: 'บันทึกรายการรับเงินสดทุกกรณี (ขายสด รับชำระหนี้ ลงทุน มัดจำ รายได้อื่น)',
    rule: 'เดบิต เงินสด (101) [และส่วนลดจ่าย 403] · เครดิต ลูกหนี้ / ขาย / บัญชีอื่น ๆ',
    colorVar: 'var(--j-rec)',
    softVar: 'var(--j-rec-soft)',
    hex: '#1d4ed8',
  },
  PAY: {
    code: 'PAY',
    name: 'สมุดรายวันจ่ายเงิน',
    shortName: 'รายวันจ่ายเงิน',
    abbr: 'รจ',
    desc: 'บันทึกรายการจ่ายเงินสดทุกกรณี (ชำระเจ้าหนี้ ค่าใช้จ่าย ซื้อสินทรัพย์ ถอนใช้ส่วนตัว)',
    rule: 'เดบิต เจ้าหนี้ / ค่าใช้จ่าย / บัญชีอื่น ๆ · เครดิต เงินสด (101) [และส่วนลดรับ 504]',
    colorVar: 'var(--j-pay)',
    softVar: 'var(--j-pay-soft)',
    hex: '#be123c',
  },
  JNL: {
    code: 'JNL',
    name: 'สมุดรายวันทั่วไป',
    shortName: 'รายวันทั่วไป',
    abbr: 'รว',
    desc: 'บันทึกรายการที่ไม่เข้าสมุดเฉพาะ 4 เล่ม (ส่งคืน/รับคืนสินค้า ปรับปรุง ปิดบัญชี)',
    rule: 'บันทึกคู่บัญชีเดบิต–เครดิตอิสระ (ห้ามลงเงินสดในสมุดนี้)',
    colorVar: 'var(--j-jnl)',
    softVar: 'var(--j-jnl-soft)',
    hex: '#6d28d9',
  },
}

export const DEFAULT_ACCOUNTS: Account[] = [
  { code: '101', name: 'เงินสด', type: 'asset', normal: 'dr', group: '', note: 'สินทรัพย์หมุนเวียน' },
  { code: '110', name: 'ลูกหนี้การค้า', type: 'asset', normal: 'dr', group: '', note: 'บัญชีคุมลูกหนี้' },
  { code: '120', name: 'วัสดุสำนักงาน', type: 'asset', normal: 'dr', group: '', note: 'สินทรัพย์หมุนเวียน' },
  { code: '140', name: 'อุปกรณ์สำนักงาน', type: 'asset', normal: 'dr', group: '', note: 'สินทรัพย์ไม่หมุนเวียน' },
  { code: '145', name: 'ค่าเสื่อมสะสม—อุปกรณ์', type: 'asset', normal: 'cr', group: '', note: 'บัญชีปรับมูลค่าสินทรัพย์' },
  { code: '150', name: 'สินค้าคงเหลือ', type: 'asset', normal: 'dr', group: '', note: 'สินค้าคงเหลือแบบสิ้นงวด' },
  { code: '201', name: 'เจ้าหนี้การค้า', type: 'liability', normal: 'cr', group: '', note: 'บัญชีคุมเจ้าหนี้' },
  { code: '210', name: 'เงินเดือนค้างจ่าย', type: 'liability', normal: 'cr', group: '', note: 'หนี้สินหมุนเวียน' },
  { code: '220', name: 'ค่าสาธารณูปโภคค้างจ่าย', type: 'liability', normal: 'cr', group: '', note: 'หนี้สินหมุนเวียน' },
  { code: '240', name: 'รายได้รับล่วงหน้า', type: 'liability', normal: 'cr', group: '', note: 'เงินมัดจำรับจากลูกค้า' },
  { code: '301', name: 'ทุน—คุณแมวน้ำ', type: 'equity', normal: 'cr', group: '', note: 'ทุนเจ้าของกิจการ' },
  { code: '310', name: 'ถอนใช้ส่วนตัว', type: 'equity', normal: 'dr', group: '', note: 'บัญชีปรับลดทุน' },
  { code: '401', name: 'ขายสินค้า', type: 'revenue', normal: 'cr', group: 'sales', note: 'รายได้หลัก' },
  { code: '402', name: 'รับคืนสินค้าขาย', type: 'revenue', normal: 'dr', group: 'sales', note: 'บัญชีปรับลดยอดขาย' },
  { code: '403', name: 'ส่วนลดจ่าย', type: 'revenue', normal: 'dr', group: 'sales', note: 'บัญชีปรับลดยอดขาย' },
  { code: '420', name: 'รายได้อื่น', type: 'revenue', normal: 'cr', group: 'other', note: 'รายได้นอกการดำเนินงาน' },
  { code: '501', name: 'ต้นทุนขาย', type: 'expense', normal: 'dr', group: 'cogs', note: 'คำนวณเมื่อปิดบัญชีสินค้า' },
  { code: '502', name: 'ซื้อสินค้า', type: 'expense', normal: 'dr', group: 'purch', note: 'ซื้อสินค้าเพื่อขาย' },
  { code: '503', name: 'ส่งคืนสินค้าซื้อ', type: 'expense', normal: 'cr', group: 'purch', note: 'บัญชีปรับลดยอดซื้อ' },
  { code: '504', name: 'ส่วนลดรับ', type: 'expense', normal: 'cr', group: 'purch', note: 'บัญชีปรับลดยอดซื้อ' },
  { code: '505', name: 'ค่าขนส่งเข้า', type: 'expense', normal: 'dr', group: 'purch', note: 'ต้นทุนซื้อสินค้า' },
  { code: '520', name: 'เงินเดือนฝ่ายขาย', type: 'expense', normal: 'dr', group: 'sell', note: 'ค่าใช้จ่ายในการขาย' },
  { code: '521', name: 'ค่าขนส่งออก', type: 'expense', normal: 'dr', group: 'sell', note: 'ค่าใช้จ่ายในการขาย' },
  { code: '522', name: 'ค่าโฆษณา', type: 'expense', normal: 'dr', group: 'sell', note: 'ค่าใช้จ่ายในการขาย' },
  { code: '530', name: 'เงินเดือนสำนักงาน', type: 'expense', normal: 'dr', group: 'admin', note: 'ค่าใช้จ่ายในการบริหาร' },
  { code: '531', name: 'ค่าเช่า', type: 'expense', normal: 'dr', group: 'admin', note: 'ค่าใช้จ่ายในการบริหาร' },
  { code: '532', name: 'ค่าสาธารณูปโภค', type: 'expense', normal: 'dr', group: 'admin', note: 'ค่าใช้จ่ายในการบริหาร' },
  { code: '533', name: 'ค่าวัสดุสำนักงาน', type: 'expense', normal: 'dr', group: 'admin', note: 'ค่าใช้จ่ายในการบริหาร' },
  { code: '534', name: 'ค่าเสื่อมราคา—อุปกรณ์', type: 'expense', normal: 'dr', group: 'admin', note: 'ค่าใช้จ่ายในการบริหาร' },
]

export const DEFAULT_PARTIES: Party[] = [
  { id: 'AR-01', kind: 'debtor', name: 'ร้านซีค้าขาย', terms: '2/10, n/30' },
  { id: 'AR-02', kind: 'debtor', name: 'คุณดีใจ', terms: 'n/30' },
  { id: 'AR-03', kind: 'debtor', name: 'ร้านอีสเตชั่น', terms: '2/10, n/30' },
  { id: 'AP-01', kind: 'creditor', name: 'บ.เอเทรดดิ้ง จำกัด', terms: '2/10, n/30' },
  { id: 'AP-02', kind: 'creditor', name: 'ห้างบีซัพพลาย', terms: 'n/30' },
]

export function findAccount(accounts: Account[], code: string): Account | undefined {
  return accounts.find((a) => a.code === code)
}

export function accountName(accounts: Account[], code: string): string {
  return accounts.find((a) => a.code === code)?.name ?? code
}

export function partyName(parties: Party[], id?: string): string {
  if (!id) return ''
  return parties.find((p) => p.id === id)?.name ?? id
}
