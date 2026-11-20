import { useMemo, useState } from 'react'
import { FileSpreadsheet } from 'lucide-react'
import {
  ACC,
  accountName,
  balanceOf,
  buildGeneralLedger,
} from '@/lib/accounting'
import { formatCompact, formatDateShort, formatMoney, periodEnd } from '@/lib/format'
import { useBooks } from '@/store/useBooks'
import { Badge, Button, Card } from '@/components/ui/primitives'

export function LedgerPage({ onQuickExport }: { onQuickExport: () => void }) {
  const { entries, accounts, company } = useBooks()
  const [selectedCode, setSelectedCode] = useState<string>(ACC.CASH)
  const [mode, setMode] = useState<'textbook' | 'detail'>('textbook')

  const end = periodEnd(company.period)
  const gl = useMemo(
    () => buildGeneralLedger(entries, accounts, { upto: end, mode }),
    [entries, accounts, end, mode],
  )

  const postings = gl[selectedCode] ?? []
  let running = 0

  const activeSummary = useMemo(
    () =>
      accounts
        .filter((a) => (gl[a.code]?.length ?? 0) > 0)
        .map((a) => {
          const ps = gl[a.code] ?? []
          const dr = ps.reduce((s, p) => s + p.dr, 0)
          const cr = ps.reduce((s, p) => s + p.cr, 0)
          return { ...a, dr, cr, bal: dr - cr }
        }),
    [accounts, gl],
  )

  return (
    <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-12">
      {/* Left Account Picker (horizontal scroll on mobile, sticky list on desktop) */}
      <Card className="p-2.5 lg:sticky lg:top-[116px] lg:col-span-4 lg:max-h-[74vh] lg:overflow-y-auto xl:col-span-3">
        <div className="mb-2 px-2 text-[11.5px] font-bold uppercase tracking-wider text-[var(--ft)]">
          บัญชีแยกประเภท ({accounts.length})
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0">
          {accounts.map((a) => {
            const bal = balanceOf(gl[a.code])
            const active = a.code === selectedCode
            return (
              <button
                key={a.code}
                type="button"
                onClick={() => setSelectedCode(a.code)}
                className={`flex shrink-0 items-center gap-2 rounded-[7px] px-2.5 py-2 text-left transition lg:w-full ${
                  active
                    ? 'bg-[var(--ink)] text-[var(--sf)]'
                    : 'text-[var(--ink)] hover:bg-[var(--sf2)]'
                }`}
              >
                <span className={`font-mono text-[11px] ${active ? 'opacity-75' : 'text-[var(--ft)]'}`}>
                  {a.code}
                </span>
                <span className="truncate text-[13px] font-medium lg:flex-1">{a.name}</span>
                <span className={`font-mono text-[11px] font-semibold ${active ? 'text-[var(--sf)]' : 'text-[var(--mu)]'}`}>
                  {bal ? formatCompact(Math.abs(bal)) : '–'}
                </span>
              </button>
            )
          })}
        </div>
      </Card>

      {/* Right Ledger Detail + All Accounts Summary */}
      <div className="space-y-3.5 lg:col-span-8 xl:col-span-9">
        <Card>
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-bold text-[var(--ink)]">
                บัญชี {selectedCode} — {accountName(accounts, selectedCode)}
              </h2>
              <p className="text-[12.5px] text-[var(--mu)]">
                ผ่านรายการอัตโนมัติจากสมุดรายวันทั้ง 5 เล่ม
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-[7px] border border-[var(--bd)] bg-[var(--sf2)] p-0.5 text-[12px] font-semibold">
                <button
                  type="button"
                  onClick={() => setMode('textbook')}
                  className={`rounded-[5px] px-2.5 py-1 transition ${
                    mode === 'textbook' ? 'bg-[var(--ink)] text-[var(--sf)]' : 'text-[var(--mu)]'
                  }`}
                >
                  มาตรฐานตำรา (รวมสิ้นเดือน)
                </button>
                <button
                  type="button"
                  onClick={() => setMode('detail')}
                  className={`rounded-[5px] px-2.5 py-1 transition ${
                    mode === 'detail' ? 'bg-[var(--ink)] text-[var(--sf)]' : 'text-[var(--mu)]'
                  }`}
                >
                  แสดงรายตัวทั้งหมด
                </button>
              </div>
              <Button variant="ghost" size="sm" onClick={onQuickExport}>
                <FileSpreadsheet className="h-3.5 w-3.5" /> ส่งออก
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="acct-table min-w-[600px]">
              <thead>
                <tr>
                  <th className="w-[110px]">วันที่</th>
                  <th className="w-[90px]">หน้าบัญชี</th>
                  <th>รายการ</th>
                  <th className="num w-[120px]">เดบิต</th>
                  <th className="num w-[120px]">เครดิต</th>
                  <th className="num w-[140px]">คงเหลือ</th>
                </tr>
              </thead>
              <tbody>
                {postings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-[var(--mu)]">
                      ยังไม่มีความเคลื่อนไหวในบัญชีนี้
                    </td>
                  </tr>
                ) : (
                  postings.map((p) => {
                    running += p.dr - p.cr
                    return (
                      <tr key={p.key}>
                        <td className="whitespace-nowrap text-[12.5px] text-[var(--mu)]">
                          {formatDateShort(p.date)}
                        </td>
                        <td className="font-mono text-[12px] font-semibold">{p.ref}</td>
                        <td>
                          <span>{p.description}</span>
                          {p.kind === 'total' && (
                            <Badge variant="info" className="ml-1.5">
                              ยอดรวมสิ้นเดือน
                            </Badge>
                          )}
                        </td>
                        <td className="num">{p.dr ? formatMoney(p.dr) : ''}</td>
                        <td className="num">{p.cr ? formatMoney(p.cr) : ''}</td>
                        <td className="num">
                          <b>{formatMoney(Math.abs(running))}</b>{' '}
                          <span className="text-[11.5px] text-[var(--mu)]">{running < 0 ? 'คร.' : 'เด.'}</span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card delay={0.08}>
          <h3 className="mb-3 text-[16px] font-bold text-[var(--ink)]">สรุปยอดทุกบัญชีที่มีความเคลื่อนไหว</h3>
          <div className="overflow-x-auto">
            <table className="acct-table min-w-[540px]">
              <thead>
                <tr>
                  <th className="w-20">รหัส</th>
                  <th>ชื่อบัญชี</th>
                  <th className="num">รวมเดบิต</th>
                  <th className="num">รวมเครดิต</th>
                  <th className="num">ยอดคงเหลือ</th>
                </tr>
              </thead>
              <tbody>
                {activeSummary.map((row) => (
                  <tr key={row.code} onClick={() => setSelectedCode(row.code)} className="clickable">
                    <td className="font-mono text-[12px] font-semibold">{row.code}</td>
                    <td className="font-medium">{row.name}</td>
                    <td className="num">{formatMoney(row.dr)}</td>
                    <td className="num">{formatMoney(row.cr)}</td>
                    <td className="num">
                      <b>{formatMoney(Math.abs(row.bal))}</b>{' '}
                      <span className="text-[11.5px] text-[var(--mu)]">{row.bal < 0 ? 'คร.' : 'เด.'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
