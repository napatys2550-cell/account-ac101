import { useState } from 'react'
import { Calculator, CheckCircle2 } from 'lucide-react'
import { ACC, buildMerchStatement, type JournalLine } from '@/lib/accounting'
import { bahtToSatang, formatMoney, formatPeriodLabel, periodEnd, satangToBaht } from '@/lib/format'
import { useBooks } from '@/store/useBooks'
import { Banner, Button, Modal } from '@/components/ui/primitives'
import { toast } from '@/components/ui/MotionToast'

export function ClosingInventoryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { entries, accounts, company, postClosingInventory } = useBooks()
  const merch = buildMerchStatement(entries, accounts, company.period)
  const [endingInput, setEndingInput] = useState(String(satangToBaht(merch.ending) || 45000))

  const endingSatang = Math.max(0, bahtToSatang(endingInput) || 0)
  const cogsSatang = Math.max(0, merch.available - endingSatang)

  const handleApply = () => {
    const cogsLines: JournalLine[] = []
    const netTransfer = merch.purch + merch.fin - merch.pret - merch.pdisc
    if (netTransfer > 0) cogsLines.push({ account: ACC.COGS, dr: netTransfer, cr: 0, column: 'general' })
    if (merch.pret > 0) cogsLines.push({ account: ACC.PURCH_RET, dr: merch.pret, cr: 0, column: 'general' })
    if (merch.pdisc > 0) cogsLines.push({ account: ACC.DISC_RECEIVED, dr: merch.pdisc, cr: 0, column: 'general' })
    if (merch.purch > 0) cogsLines.push({ account: ACC.PURCHASE, dr: 0, cr: merch.purch, column: 'general' })
    if (merch.fin > 0) cogsLines.push({ account: ACC.FREIGHT_IN, dr: 0, cr: merch.fin, column: 'general' })

    const invLines: JournalLine[] = [
      { account: ACC.INVENTORY, dr: endingSatang, cr: 0, column: 'general' },
      { account: ACC.COGS, dr: 0, cr: endingSatang, column: 'general' },
    ]

    postClosingInventory({
      period: company.period,
      endingBaht: satangToBaht(endingSatang),
      cogsLines,
      invLines,
      date: periodEnd(company.period),
    })
    toast.saved(`ปิดบัญชีสินค้าปลายงวด ${formatMoney(endingSatang)} บาทแล้ว`)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="ปิดบัญชีสินค้าคงเหลือปลายงวด (Periodic)"
      subtitle={`งวดบัญชี ${formatPeriodLabel(company.period)} · สร้างรายการโอนต้นทุนขายอัตโนมัติในสมุดรายวันทั่วไป`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button variant="accent" onClick={handleApply} disabled={merch.costPurch <= 0}>
            <CheckCircle2 className="h-4 w-4" /> บันทึกปิดบัญชีสินค้า
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Banner
          variant={merch.closed ? 'ok' : 'warn'}
          title={
            merch.closed
              ? 'งวดนี้ปิดบัญชีสินค้าไว้แล้ว (บันทึกใหม่จะแทนที่รายการปิดเดิม)'
              : 'งวดนี้ยังไม่ได้ปิดบัญชีสินค้าคงเหลือปลายงวด'
          }
        />

        <div>
          <label className="mb-1 block text-[13px] font-semibold text-[var(--mu)]">
            มูลค่าสินค้าคงเหลือปลายงวดที่ตรวจนับได้ (บาท)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={endingInput}
            onChange={(e) => setEndingInput(e.target.value)}
            className="h-[40px] w-full rounded-[8px] border border-[var(--bd)] bg-[var(--sf)] px-3 font-mono text-[15px] font-semibold text-[var(--ink)]"
          />
        </div>

        <div className="rounded-[9px] border border-[var(--bd)] bg-[var(--sf2)] p-3.5 text-[13.5px]">
          <div className="mb-2 flex items-center gap-1.5 font-bold text-[var(--ink)]">
            <Calculator className="h-4 w-4 text-[var(--mu)]" /> สรุปการคำนวณต้นทุนขาย
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[var(--mu)]">สินค้าคงเหลือต้นงวด</span>
              <span className="font-mono">{formatMoney(merch.beg)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--mu)]">บวก ต้นทุนซื้อสุทธิ (ซื้อ − ส่งคืน − ส่วนลดรับ + ขนส่งเข้า)</span>
              <span className="font-mono">{formatMoney(merch.costPurch)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>สินค้าที่มีไว้เพื่อขาย</span>
              <span className="font-mono">{formatMoney(merch.available)}</span>
            </div>
            <div className="flex justify-between text-[var(--mu)]">
              <span>หัก สินค้าคงเหลือปลายงวด (ตรวจนับ)</span>
              <span className="font-mono">({formatMoney(endingSatang)})</span>
            </div>
            <div className="flex justify-between border-t border-[var(--bd)] pt-2 text-[15px] font-bold">
              <span>ต้นทุนขายประจำงวด</span>
              <span className="font-mono">{formatMoney(cogsSatang)}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
