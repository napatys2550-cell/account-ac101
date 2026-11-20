import { ACC } from './chart'
import type { Book, Column, Entry, JournalLine } from './types'

const S = (baht: number) => Math.round(baht * 100)

const L = (
  account: string,
  drBaht: number,
  crBaht: number,
  column: Column,
  partyId?: string,
): JournalLine => ({
  account,
  dr: S(drBaht),
  cr: S(crBaht),
  column,
  ...(partyId ? { partyId } : {}),
})

/**
 * ชุดรายการค้าตัวอย่างของร้านเครื่องเขียนคุณแมวน้ำ (กิจการสมมติ งวดตุลาคม 2569)
 * ครบทั้ง 5 สมุดรายวัน (29 รายการ) พร้อมเหตุผลประกอบการเลือกสมุด และรหัสลูกหนี้/เจ้าหนี้ครบถ้วน
 */
export function createSampleEntries(): Entry[] {
  const raw: Array<{
    date: string
    book: Book
    description: string
    reason: string
    terms?: string
    lines: JournalLine[]
    closing?: boolean
  }> = [
    {
      date: '2026-10-01',
      book: 'REC',
      description: 'เจ้าของนำเงินสดมาลงทุนเปิดร้าน',
      reason: 'มีการรับเงินสดเข้ากิจการ (ลงทุน) จึงบันทึกในสมุดรายวันรับเงิน',
      lines: [L(ACC.CASH, 400000, 0, 'cash'), L(ACC.CAPITAL, 0, 400000, 'other')],
    },
    {
      date: '2026-10-01',
      book: 'PAY',
      description: 'จ่ายค่าเช่าร้านเดือนตุลาคม',
      reason: 'มีการจ่ายเงินสดเป็นค่าใช้จ่าย จึงบันทึกในสมุดรายวันจ่ายเงิน',
      lines: [L(ACC.RENT, 12000, 0, 'other'), L(ACC.CASH, 0, 12000, 'cash')],
    },
    {
      date: '2026-10-02',
      book: 'PUR',
      description: 'ซื้อเครื่องเขียนเป็นเงินเชื่อจาก บ.เอเทรดดิ้ง จำกัด',
      reason: 'ซื้อสินค้าเพื่อขายเป็นเงินเชื่อ จึงบันทึกในสมุดรายวันซื้อ',
      terms: '2/10, n/30',
      lines: [
        L(ACC.PURCHASE, 100000, 0, 'purchase'),
        L(ACC.AP, 0, 100000, 'ap', 'AP-01'),
      ],
    },
    {
      date: '2026-10-03',
      book: 'PAY',
      description: 'จ่ายค่าขนส่งเข้าของสินค้าที่ซื้อ',
      reason: 'มีการจ่ายเงินสดเป็นค่าขนส่งเข้า จึงบันทึกในสมุดรายวันจ่ายเงิน',
      lines: [L(ACC.FREIGHT_IN, 2000, 0, 'other'), L(ACC.CASH, 0, 2000, 'cash')],
    },
    {
      date: '2026-10-04',
      book: 'JNL',
      description: 'ส่งคืนสินค้าชำรุดให้ บ.เอเทรดดิ้ง จำกัด',
      reason: 'รายการส่งคืนสินค้าซื้อไม่มีเงินสดเข้าออก จึงบันทึกในสมุดรายวันทั่วไป',
      lines: [
        L(ACC.AP, 10000, 0, 'general', 'AP-01'),
        L(ACC.PURCH_RET, 0, 10000, 'general'),
      ],
    },
    {
      date: '2026-10-05',
      book: 'PUR',
      description: 'ซื้อกระดาษ–ปากกาเป็นเงินเชื่อจาก ห้างบีซัพพลาย',
      reason: 'ซื้อสินค้าเพื่อขายเป็นเงินเชื่อ จึงบันทึกในสมุดรายวันซื้อ',
      terms: 'n/30',
      lines: [
        L(ACC.PURCHASE, 60000, 0, 'purchase'),
        L(ACC.AP, 0, 60000, 'ap', 'AP-02'),
      ],
    },
    {
      date: '2026-10-06',
      book: 'SAL',
      description: 'ขายสินค้าเป็นเงินเชื่อให้ ร้านซีค้าขาย',
      reason: 'ขายสินค้าเป็นเงินเชื่อ จึงบันทึกในสมุดรายวันขาย',
      terms: '2/10, n/30',
      lines: [
        L(ACC.AR, 70000, 0, 'ar', 'AR-01'),
        L(ACC.SALES, 0, 70000, 'sales'),
      ],
    },
    {
      date: '2026-10-07',
      book: 'REC',
      description: 'ขายสินค้าหน้าร้านรับเงินสด',
      reason: 'ขายสินค้าได้รับเงินสดทันที จึงบันทึกในสมุดรายวันรับเงิน',
      lines: [L(ACC.CASH, 25000, 0, 'cash'), L(ACC.SALES, 0, 25000, 'sales')],
    },
    {
      date: '2026-10-08',
      book: 'PAY',
      description: 'ซื้อวัสดุสำนักงานจ่ายเงินสด',
      reason: 'ซื้อวัสดุสำนักงานด้วยเงินสด จึงบันทึกในสมุดรายวันจ่ายเงิน',
      lines: [L(ACC.SUPPLIES, 5000, 0, 'other'), L(ACC.CASH, 0, 5000, 'cash')],
    },
    {
      date: '2026-10-09',
      book: 'JNL',
      description: 'ร้านซีค้าขายส่งคืนสินค้าชำรุด',
      reason: 'รายการรับคืนสินค้าขายไม่กระทบเงินสด จึงบันทึกในสมุดรายวันทั่วไป',
      lines: [
        L(ACC.SALES_RET, 5000, 0, 'general'),
        L(ACC.AR, 0, 5000, 'general', 'AR-01'),
      ],
    },
    {
      date: '2026-10-10',
      book: 'REC',
      description: 'รับชำระหนี้จากร้านซีค้าขาย หักส่วนลดจ่าย 2%',
      reason: 'รับชำระหนี้เป็นเงินสดพร้อมส่วนลดจ่าย จึงบันทึกในสมุดรายวันรับเงิน',
      lines: [
        L(ACC.CASH, 63700, 0, 'cash'),
        L(ACC.DISC_ALLOWED, 1300, 0, 'discAllowed'),
        L(ACC.AR, 0, 65000, 'ar', 'AR-01'),
      ],
    },
    {
      date: '2026-10-12',
      book: 'PAY',
      description: 'จ่ายชำระหนี้ บ.เอเทรดดิ้ง จำกัด หักส่วนลดรับ 2%',
      reason: 'จ่ายชำระหนี้เป็นเงินสดพร้อมส่วนลดรับ จึงบันทึกในสมุดรายวันจ่ายเงิน',
      lines: [
        L(ACC.AP, 90000, 0, 'ap', 'AP-01'),
        L(ACC.CASH, 0, 88200, 'cash'),
        L(ACC.DISC_RECEIVED, 0, 1800, 'discReceived'),
      ],
    },
    {
      date: '2026-10-13',
      book: 'PAY',
      description: 'ซื้ออุปกรณ์สำนักงาน (ชั้นวาง–เครื่องคิดเงิน) เงินสด',
      reason: 'จ่ายเงินสดซื้อสินทรัพย์ถาวร จึงบันทึกในสมุดรายวันจ่ายเงิน',
      lines: [L(ACC.EQUIP, 60000, 0, 'other'), L(ACC.CASH, 0, 60000, 'cash')],
    },
    {
      date: '2026-10-15',
      book: 'SAL',
      description: 'ขายชุดเครื่องเขียนเป็นเงินเชื่อให้ คุณดีใจ',
      reason: 'ขายสินค้าเป็นเงินเชื่อ จึงบันทึกในสมุดรายวันขาย',
      terms: 'n/30',
      lines: [
        L(ACC.AR, 40000, 0, 'ar', 'AR-02'),
        L(ACC.SALES, 0, 40000, 'sales'),
      ],
    },
    {
      date: '2026-10-16',
      book: 'PAY',
      description: 'จ่ายค่าขนส่งออกส่งสินค้าให้ลูกค้า',
      reason: 'จ่ายเงินสดเป็นค่าขนส่งออก จึงบันทึกในสมุดรายวันจ่ายเงิน',
      lines: [L(ACC.FREIGHT_OUT, 1500, 0, 'other'), L(ACC.CASH, 0, 1500, 'cash')],
    },
    {
      date: '2026-10-18',
      book: 'REC',
      description: 'รับเงินมัดจำค่าสินค้าจากโรงเรียน',
      reason: 'รับเงินสดล่วงหน้าเป็นเงินมัดจำ จึงบันทึกในสมุดรายวันรับเงิน',
      lines: [L(ACC.CASH, 15000, 0, 'cash'), L(ACC.UNEARNED, 0, 15000, 'other')],
    },
    {
      date: '2026-10-20',
      book: 'PAY',
      description: 'จ่ายค่าโฆษณาโปรโมทร้าน',
      reason: 'จ่ายเงินสดเป็นค่าโฆษณา จึงบันทึกในสมุดรายวันจ่ายเงิน',
      lines: [L(ACC.ADVERTISING, 3000, 0, 'other'), L(ACC.CASH, 0, 3000, 'cash')],
    },
    {
      date: '2026-10-22',
      book: 'SAL',
      description: 'ขายสินค้าเป็นเงินเชื่อให้ ร้านอีสเตชั่น',
      reason: 'ขายสินค้าเป็นเงินเชื่อ จึงบันทึกในสมุดรายวันขาย',
      terms: '2/10, n/30',
      lines: [
        L(ACC.AR, 30000, 0, 'ar', 'AR-03'),
        L(ACC.SALES, 0, 30000, 'sales'),
      ],
    },
    {
      date: '2026-10-24',
      book: 'REC',
      description: 'ขายสินค้าหน้าร้านรับเงินสด',
      reason: 'ขายสินค้าได้รับเงินสดทันที จึงบันทึกในสมุดรายวันรับเงิน',
      lines: [L(ACC.CASH, 12000, 0, 'cash'), L(ACC.SALES, 0, 12000, 'sales')],
    },
    {
      date: '2026-10-26',
      book: 'PAY',
      description: 'จ่ายค่าสาธารณูปโภคเดือนตุลาคม',
      reason: 'จ่ายเงินสดเป็นค่าน้ำค่าไฟ จึงบันทึกในสมุดรายวันจ่ายเงิน',
      lines: [L(ACC.UTILITIES, 3200, 0, 'other'), L(ACC.CASH, 0, 3200, 'cash')],
    },
    {
      date: '2026-10-28',
      book: 'PAY',
      description: 'เจ้าของถอนเงินสดใช้ส่วนตัว',
      reason: 'มีการจ่ายเงินสดออกจากกิจการ จึงบันทึกในสมุดรายวันจ่ายเงิน',
      lines: [L(ACC.DRAWING, 10000, 0, 'other'), L(ACC.CASH, 0, 10000, 'cash')],
    },
    {
      date: '2026-10-29',
      book: 'REC',
      description: 'รับรายได้อื่น (ดอกเบี้ยเงินฝาก)',
      reason: 'รับเงินสดเป็นรายได้อื่น จึงบันทึกในสมุดรายวันรับเงิน',
      lines: [L(ACC.CASH, 500, 0, 'cash'), L(ACC.OTHER_REV, 0, 500, 'other')],
    },
    {
      date: '2026-10-30',
      book: 'JNL',
      description: 'ส่งมอบสินค้าตามมัดจำโรงเรียน รับรู้เป็นยอดขาย',
      reason: 'โอนรายได้รับล่วงหน้าเป็นยอดขาย ไม่มีเงินสดรับเพิ่ม จึงบันทึกในสมุดรายวันทั่วไป',
      lines: [L(ACC.UNEARNED, 15000, 0, 'general'), L(ACC.SALES, 0, 15000, 'general')],
    },
    {
      date: '2026-10-31',
      book: 'JNL',
      description: 'ปรับปรุง: วัสดุสำนักงานใช้ไป',
      reason: 'รายการปรับปรุงสิ้นงวด จึงบันทึกในสมุดรายวันทั่วไป',
      lines: [L(ACC.SUPPLIES_EXP, 3000, 0, 'general'), L(ACC.SUPPLIES, 0, 3000, 'general')],
    },
    {
      date: '2026-10-31',
      book: 'JNL',
      description: 'ปรับปรุง: ค่าเสื่อมราคาอุปกรณ์ 1 เดือน',
      reason: 'รายการปรับปรุงค่าเสื่อมราคาสิ้นงวด จึงบันทึกในสมุดรายวันทั่วไป',
      lines: [L(ACC.DEP_EXP, 1000, 0, 'general'), L(ACC.ACCUM_DEP, 0, 1000, 'general')],
    },
    {
      date: '2026-10-31',
      book: 'JNL',
      description: 'ปรับปรุง: เงินเดือนฝ่ายขายและสำนักงานค้างจ่าย',
      reason: 'รายการปรับปรุงค่าใช้จ่ายค้างจ่ายสิ้นงวด จึงบันทึกในสมุดรายวันทั่วไป',
      lines: [
        L(ACC.SAL_SALES, 12000, 0, 'general'),
        L(ACC.SAL_OFFICE, 8000, 0, 'general'),
        L(ACC.ACCRUED_SAL, 0, 20000, 'general'),
      ],
    },
    {
      date: '2026-10-31',
      book: 'JNL',
      description: 'ปรับปรุง: ค่าสาธารณูปโภคค้างจ่าย',
      reason: 'รายการปรับปรุงค่าใช้จ่ายค้างจ่ายสิ้นงวด จึงบันทึกในสมุดรายวันทั่วไป',
      lines: [L(ACC.UTILITIES, 800, 0, 'general'), L(ACC.ACCRUED_UTIL, 0, 800, 'general')],
    },
    {
      date: '2026-10-31',
      book: 'JNL',
      description: 'ปิดบัญชี: โอนซื้อ–ส่งคืน–ส่วนลดรับ–ขนส่งเข้า เข้าต้นทุนขาย',
      reason: 'รายการปิดบัญชีต้นทุนซื้อแบบสิ้นงวด (Periodic) จึงบันทึกในสมุดรายวันทั่วไป',
      closing: true,
      lines: [
        L(ACC.COGS, 150200, 0, 'general'),
        L(ACC.PURCH_RET, 10000, 0, 'general'),
        L(ACC.DISC_RECEIVED, 1800, 0, 'general'),
        L(ACC.PURCHASE, 0, 160000, 'general'),
        L(ACC.FREIGHT_IN, 0, 2000, 'general'),
      ],
    },
    {
      date: '2026-10-31',
      book: 'JNL',
      description: 'ปิดบัญชี: บันทึกสินค้าคงเหลือปลายงวด (ตรวจนับได้ 45,000 บาท)',
      reason: 'บันทึกสินค้าคงเหลือปลายงวดเพื่อหักออกจากต้นทุนขาย จึงบันทึกในสมุดรายวันทั่วไป',
      closing: true,
      lines: [L(ACC.INVENTORY, 45000, 0, 'general'), L(ACC.COGS, 0, 45000, 'general')],
    },
  ]

  const counts: Record<Book, number> = { PUR: 0, SAL: 0, REC: 0, PAY: 0, JNL: 0 }
  const baseTs = 1790812800000 // deterministic timestamp for stable sorting
  return raw.map((item, idx) => {
    counts[item.book] += 1
    return {
      id: `sample-${idx + 1}`,
      book: item.book,
      date: item.date,
      docNo: `${item.book}-${String(counts[item.book]).padStart(3, '0')}`,
      description: item.description,
      reason: item.reason,
      terms: item.terms,
      lines: item.lines,
      closing: item.closing,
      createdAt: baseTs + idx * 1000,
    }
  })
}
