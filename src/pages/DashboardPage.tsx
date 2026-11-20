import { motion } from 'motion/react'
import {
  ArrowUpRight,
  BookOpen,
  Box,
  Calculator,
  CheckCircle2,
  Coins,
  Database,
  FileSpreadsheet,
  Scale,
  Tag,
  TrendingUp,
  Users,
  AlertTriangle,
} from 'lucide-react'
import {
  ACC,
  BOOKS,
  BOOK_ORDER,
  accountTotals,
  buildGeneralLedger,
  buildMerchStatement,
  buildTrialBalance,
  lineTotals,
  netOf,
  reconcile,
  sortEntries,
  type Book,
  type Entry,
} from '@/lib/accounting'
import { formatCompact, formatDateShort, formatMoney, formatPeriodLabel, periodEnd } from '@/lib/format'
import { useBooks, type ActiveTab } from '@/store/useBooks'
import { Badge, Button, Card, JournalBadge } from '@/components/ui/primitives'
import { toast } from '@/components/ui/MotionToast'

export function DashboardPage({
  onNavigate,
  onOpenEntry,
  onOpenCreate,
  onOpenClosing,
  onQuickExport,
}: {
  onNavigate: (tab: ActiveTab) => void
  onOpenEntry: (entry: Entry) => void
  onOpenCreate: (book?: Book) => void
  onOpenClosing: () => void
  onQuickExport: () => void
}) {
  const { company, accounts, parties, entries, loadSampleData } = useBooks()
  const end = periodEnd(company.period)
  const merch = buildMerchStatement(entries, accounts, company.period)
  const totals = accountTotals(entries, accounts, { upto: end })
  const gl = buildGeneralLedger(entries, accounts, { upto: end })
  const tb = buildTrialBalance(gl, accounts)
  const ar = reconcile(gl, entries, parties, 'debtor', { upto: end })
  const ap = reconcile(gl, entries, parties, 'creditor', { upto: end })

  const recent = [...sortEntries(entries)].reverse().slice(0, 6)
  const avail = merch.available || 1
  const pctCogs = Math.max(0, Math.min(100, (merch.cogs / avail) * 100))
  const pctEnd = 100 - pctCogs

  // Daily sales vs purchases chart data
  const monthEntries = entries.filter((e) => e.date.startsWith(company.period) && !e.closing)
  const maxDay = monthEntries.length ? Math.max(...monthEntries.map((e) => Number(e.date.slice(8)))) : 0
  const daily = Array.from({ length: maxDay }, (_, i) => ({ day: i + 1, sales: 0, purch: 0 }))
  for (const e of monthEntries) {
    const idx = Number(e.date.slice(8)) - 1
    if (idx < 0 || idx >= daily.length) continue
    for (const l of e.lines) {
      if (l.account === ACC.SALES) daily[idx].sales += l.cr - l.dr
      if (l.account === ACC.PURCHASE) daily[idx].purch += l.dr - l.cr
    }
  }
  const maxBar = Math.max(...daily.flatMap((d) => [d.sales, d.purch]), 1)

  // Journal counts for donut
  const counts = BOOK_ORDER.map((b) => ({
    book: b,
    count: entries.filter((e) => e.book === b).length,
  }))

  const handleLoadSample = () => {
    loadSampleData()
    toast.saved('โหลดข้อมูลตัวอย่างร้านเครื่องเขียนคุณแมวน้ำ (29 รายการ) แล้ว')
  }

  return (
    <div className="space-y-3.5">
      {/* Hero Banner */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, ease: [0.22, 0.9, 0.3, 1] }}
        className="flex flex-wrap items-center justify-between gap-4 rounded-[10px] border border-[var(--bd)] bg-gradient-to-br from-[var(--sf)] via-[var(--sf)] to-[var(--sf3)] p-4 shadow-[var(--sh)] sm:p-5"
      >
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[1.6px] text-[var(--mu)]">
            งวดบัญชี · {formatPeriodLabel(company.period)}
          </div>
          <h2 className="mt-0.5 text-[20px] font-bold tracking-tight text-[var(--ink)] sm:text-[22px]">
            ภาพรวมกิจการซื้อมาขายไป
          </h2>
          <p className="mt-0.5 text-[13px] text-[var(--mu)]">
            สมุดรายวันเฉพาะ 4 เล่ม + สมุดรายวันทั่วไป · ผ่านรายการไปบัญชีแยกประเภทและบัญชีย่อยอัตโนมัติ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {entries.length > 0 ? (
            tb.balanced ? (
              <Badge variant="ok">
                <CheckCircle2 className="h-3.5 w-3.5" /> งบทดลองสมดุล {formatMoney(tb.totalDr)}
              </Badge>
            ) : (
              <Badge variant="bad">
                <AlertTriangle className="h-3.5 w-3.5" /> งบทดลองไม่สมดุล
              </Badge>
            )
          ) : (
            <Badge variant="muted">ยังไม่มีรายการ</Badge>
          )}

          {entries.length > 0 && (
            <Badge variant={ar.ok && ap.ok ? 'ok' : 'warn'}>
              {ar.ok && ap.ok ? '✓ บัญชีย่อยตรงบัญชีคุม' : '⚠ ตรวจสอบบัญชีย่อย'}
            </Badge>
          )}

          <Button variant="ghost" size="sm" onClick={handleLoadSample}>
            <Database className="h-3.5 w-3.5" /> กดปุ่มโหลดตัวอย่างเพื่อดูรายการค้า
          </Button>
          <Button variant="ghost" size="sm" onClick={onOpenClosing}>
            <Calculator className="h-3.5 w-3.5" /> ปิดบัญชีสินค้า
          </Button>
          <Button size="sm" onClick={onQuickExport}>
            <FileSpreadsheet className="h-3.5 w-3.5" /> ส่งออกชุดงบทางการ
          </Button>
        </div>
      </motion.section>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'ยอดขายสุทธิ',
            val: formatMoney(merch.netSales),
            sub: `ขาย ${formatCompact(merch.sales)} − รับคืน ${formatCompact(merch.sret)} − ส่วนลด ${formatCompact(merch.sdisc)}`,
            accent: '#2563eb',
            Icon: Tag,
          },
          {
            label: 'กำไรขั้นต้น',
            val: formatMoney(merch.gross),
            sub: `อัตรากำไรขั้นต้น ${merch.grossMargin.toFixed(2)}%`,
            accent: '#059669',
            Icon: Scale,
          },
          {
            label: 'สินค้าคงเหลือปลายงวด',
            val: formatMoney(merch.ending),
            sub: `ต้นทุนขายงวดนี้ ${formatMoney(merch.cogs)}`,
            accent: '#d97706',
            Icon: Box,
          },
          {
            label: 'กำไรสุทธิประจำงวด',
            val: formatMoney(merch.netIncome),
            sub: `อัตรากำไรสุทธิ ${merch.netMargin.toFixed(2)}%`,
            accent: '#71717a',
            Icon: Coins,
          },
        ].map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.34, delay: 0.04 * (i + 1), ease: [0.22, 0.9, 0.3, 1] }}
            className="relative overflow-hidden rounded-[10px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]"
          >
            <div style={{ backgroundColor: k.accent }} className="absolute bottom-0 left-0 top-0 w-[3px]" />
            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--mu)]">
              <k.Icon style={{ color: k.accent }} className="h-3.5 w-3.5" />
              {k.label}
            </div>
            <div className="mt-1.5 font-mono text-[21px] font-bold tracking-tight text-[var(--ink)]">
              {k.val}
            </div>
            <div className="mt-0.5 text-[11.5px] text-[var(--mu)]">{k.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* 3 Mini Cards: Cash, AR, AP */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'เงินสดคงเหลือ (101)', val: formatMoney(netOf(totals, ACC.CASH)), Icon: Coins, tab: 'ledger' as ActiveTab },
          { label: 'ลูกหนี้การค้า (110)', val: formatMoney(netOf(totals, ACC.AR)), Icon: Users, tab: 'subledger' as ActiveTab },
          { label: 'เจ้าหนี้การค้า (201)', val: formatMoney(-netOf(totals, ACC.AP)), Icon: TrendingUp, tab: 'subledger' as ActiveTab },
        ].map((m) => (
          <button
            key={m.label}
            type="button"
            onClick={() => onNavigate(m.tab)}
            className="flex items-center gap-3 rounded-[10px] border border-[var(--bd)] bg-[var(--sf)] px-4 py-3 text-left shadow-[var(--sh)] transition hover:border-[var(--bd-strong)]"
          >
            <m.Icon className="h-4 w-4 shrink-0 text-[var(--mu)]" />
            <span className="text-[13px] font-semibold text-[var(--mu)]">{m.label}</span>
            <span className="ml-auto font-mono text-[15px] font-bold text-[var(--ink)]">{m.val}</span>
          </button>
        ))}
      </div>

      {/* Periodic COGS Flow */}
      <Card delay={0.14}>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-[16px] font-bold text-[var(--ink)]">การไหลของต้นทุนสินค้า (Periodic)</h3>
            <p className="text-[12.5px] text-[var(--mu)]">
              สินค้าต้นงวด + ซื้อสุทธิ + ค่าขนส่งเข้า − สินค้าปลายงวด = ต้นทุนขาย
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('statements')}>
            ดูงบกำไรขาดทุน <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
          {[
            { label: 'สินค้าต้นงวด', val: merch.beg },
            { label: '+ ซื้อสุทธิ', val: merch.netPurch },
            { label: '+ ค่าขนส่งเข้า', val: merch.fin },
            { label: '− สินค้าปลายงวด', val: merch.ending },
            { label: '= ต้นทุนขาย', val: merch.cogs, highlight: true },
          ].map((node) => (
            <div
              key={node.label}
              className={
                node.highlight
                  ? 'rounded-[8px] border border-[var(--ink)] bg-[var(--ink)] px-3 py-2.5 text-[var(--sf)]'
                  : 'rounded-[8px] border border-[var(--bd)] bg-[var(--sf2)] px-3 py-2.5'
              }
            >
              <div className={node.highlight ? 'text-[11.5px] opacity-80' : 'text-[11.5px] font-semibold text-[var(--mu)]'}>
                {node.label}
              </div>
              <div className="mt-0.5 font-mono text-[15.5px] font-bold">{formatMoney(node.val)}</div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex h-[26px] overflow-hidden rounded-[6px] border border-[var(--bd)]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pctCogs.toFixed(1)}%` }}
            transition={{ duration: 0.6, ease: [0.22, 0.9, 0.3, 1] }}
            className="flex items-center justify-center truncate bg-zinc-700 px-2 text-[11.5px] font-semibold text-white dark:bg-zinc-600"
          >
            ต้นทุนขาย {formatMoney(merch.cogs)}
          </motion.div>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pctEnd.toFixed(1)}%` }}
            transition={{ duration: 0.6, ease: [0.22, 0.9, 0.3, 1] }}
            className="flex items-center justify-center truncate bg-emerald-700 px-2 text-[11.5px] font-semibold text-white dark:bg-emerald-600"
          >
            สินค้าเหลือ {formatMoney(merch.ending)}
          </motion.div>
        </div>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-12">
        <Card delay={0.18} className="lg:col-span-7">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-[16px] font-bold text-[var(--ink)]">ยอดซื้อ–ยอดขายรายวัน</h3>
              <p className="text-[12.5px] text-[var(--mu)]">จากรายการระหว่างงวด (ไม่รวมรายการปิดบัญชี)</p>
            </div>
            <div className="flex items-center gap-3 text-[12px] text-[var(--mu)]">
              <span className="flex items-center gap-1.5">
                <i className="inline-block h-2.5 w-2.5 rounded-[3px] bg-[#2563eb]" /> ขายสินค้า
              </span>
              <span className="flex items-center gap-1.5">
                <i className="inline-block h-2.5 w-2.5 rounded-[3px] bg-[#d97706]" /> ซื้อสินค้า
              </span>
            </div>
          </div>

          {daily.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-[var(--mu)]">
              ยังไม่มีรายการซื้อ–ขายในงวดนี้
            </div>
          ) : (
            <div className="overflow-x-auto">
              <svg viewBox="0 0 600 195" className="h-auto w-full min-w-[460px]">
                {[0, 1, 2, 3, 4].map((step) => {
                  const y = 12 + 152 - (152 * step) / 4
                  return (
                    <g key={step}>
                      <line
                        x1={48}
                        y1={y}
                        x2={590}
                        y2={y}
                        stroke="var(--bd)"
                        strokeDasharray="3 4"
                      />
                      <text
                        x={42}
                        y={y + 3.5}
                        textAnchor="end"
                        fontSize={9.5}
                        fill="var(--ft)"
                        fontFamily="IBM Plex Mono, monospace"
                      >
                        {formatCompact((maxBar * step) / 4)}
                      </text>
                    </g>
                  )
                })}
                <line x1={48} y1={164} x2={590} y2={164} stroke="var(--mu)" />
                {daily.map((d, i) => {
                  const iw = 540
                  const x = 48 + ((i + 0.5) * iw) / daily.length
                  const bw = Math.min(11, iw / daily.length / 2.6)
                  const hSales = (d.sales / maxBar) * 152
                  const hPurch = (d.purch / maxBar) * 152
                  const labelStep = Math.max(1, Math.ceil(daily.length / 9))
                  return (
                    <g key={d.day}>
                      <title>{`วันที่ ${d.day} · ขาย ${formatMoney(d.sales)} · ซื้อ ${formatMoney(d.purch)}`}</title>
                      {d.sales > 0 && (
                        <rect
                          x={x - bw - 1}
                          y={164 - hSales}
                          width={bw}
                          height={hSales}
                          rx={2}
                          fill="#2563eb"
                          className="transition-opacity hover:opacity-80"
                        />
                      )}
                      {d.purch > 0 && (
                        <rect
                          x={x + 1}
                          y={164 - hPurch}
                          width={bw}
                          height={hPurch}
                          rx={2}
                          fill="#d97706"
                          className="transition-opacity hover:opacity-80"
                        />
                      )}
                      {(i === 0 || (i + 1) % labelStep === 0) && (
                        <text
                          x={x}
                          y={182}
                          textAnchor="middle"
                          fontSize={9.5}
                          fill="var(--ft)"
                          fontFamily="IBM Plex Mono, monospace"
                        >
                          {d.day}
                        </text>
                      )}
                    </g>
                  )
                })}
              </svg>
            </div>
          )}
        </Card>

        <Card delay={0.22} className="lg:col-span-5">
          <h3 className="text-[16px] font-bold text-[var(--ink)]">สัดส่วนรายการตามสมุดรายวัน</h3>
          <p className="mb-3 text-[12.5px] text-[var(--mu)]">สมุดรายวันเฉพาะ 4 เล่ม + สมุดรายวันทั่วไป</p>
          <div className="flex flex-wrap items-center gap-5">
            <div className="relative mx-auto h-[146px] w-[146px] shrink-0">
              <svg viewBox="0 0 42 42" className="h-full w-full">
                {entries.length === 0 ? (
                  <circle cx={21} cy={21} r={15.915} fill="none" stroke="var(--bd)" strokeWidth={5.2} />
                ) : (
                  (() => {
                    let cum = 0
                    return counts.map((c) => {
                      if (!c.count) return null
                      const pct = (c.count / entries.length) * 100
                      const dash = `${Math.max(pct - 1.2, 0.6).toFixed(2)} ${(101.2 - pct).toFixed(2)}`
                      const offset = (25 - cum).toFixed(2)
                      cum += pct
                      return (
                        <circle
                          key={c.book}
                          cx={21}
                          cy={21}
                          r={15.915}
                          fill="none"
                          stroke={BOOKS[c.book].hex}
                          strokeWidth={5.2}
                          strokeDasharray={dash}
                          strokeDashoffset={offset}
                        >
                          <title>{`${BOOKS[c.book].name}: ${c.count} รายการ`}</title>
                        </circle>
                      )
                    })
                  })()
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <b className="font-mono text-[22px] leading-none text-[var(--ink)]">{entries.length}</b>
                <span className="mt-1 text-[11px] text-[var(--mu)]">รายการทั้งระบบ</span>
              </div>
            </div>

            <div className="min-w-[175px] flex-1 space-y-1">
              {counts.map((c) => (
                <button
                  key={c.book}
                  type="button"
                  onClick={() => onNavigate('journals')}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-[13px] transition hover:bg-[var(--sf2)]"
                >
                  <i style={{ backgroundColor: BOOKS[c.book].hex }} className="h-2.5 w-2.5 rounded-[3px]" />
                  <span className="text-[var(--ink)]">{BOOKS[c.book].name}</span>
                  <b className="ml-auto font-mono text-[var(--ink)]">{c.count}</b>
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card delay={0.25}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-[16px] font-bold text-[var(--ink)]">รายการล่าสุด</h3>
            <p className="text-[12.5px] text-[var(--mu)]">คลิกเพื่อดูใบสำคัญ การผ่านรายการอัตโนมัติ และเหตุผลการเลือกสมุด</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('entries')}>
            ดูทั้งหมด ({entries.length})
          </Button>
        </div>

        {recent.length === 0 ? (
          <div className="py-10 text-center">
            <BookOpen className="mx-auto mb-2 h-8 w-8 text-[var(--ft)]" />
            <p className="mb-3 text-[13.5px] text-[var(--mu)]">ยังไม่มีรายการค้าในระบบ</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="accent" size="sm" onClick={handleLoadSample}>
                <Database className="h-3.5 w-3.5" /> กดปุ่มโหลดตัวอย่างเพื่อดูรายการค้า
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onOpenCreate('PUR')}>
                บันทึกรายการเอง
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="acct-table min-w-[560px]">
              <tbody>
                {recent.map((e) => (
                  <tr key={e.id} onClick={() => onOpenEntry(e)} className="clickable">
                    <td className="whitespace-nowrap text-[12.5px] text-[var(--mu)]">{formatDateShort(e.date)}</td>
                    <td className="font-mono text-[12px] font-semibold">{e.docNo}</td>
                    <td>
                      <JournalBadge book={e.book} compact />
                    </td>
                    <td>
                      <div className="font-medium text-[var(--ink)]">{e.description}</div>
                      <div className="text-[12px] text-[var(--mu)]">{e.reason}</div>
                    </td>
                    <td className="num font-bold">{formatMoney(lineTotals(e.lines).dr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
