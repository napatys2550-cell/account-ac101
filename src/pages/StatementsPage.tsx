import { useState } from 'react'
import { Calculator, FileSpreadsheet } from 'lucide-react'
import { buildBalanceSheet, buildMerchStatement } from '@/lib/accounting'
import { formatDateLong, formatMoney, formatPeriodLabel, periodEnd } from '@/lib/format'
import { useBooks } from '@/store/useBooks'
import { Banner, Button, Card } from '@/components/ui/primitives'

export function StatementsPage({
  onOpenClosing,
  onQuickExport,
}: {
  onOpenClosing: () => void
  onQuickExport: () => void
}) {
  const { company, accounts, entries } = useBooks()
  const [subTab, setSubTab] = useState<'income' | 'balance'>('income')

  const end = periodEnd(company.period)
  const merch = buildMerchStatement(entries, accounts, company.period)
  const bs = buildBalanceSheet(entries, accounts, end, company.owner)

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-[8px] border border-[var(--bd)] bg-[var(--sf)] p-1 text-[13px] font-semibold shadow-[var(--sh)]">
          <button
            type="button"
            onClick={() => setSubTab('income')}
            className={`rounded-[6px] px-3.5 py-1.5 transition ${
              subTab === 'income' ? 'bg-[var(--ink)] text-[var(--sf)]' : 'text-[var(--mu)] hover:text-[var(--ink)]'
            }`}
          >
            งบกำไรขาดทุน (หลายขั้นตอน)
          </button>
          <button
            type="button"
            onClick={() => setSubTab('balance')}
            className={`rounded-[6px] px-3.5 py-1.5 transition ${
              subTab === 'balance' ? 'bg-[var(--ink)] text-[var(--sf)]' : 'text-[var(--mu)] hover:text-[var(--ink)]'
            }`}
          >
            งบแสดงฐานะการเงิน
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={onOpenClosing}>
            <Calculator className="h-3.5 w-3.5" /> ปิดบัญชีสินค้าปลายงวด
          </Button>
          <Button size="sm" onClick={onQuickExport}>
            <FileSpreadsheet className="h-3.5 w-3.5" /> ส่งออกงบการเงินทางการ
          </Button>
        </div>
      </div>

      {subTab === 'income' ? (
        <Card>
          <div className="mb-4 border-b border-[var(--bd)] pb-3 text-center">
            <div className="text-[14px] font-semibold text-[var(--mu)]">{company.name}</div>
            <h2 className="mt-0.5 text-[20px] font-bold text-[var(--ink)]">งบกำไรขาดทุน (แบบหลายขั้นตอน)</h2>
            <div className="text-[13px] text-[var(--mu)]">
              สำหรับงวด 1 เดือน สิ้นสุดวันที่ {formatDateLong(end)} ({formatPeriodLabel(company.period)})
            </div>
          </div>

          {!merch.closed && (
            <Banner
              variant="warn"
              title="ยังไม่ได้ปิดบัญชีสินค้าคงเหลือปลายงวด"
              detail="กดปุ่ม 'ปิดบัญชีสินค้าปลายงวด' เพื่อบันทึกมูลค่าสินค้าที่ตรวจนับได้และคำนวณต้นทุนขายอย่างถูกต้อง"
            />
          )}

          <div className="overflow-x-auto">
            <table className="acct-table min-w-[480px]">
              <tbody>
                <tr className="bg-[var(--sf2)]">
                  <td colSpan={2} className="font-bold">รายได้จากการขาย</td>
                </tr>
                <tr>
                  <td className="pl-6">ขายสินค้า</td>
                  <td className="num">{formatMoney(merch.sales)}</td>
                </tr>
                <tr>
                  <td className="pl-10 text-[var(--mu)]">หัก รับคืนสินค้าขาย</td>
                  <td className="num text-[var(--mu)]">{formatMoney(-merch.sret)}</td>
                </tr>
                <tr>
                  <td className="pl-10 text-[var(--mu)]">หัก ส่วนลดจ่าย</td>
                  <td className="num text-[var(--mu)]">{formatMoney(-merch.sdisc)}</td>
                </tr>
                <tr className="font-bold">
                  <td>ยอดขายสุทธิ</td>
                  <td className="num">{formatMoney(merch.netSales)}</td>
                </tr>

                <tr className="bg-[var(--sf2)]">
                  <td colSpan={2} className="font-bold">ต้นทุนขายสินค้า (วิธีสิ้นงวด Periodic)</td>
                </tr>
                <tr>
                  <td className="pl-6">สินค้าคงเหลือต้นงวด</td>
                  <td className="num">{formatMoney(merch.beg)}</td>
                </tr>
                <tr>
                  <td className="pl-6">ซื้อสินค้า</td>
                  <td className="num">{formatMoney(merch.purch)}</td>
                </tr>
                <tr>
                  <td className="pl-10 text-[var(--mu)]">หัก ส่งคืนสินค้าซื้อ</td>
                  <td className="num text-[var(--mu)]">{formatMoney(-merch.pret)}</td>
                </tr>
                <tr>
                  <td className="pl-10 text-[var(--mu)]">หัก ส่วนลดรับ</td>
                  <td className="num text-[var(--mu)]">{formatMoney(-merch.pdisc)}</td>
                </tr>
                <tr>
                  <td className="pl-6">ซื้อสุทธิ</td>
                  <td className="num">{formatMoney(merch.netPurch)}</td>
                </tr>
                <tr>
                  <td className="pl-6">บวก ค่าขนส่งเข้า</td>
                  <td className="num">{formatMoney(merch.fin)}</td>
                </tr>
                <tr>
                  <td className="pl-6">สินค้าที่มีไว้เพื่อขาย</td>
                  <td className="num">{formatMoney(merch.available)}</td>
                </tr>
                <tr>
                  <td className="pl-10 text-[var(--mu)]">หัก สินค้าคงเหลือปลายงวด</td>
                  <td className="num text-[var(--mu)]">{formatMoney(-merch.ending)}</td>
                </tr>
                <tr className="font-bold">
                  <td>ต้นทุนขาย</td>
                  <td className="num">{formatMoney(merch.cogs)}</td>
                </tr>
                <tr className="font-bold">
                  <td>กำไรขั้นต้น</td>
                  <td className="num">{formatMoney(merch.gross)}</td>
                </tr>

                <tr className="bg-[var(--sf2)]">
                  <td colSpan={2} className="font-bold">ค่าใช้จ่ายในการขาย</td>
                </tr>
                {merch.sell.map((r) => (
                  <tr key={r.code}>
                    <td className="pl-6">{r.name}</td>
                    <td className="num">{formatMoney(r.amount)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="pl-6">รวมค่าใช้จ่ายในการขาย</td>
                  <td className="num">{formatMoney(merch.sellTotal)}</td>
                </tr>

                <tr className="bg-[var(--sf2)]">
                  <td colSpan={2} className="font-bold">ค่าใช้จ่ายในการบริหาร</td>
                </tr>
                {merch.admin.map((r) => (
                  <tr key={r.code}>
                    <td className="pl-6">{r.name}</td>
                    <td className="num">{formatMoney(r.amount)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="pl-6">รวมค่าใช้จ่ายในการบริหาร</td>
                  <td className="num">{formatMoney(merch.adminTotal)}</td>
                </tr>

                <tr className="font-bold">
                  <td>กำไรจากการดำเนินงาน</td>
                  <td className="num">{formatMoney(merch.operating)}</td>
                </tr>
                <tr>
                  <td className="pl-6">บวก รายได้อื่น</td>
                  <td className="num">{formatMoney(merch.other)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td>กำไรสุทธิประจำงวด</td>
                  <td className="num">{formatMoney(merch.netIncome)}</td>
                </tr>
                <tr className="sub-foot">
                  <td className="text-[var(--mu)]">อัตรากำไรขั้นต้น / อัตรากำไรสุทธิ</td>
                  <td className="num text-[var(--mu)]">
                    {merch.grossMargin.toFixed(2)}% / {merch.netMargin.toFixed(2)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="mb-4 border-b border-[var(--bd)] pb-3 text-center">
            <div className="text-[14px] font-semibold text-[var(--mu)]">{company.name}</div>
            <h2 className="mt-0.5 text-[20px] font-bold text-[var(--ink)]">งบแสดงฐานะการเงิน</h2>
            <div className="text-[13px] text-[var(--mu)]">ณ วันที่ {formatDateLong(end)}</div>
          </div>

          <Banner
            variant={bs.balanced ? 'ok' : 'bad'}
            title={
              bs.balanced
                ? `สมการบัญชีสมดุล: สินทรัพย์ = หนี้สิน + ส่วนของเจ้าของ = ${formatMoney(bs.totalAssets)} บาท`
                : `งบแสดงฐานะการเงินไม่สมดุล: สินทรัพย์ ${formatMoney(bs.totalAssets)} ≠ หนี้สิน+ทุน ${formatMoney(bs.totalLiabilities + bs.totalEquity)}`
            }
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="overflow-x-auto">
              <table className="acct-table">
                <thead>
                  <tr>
                    <th colSpan={2}>สินทรัพย์</th>
                  </tr>
                </thead>
                <tbody>
                  {bs.assets.map((a) => (
                    <tr key={a.code}>
                      <td className={a.amount < 0 ? 'pl-6 text-[var(--mu)]' : 'pl-4'}>
                        <span className="mr-1.5 font-mono text-[11.5px] text-[var(--ft)]">{a.code}</span>
                        {a.name}
                      </td>
                      <td className="num">{formatMoney(a.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>รวมสินทรัพย์</td>
                    <td className="num">{formatMoney(bs.totalAssets)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="space-y-4 overflow-x-auto">
              <table className="acct-table">
                <thead>
                  <tr>
                    <th colSpan={2}>หนี้สิน</th>
                  </tr>
                </thead>
                <tbody>
                  {bs.liabilities.map((l) => (
                    <tr key={l.code}>
                      <td className="pl-4">
                        <span className="mr-1.5 font-mono text-[11.5px] text-[var(--ft)]">{l.code}</span>
                        {l.name}
                      </td>
                      <td className="num">{formatMoney(l.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="sub-foot">
                    <td>รวมหนี้สิน</td>
                    <td className="num">{formatMoney(bs.totalLiabilities)}</td>
                  </tr>
                </tfoot>
              </table>

              <table className="acct-table">
                <thead>
                  <tr>
                    <th colSpan={2}>ส่วนของเจ้าของ</th>
                  </tr>
                </thead>
                <tbody>
                  {bs.equity.map((eq) => (
                    <tr key={eq.name}>
                      <td className={eq.amount < 0 ? 'pl-6 text-[var(--mu)]' : 'pl-4'}>{eq.name}</td>
                      <td className="num">{formatMoney(eq.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="sub-foot">
                    <td>รวมส่วนของเจ้าของ</td>
                    <td className="num">{formatMoney(bs.totalEquity)}</td>
                  </tr>
                  <tr>
                    <td>รวมหนี้สินและส่วนของเจ้าของ</td>
                    <td className="num">{formatMoney(bs.totalLiabilities + bs.totalEquity)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
