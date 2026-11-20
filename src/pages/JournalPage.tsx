import { useState } from 'react'
import { motion } from 'motion/react'
import { FileSpreadsheet, Plus } from 'lucide-react'
import {
  BOOKS,
  BOOK_ORDER,
  accountName,
  lineTotals,
  partyName,
  sortEntries,
  type Book,
  type Entry,
} from '@/lib/accounting'
import { formatDateShort, formatMoney } from '@/lib/format'
import { useBooks } from '@/store/useBooks'
import { BOOK_ICONS } from '@/components/accounting/EntryDrawer'
import { Badge, Button, Card } from '@/components/ui/primitives'

export function JournalPage({
  onOpenEntry,
  onOpenCreate,
  onQuickExport,
}: {
  onOpenEntry: (e: Entry) => void
  onOpenCreate: (book: Book) => void
  onQuickExport: () => void
}) {
  const { entries, accounts, parties } = useBooks()
  const [activeBook, setActiveBook] = useState<Book>('PUR')

  const meta = BOOKS[activeBook]
  const list = sortEntries(entries).filter((e) => e.book === activeBook)
  const sumDr = list.reduce((s, e) => s + lineTotals(e.lines).dr, 0)
  const sumCr = list.reduce((s, e) => s + lineTotals(e.lines).cr, 0)

  return (
    <div className="space-y-3.5">
      {/* 5 Journal Selector Cards/Pills */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {BOOK_ORDER.map((b) => {
          const m = BOOKS[b]
          const Icon = BOOK_ICONS[b]
          const count = entries.filter((e) => e.book === b).length
          const active = activeBook === b
          return (
            <button
              key={b}
              type="button"
              onClick={() => setActiveBook(b)}
              className={`relative flex flex-col items-start rounded-[10px] border p-3 text-left transition ${
                active
                  ? 'border-[var(--ink)] bg-[var(--sf)] shadow-[var(--sh)]'
                  : 'border-[var(--bd)] bg-[var(--sf2)] hover:border-[var(--bd-strong)] hover:bg-[var(--sf)]'
              }`}
            >
              {active && (
                <motion.div
                  layoutId="active-journal-bar"
                  style={{ backgroundColor: m.hex }}
                  className="absolute inset-x-3 top-0 h-[3px] rounded-b-full"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <div className="flex w-full items-center justify-between">
                <span
                  style={{ backgroundColor: m.softVar, color: m.colorVar }}
                  className="flex h-8 w-8 items-center justify-center rounded-[7px]"
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="font-mono text-[12px] font-bold text-[var(--mu)]">{count}</span>
              </div>
              <div className="mt-2 text-[13.5px] font-bold text-[var(--ink)]">{m.name}</div>
              <div className="text-[11px] text-[var(--mu)]">อักษรย่อ {m.abbr}.</div>
            </button>
          )
        })}
      </div>

      {/* Active Journal Table */}
      <Card>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[18px] font-bold text-[var(--ink)]">{meta.name}</h2>
              <Badge variant="muted">{list.length} รายการ</Badge>
            </div>
            <p className="mt-0.5 text-[13px] text-[var(--mu)]">{meta.desc}</p>
            <p className="mt-0.5 text-[12px] font-medium text-[var(--info)]">{meta.rule}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onOpenCreate(activeBook)}>
              <Plus className="h-3.5 w-3.5" /> บันทึกใน{meta.shortName}
            </Button>
            <Button variant="ghost" size="sm" onClick={onQuickExport}>
              <FileSpreadsheet className="h-3.5 w-3.5" /> ส่งออกสมุดรายวัน
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="acct-table min-w-[680px]">
            <thead>
              <tr>
                <th className="w-[110px]">วันที่</th>
                <th className="w-[95px]">เลขที่</th>
                <th>รายละเอียด / ชื่อบัญชี</th>
                <th className="num w-[130px]">เดบิต</th>
                <th className="num w-[130px]">เครดิต</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[var(--mu)]">
                    ยังไม่มีรายการใน{meta.name} — กดปุ่ม “บันทึกใน{meta.shortName}” เพื่อเพิ่มรายการ
                  </td>
                </tr>
              ) : (
                list.map((e) =>
                  e.lines.map((l, idx) => (
                    <tr
                      key={`${e.id}-${idx}`}
                      onClick={() => onOpenEntry(e)}
                      className={`clickable ${e.isTest ? 'is-test' : ''}`}
                    >
                      <td className="whitespace-nowrap text-[12.5px] text-[var(--mu)]">
                        {idx === 0 ? formatDateShort(e.date) : ''}
                      </td>
                      <td className="font-mono text-[12px] font-semibold">
                        {idx === 0 ? e.docNo : ''}
                      </td>
                      <td>
                        {idx === 0 && (
                          <div className="font-semibold text-[var(--ink)]">{e.description}</div>
                        )}
                        <div className={`text-[13px] ${l.cr > 0 ? 'pl-6 text-[var(--mu)]' : 'pl-2 text-[var(--ink2)]'}`}>
                          <span className="mr-1.5 font-mono text-[11.5px] text-[var(--ft)]">{l.account}</span>
                          {accountName(accounts, l.account)}
                          {l.partyId && (
                            <span className="ml-1.5 text-[12px] text-[var(--info)]">
                              — {partyName(parties, l.partyId)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="num">{l.dr ? formatMoney(l.dr) : ''}</td>
                      <td className="num">{l.cr ? formatMoney(l.cr) : ''}</td>
                    </tr>
                  )),
                )
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>รวมยอด{meta.name}</td>
                <td className="num">{formatMoney(sumDr)}</td>
                <td className="num">{formatMoney(sumCr)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  )
}
