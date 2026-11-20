import { useMemo, useState } from 'react'
import { CheckCircle2, FileSpreadsheet, Plus, Users } from 'lucide-react'
import {
  ACC,
  buildGeneralLedger,
  buildSubLedger,
  reconcile,
  type PartyKind,
} from '@/lib/accounting'
import { formatDateShort, formatMoney, periodEnd } from '@/lib/format'
import { useBooks } from '@/store/useBooks'
import { Badge, Banner, Button, Card, Modal } from '@/components/ui/primitives'
import { toast } from '@/components/ui/MotionToast'

export function SubLedgerPage({ onQuickExport }: { onQuickExport: () => void }) {
  const { entries, accounts, parties, company, addParty } = useBooks()
  const [kind, setKind] = useState<PartyKind>('debtor')
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTerms, setNewTerms] = useState('2/10, n/30')

  const end = periodEnd(company.period)
  const gl = useMemo(() => buildGeneralLedger(entries, accounts, { upto: end }), [entries, accounts, end])
  const rec = useMemo(() => reconcile(gl, entries, parties, kind, { upto: end }), [gl, entries, parties, kind, end])
  const sub = useMemo(() => buildSubLedger(entries, kind, { upto: end }), [entries, kind, end])

  const sign = kind === 'debtor' ? 1 : -1
  const controlCode = kind === 'debtor' ? ACC.AR : ACC.AP
  const controlLabel = kind === 'debtor' ? 'บัญชีคุมลูกหนี้การค้า (110)' : 'บัญชีคุมเจ้าหนี้การค้า (201)'

  const handleAddParty = () => {
    if (!newName.trim()) return
    const created = addParty({ kind, name: newName.trim(), terms: newTerms.trim() || 'n/30' })
    setNewName('')
    setAddOpen(false)
    toast.saved(`เพิ่ม${kind === 'debtor' ? 'ลูกหนี้' : 'เจ้าหนี้'} ${created.id} ${created.name} แล้ว`)
  }

  return (
    <div className="space-y-3.5">
      <Card>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[18px] font-bold text-[var(--ink)]">
              บัญชีแยกประเภทย่อยลูกหนี้การค้าและเจ้าหนี้การค้า
            </h2>
            <p className="text-[13px] text-[var(--mu)]">
              ผ่านรายการรายตัวอัตโนมัติและกระทบยอดกับบัญชีคุมในบัญชีแยกประเภททั่วไป
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-[8px] border border-[var(--bd)] bg-[var(--sf2)] p-0.5 text-[13px] font-semibold">
              <button
                type="button"
                onClick={() => setKind('debtor')}
                className={`rounded-[6px] px-3 py-1.5 transition ${
                  kind === 'debtor' ? 'bg-[var(--ink)] text-[var(--sf)]' : 'text-[var(--mu)]'
                }`}
              >
                บัญชีย่อยลูกหนี้ (110)
              </button>
              <button
                type="button"
                onClick={() => setKind('creditor')}
                className={`rounded-[6px] px-3 py-1.5 transition ${
                  kind === 'creditor' ? 'bg-[var(--ink)] text-[var(--sf)]' : 'text-[var(--mu)]'
                }`}
              >
                บัญชีย่อยเจ้าหนี้ (201)
              </button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> เพิ่ม{kind === 'debtor' ? 'ลูกหนี้' : 'เจ้าหนี้'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onQuickExport}>
              <FileSpreadsheet className="h-3.5 w-3.5" /> ส่งออก
            </Button>
          </div>
        </div>

        <Banner
          variant={rec.ok ? 'ok' : 'bad'}
          title={
            rec.ok
              ? `ยอดรวมบัญชีย่อยตรงกับ${controlLabel} = ${formatMoney(rec.control)} บาท`
              : `ยอดรวมบัญชีย่อย (${formatMoney(rec.subTotal)}) ไม่ตรงกับ${controlLabel} (${formatMoney(rec.control)})`
          }
          detail={
            rec.ok
              ? `ตรวจสอบ ${rec.parties.length} รายการย่อยแล้ว — ผลต่าง 0.00 บาท`
              : `ผลต่าง ${formatMoney(Math.abs(rec.diff))} บาท กรุณาตรวจสอบรายการที่ลงบัญชี ${controlCode} โดยไม่ระบุชื่อ${kind === 'debtor' ? 'ลูกหนี้' : 'เจ้าหนี้'}`
          }
        />

        {/* Summary table of parties */}
        <div className="overflow-x-auto">
          <table className="acct-table min-w-[520px]">
            <thead>
              <tr>
                <th className="w-24">รหัส</th>
                <th>ชื่อ{kind === 'debtor' ? 'ลูกหนี้การค้า' : 'เจ้าหนี้การค้า'}</th>
                <th>เงื่อนไขการชำระเงิน</th>
                <th className="num">ยอดคงเหลือ ณ สิ้นงวด</th>
              </tr>
            </thead>
            <tbody>
              {rec.parties.map(({ party, balance }) => (
                <tr key={party.id}>
                  <td className="font-mono text-[12px] font-semibold">{party.id}</td>
                  <td className="font-semibold text-[var(--ink)]">{party.name}</td>
                  <td className="text-[12.5px] text-[var(--mu)]">{party.terms}</td>
                  <td className="num font-bold">{formatMoney(balance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>รวมยอดคงเหลือบัญชีย่อยทั้งหมด</td>
                <td className="num">{formatMoney(rec.subTotal)}</td>
              </tr>
              <tr className="sub-foot">
                <td colSpan={3} className="text-[var(--mu)]">
                  เทียบกับ{controlLabel}
                </td>
                <td className="num text-[var(--ok)]">
                  {formatMoney(rec.control)} {rec.ok ? '✓' : '✗'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Individual Party Ledger Cards */}
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        {rec.parties.map(({ party, balance }) => {
          const list = sub[party.id] ?? []
          let running = 0
          return (
            <Card key={party.id}>
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--sf2)] text-[var(--mu)]">
                    <Users className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="font-bold text-[var(--ink)]">
                      {party.id} · {party.name}
                    </div>
                    <div className="text-[11.5px] text-[var(--mu)]">เงื่อนไข {party.terms}</div>
                  </div>
                </div>
                <Badge variant={balance > 0 ? 'info' : 'ok'}>
                  คงเหลือ {formatMoney(balance)}
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="acct-table min-w-[440px]">
                  <thead>
                    <tr>
                      <th>วันที่</th>
                      <th>รายการ</th>
                      <th>อ้างอิง</th>
                      <th className="num">เดบิต</th>
                      <th className="num">เครดิต</th>
                      <th className="num">คงเหลือ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-[12.5px] text-[var(--mu)]">
                          ยังไม่มีความเคลื่อนไหว
                        </td>
                      </tr>
                    ) : (
                      list.map((p) => {
                        running += sign * (p.dr - p.cr)
                        return (
                          <tr key={p.key}>
                            <td className="whitespace-nowrap text-[12px] text-[var(--mu)]">
                              {formatDateShort(p.date)}
                            </td>
                            <td className="text-[13px]">{p.description}</td>
                            <td className="font-mono text-[11.5px]">{p.ref}</td>
                            <td className="num">{p.dr ? formatMoney(p.dr) : ''}</td>
                            <td className="num">{p.cr ? formatMoney(p.cr) : ''}</td>
                            <td className="num font-semibold">{formatMoney(running)}</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )
        })}
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={`เพิ่มรายชื่อ${kind === 'debtor' ? 'ลูกหนี้การค้า' : 'เจ้าหนี้การค้า'}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              ยกเลิก
            </Button>
            <Button variant="accent" onClick={handleAddParty}>
              <CheckCircle2 className="h-4 w-4" /> บันทึก
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[12.5px] font-semibold text-[var(--mu)]">ชื่อกิจการ / บุคคล (ข้อมูลสมมติ)</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={kind === 'debtor' ? 'เช่น ร้านเอฟบุ๊คสโตร์' : 'เช่น บ.จีเปเปอร์ จำกัด'}
              className="h-[38px] w-full rounded-[8px] border border-[var(--bd)] bg-[var(--sf)] px-3 text-[13.5px]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12.5px] font-semibold text-[var(--mu)]">เงื่อนไขการชำระเงิน</label>
            <input
              type="text"
              value={newTerms}
              onChange={(e) => setNewTerms(e.target.value)}
              placeholder="2/10, n/30"
              className="h-[38px] w-full rounded-[8px] border border-[var(--bd)] bg-[var(--sf)] px-3 text-[13.5px]"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
