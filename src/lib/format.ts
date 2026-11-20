export const MONTHS_TH = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
]

export const MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
]

/** แปลงสตางค์ (จำนวนเต็ม) เป็นบาทแบบตัวเลขทศนิยม 2 ตำแหน่ง */
export function satangToBaht(satang: number): number {
  return Math.round(satang) / 100
}

/** แปลงบาท (string/number) เป็นสตางค์ (จำนวนเต็ม) */
export function bahtToSatang(baht: number | string): number {
  const n = typeof baht === 'string' ? Number(baht.replace(/,/g, '').trim()) : baht
  if (!Number.isFinite(n)) return Number.NaN
  return Math.round(n * 100)
}

/** แสดงจำนวนเงิน (รับหน่วยสตางค์) แบบมาตรฐานบัญชี — ค่าติดลบใส่วงเล็บ */
export function formatMoney(satang: number, opts?: { blankZero?: boolean }): string {
  const rounded = Math.round(satang || 0)
  if (opts?.blankZero && rounded === 0) return ''
  const baht = Math.abs(rounded) / 100
  const formatted = baht.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return rounded < 0 ? `(${formatted})` : formatted
}

/** แสดงจำนวนเงินแบบย่อ (รับหน่วยสตางค์) */
export function formatCompact(satang: number): string {
  const baht = Math.round(satang || 0) / 100
  return new Intl.NumberFormat('th-TH', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(baht)
}

/** แสดงวันที่แบบสั้น พ.ศ. เช่น 2 ต.ค. 2569 */
export function formatDateShort(iso: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '-'
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS_SHORT[m - 1]} ${y + 543}`
}

/** แสดงวันที่แบบเต็ม พ.ศ. เช่น 31 ตุลาคม 2569 */
export function formatDateLong(iso: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '-'
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS_TH[m - 1]} ${y + 543}`
}

/** แสดงชื่องวด เช่น ตุลาคม 2569 */
export function formatPeriodLabel(ym: string): string {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return ym || '-'
  const [y, m] = ym.split('-').map(Number)
  return `${MONTHS_TH[m - 1]} ${y + 543}`
}

/** วันสุดท้ายของงวด YYYY-MM -> YYYY-MM-DD */
export function periodEnd(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return `${ym}-${String(lastDay).padStart(2, '0')}`
}

/** วันแรกของงวด YYYY-MM -> YYYY-MM-01 */
export function periodStart(ym: string): string {
  return `${ym}-01`
}

/** วันสุดท้ายของเดือนก่อนหน้า YYYY-MM -> YYYY-MM-DD */
export function periodPrevEnd(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1, 0)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** เวลาปัจจุบันแบบไทย เช่น 21 พ.ย. 2569 00:30 น. */
export function formatTimestamp(date = new Date()): string {
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear() + 543} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} น.`
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}
