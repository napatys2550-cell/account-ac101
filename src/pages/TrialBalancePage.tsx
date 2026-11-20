import { useMemo } from 'react'
import { FileSpreadsheet, FlaskConical, Trash2 } from 'lucide-react'
import {
  ACC,
  buildGeneralLedger,
  buildTrialBalance,
  collectWarnings,
  reconcile,
} from '@/lib/accounting'
import { formatDateLong, formatMoney, periodEnd } from '@/lib/format'
import { useBooks } from '@/store/useBooks'
import { Badge, Banner, Button, Card } from '@/components/ui/primitives'
import { toast } from '@/components/ui/MotionToast'

export function TrialBalancePage({ onQuickExport }: { onQuickExport: () => void }) {
  const { company, accounts, parties, entries, addEntry, deleteEntries } = useBooks()
  const end = periodEnd(company.period)

  const gl = useMemo(() => buildGeneralLedger(entries, accounts, { upto: end }), [entries, accounts, end])
  const tb = useMemo(() => buildTrialBalance(gl, accounts), [gl, accounts])
  const ar = useMemo(() => reconcile(gl, entries, parties, 'debtor', { upto: end }), [gl, entries, parties, end])
  const ap = useMemo(() => reconcile(gl, entries, parties, 'creditor', { upto: end }), [gl, entries, parties, end])
  const warnings = useMemo(() => collectWarnings(tb, ar, ap), [tb, ar, ap])

  const testEntries = entries.filter((e) => e.isTest)

  const handleInjectTestError = () => {
    addEntry({
      book: 'JNL',
      date: end,
      description: 'ทดสอบระบบ (ข้อ 5.6): รายการไม่สมดุล เดบิต 5,000 ≠ เครดิต 3,000',
      reason: 'รายการทดสอบระบบเพื่อตรวจสอบการแจ้งเตือนงบทดลองไม่สมดุล',
      isTest: true,
      lines: [
        { account: ACC.SUPPLIES_EXP, dr: 500000, cr: 0, column: 'general' },
        { account: ACC.SUPPLIES, dr: 0, cr: 300000, column: 'general' },
      ],
    })
    toast.warn('เพิ่มรายการทดสอบไม่สมดุล (ผลต่าง 2,000.00 บาท) แล้ว')
  }

  const handleClearTestEntries = () => {
    deleteEntries(testEntries.map((e) => e.id))
    toast.success('ลบรายการทดสอบทั้งหมดแล้ว งบทดลองกลับสู่ภาวะสมดุล')
  }

  return (
    <div className="space-y-3.5">
      <Card>
        {/* Official 3-line Accounting Header */}
        <div className="mb-4 border-b border-[var(--bd)] pb-3 text-center">
          <div className="text-[14px] font-semibold text-[var(--mu)]">
            {company.name} ({company.businessType})
          </div>
          <h2 className="mt-0.5 text-[20px] font-bold text-[var(--ink)]">งบทดลอง (Trial Balance)</h2>
          <div className="text-[13px] text-[var(--mu)]">ณ วันที่ {formatDateLong(end)}</div>
        </div>

        {/* Actions */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[12.5px] text-[var(--mu)]">
            ตรวจสอบแล้วทั้งหมด <b>{entries.length}</b> รายการ · บัญชีที่มีคงเหลือ <b>{tb.rows.length}</b> บัญชี
          </div>
          <div className="flex flex-wrap gap-2">
            {testEntries.length > 0 ? (
              <Button variant="danger" size="sm" onClick={handleClearTestEntries}>
                <Trash2 className="h-3.5 w-3.5" /> ลบรายการทดสอบ ({testEntries.length})
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={handleInjectTestError}>
                <FlaskConical className="h-3.5 w-3.5" /> ทดสอบงบไม่ดุล (ข้อ 5.6)
              </Button>
            )}
            <Button size="sm" onClick={onQuickExport}>
              <FileSpreadsheet className="h-3.5 w-3.5" /> ส่งออกงบทดลองทางการ
            </Button>
          </div>
        </div>

        {/* Diagnostic Warnings */}
        {entries.length === 0 ? (
          <Banner variant="muted" title="ยังไม่มีข้อมูลสำหรับออกงบทดลอง" />
        ) : (
          warnings.map((w) => (
            <Banner
              key={w.code}
              variant={w.level === 'error' ? 'bad' : w.level === 'warning' ? 'warn' : 'ok'}
              title={w.amount ? `${w.title} (ผลต่าง ${formatMoney(w.amount)} บาท)` : w.title}
              detail={w.detail}
            />
          ))
        )}

        {/* Trial Balance Table */}
        <div className="overflow-x-auto">
          <table className="acct-table min-w-[520px]">
            <thead>
              <tr>
                <th className="w-[90px]">เลขที่บัญชี</th>
                <th>ชื่อบัญชี</th>
                <th className="num w-[150px]">เดบิต</th>
                <th className="num w-[150px]">เครดิต</th>
              </tr>
            </thead>
            <tbody>
              {tb.rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-[var(--mu)]">
                    — ไม่มีรายการ —
                  </td>
                </tr>
              ) : (
                tb.rows.map((r) => (
                  <tr key={r.code}>
                    <td className="font-mono text-[12px] font-semibold">{r.code}</td>
                    <td>
                      <span className="font-medium text-[var(--ink)]">{r.name}</span>
                      {r.wrongSide && (
                        <Badge variant="warn" className="ml-2">
                          ยอดผิดด้าน
                        </Badge>
                      )}
                    </td>
                    <td className="num">{r.dr ? formatMoney(r.dr) : ''}</td>
                    <td className="num">{r.cr ? formatMoney(r.cr) : ''}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>รวมทั้งสิ้น</td>
                <td className="num">{formatMoney(tb.totalDr)}</td>
                <td className="num">{formatMoney(tb.totalCr)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  )
}
