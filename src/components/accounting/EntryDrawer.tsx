import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FlaskConical,
  Pencil,
  Plus,
  ShoppingCart,
  Tag,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import {
  ACC,
  BOOKS,
  BOOK_ORDER,
  accountName,
  buildPaymentLines,
  buildPurchaseLines,
  buildReceiptLines,
  buildSalesLines,
  lineTotals,
  nextDocNo,
  partyName,
  traceEntry,
  validateEntry,
  type Book,
  type Entry,
  type JournalLine,
  type PaymentKind,
  type ReceiptKind,
} from '@/lib/accounting'
import { bahtToSatang, formatDateShort, formatMoney, satangToBaht } from '@/lib/format'
import { useBooks } from '@/store/useBooks'
import { MotionDropdown } from '@/components/ui/MotionDropdown'
import { Badge, Banner, Button, Drawer, JournalBadge } from '@/components/ui/primitives'
import { toast } from '@/components/ui/MotionToast'

export const BOOK_ICONS: Record<Book, typeof ShoppingCart> = {
  PUR: ShoppingCart,
  SAL: Tag,
  REC: TrendingDown,
  PAY: TrendingUp,
  JNL: BookOpen,
}

interface DraftLine {
  account: string
  dr: string
  cr: string
  partyId: string
}

const DEFAULT_REASONS: Record<Book, string> = {
  PUR: 'ซื้อสินค้าเพื่อขายเป็นเงินเชื่อ จึงบันทึกในสมุดรายวันซื้อ',
  SAL: 'ขายสินค้าเป็นเงินเชื่อ จึงบันทึกในสมุดรายวันขาย',
  REC: 'มีการรับเงินสดเข้ากิจการ จึงบันทึกในสมุดรายวันรับเงิน',
  PAY: 'มีการจ่ายเงินสดออกจากกิจการ จึงบันทึกในสมุดรายวันจ่ายเงิน',
  JNL: 'รายการไม่กระทบเงินสดและไม่เข้าสมุดเฉพาะ 4 เล่ม จึงบันทึกในสมุดรายวันทั่วไป',
}

export function EntryDrawer({
  mode,
  entry,
  initialBook = 'PUR',
  onClose,
  onEdit,
}: {
  mode: 'view' | 'create' | 'edit' | null
  entry?: Entry | null
  initialBook?: Book
  onClose: () => void
  onEdit?: (e: Entry) => void
}) {
  const { accounts, parties, entries, company, testMode, setTestMode, addEntry, updateEntry, deleteEntry, restoreEntries } =
    useBooks()

  const [book, setBook] = useState<Book>(initialBook)
  const [date, setDate] = useState(`${company.period}-15`)
  const [docNo, setDocNo] = useState('')
  const [description, setDescription] = useState('')
  const [reason, setReason] = useState('')
  const [terms, setTerms] = useState('')

  // Smart form fields for special journals
  const [useAdvancedLines, setUseAdvancedLines] = useState(false)
  const [partyId, setPartyId] = useState('')
  const [amount, setAmount] = useState('')
  const [discount, setDiscount] = useState('')
  const [receiptKind, setReceiptKind] = useState<ReceiptKind>('cash-sale')
  const [paymentKind, setPaymentKind] = useState<PaymentKind>('expense')
  const [otherAccount, setOtherAccount] = useState<string>(ACC.RENT)

  // General / advanced lines
  const [lines, setLines] = useState<DraftLine[]>([
    { account: ACC.SUPPLIES_EXP, dr: '', cr: '', partyId: '' },
    { account: ACC.SUPPLIES, dr: '', cr: '', partyId: '' },
  ])
  const [errors, setErrors] = useState<string[]>([])

  const debtors = useMemo(() => parties.filter((p) => p.kind === 'debtor'), [parties])
  const creditors = useMemo(() => parties.filter((p) => p.kind === 'creditor'), [parties])

  useEffect(() => {
    if (!mode || mode === 'view') return
    setErrors([])
    if (mode === 'edit' && entry) {
      setBook(entry.book)
      setDate(entry.date)
      setDocNo(entry.docNo)
      setDescription(entry.description)
      setReason(entry.reason || DEFAULT_REASONS[entry.book])
      setTerms(entry.terms || '')
      setUseAdvancedLines(true)
      setLines(
        entry.lines.map((l) => ({
          account: l.account,
          dr: l.dr ? String(satangToBaht(l.dr)) : '',
          cr: l.cr ? String(satangToBaht(l.cr)) : '',
          partyId: l.partyId || '',
        })),
      )
    } else if (mode === 'create') {
      const b = initialBook
      setBook(b)
      setDate(`${company.period}-15`)
      setDocNo(nextDocNo(entries, b))
      setDescription('')
      setReason(DEFAULT_REASONS[b])
      setTerms(b === 'PUR' || b === 'SAL' ? '2/10, n/30' : '')
      setUseAdvancedLines(b === 'JNL')
      setPartyId(b === 'PUR' ? creditors[0]?.id || '' : b === 'SAL' ? debtors[0]?.id || '' : '')
      setAmount('')
      setDiscount('')
      setReceiptKind('cash-sale')
      setPaymentKind('expense')
      setOtherAccount(b === 'REC' ? ACC.CAPITAL : ACC.RENT)
      setLines([
        { account: ACC.SUPPLIES_EXP, dr: '', cr: '', partyId: '' },
        { account: ACC.SUPPLIES, dr: '', cr: '', partyId: '' },
      ])
    }
  }, [mode, entry, initialBook, company.period])

  const handleBookSwitch = (nextBook: Book) => {
    setBook(nextBook)
    if (mode === 'create') {
      setDocNo(nextDocNo(entries, nextBook))
      setReason(DEFAULT_REASONS[nextBook])
      setUseAdvancedLines(nextBook === 'JNL')
      if (nextBook === 'PUR') setPartyId(creditors[0]?.id || '')
      if (nextBook === 'SAL') setPartyId(debtors[0]?.id || '')
      if (nextBook === 'REC') setOtherAccount(ACC.CAPITAL)
      if (nextBook === 'PAY') setOtherAccount(ACC.RENT)
    }
  }

  const computedLines: JournalLine[] = useMemo(() => {
    if (useAdvancedLines || book === 'JNL') {
      return lines.map((l) => ({
        account: l.account,
        dr: l.dr.trim() ? bahtToSatang(l.dr) : 0,
        cr: l.cr.trim() ? bahtToSatang(l.cr) : 0,
        column: book === 'JNL' ? 'general' : 'other',
        ...(l.partyId ? { partyId: l.partyId } : {}),
      }))
    }
    const amtSatang = amount.trim() ? bahtToSatang(amount) : 0
    const discSatang = discount.trim() ? bahtToSatang(discount) : 0
    if (book === 'PUR') return buildPurchaseLines(amtSatang, partyId)
    if (book === 'SAL') return buildSalesLines(amtSatang, partyId)
    if (book === 'REC') {
      return buildReceiptLines({
        kind: receiptKind,
        cash: amtSatang,
        discount: discSatang,
        debtorId: receiptKind === 'ar-collect' ? partyId : undefined,
        otherAccount: receiptKind === 'other' ? otherAccount : undefined,
      })
    }
    return buildPaymentLines({
      kind: paymentKind,
      cash: amtSatang,
      discount: discSatang,
      creditorId: paymentKind === 'ap-pay' ? partyId : undefined,
      otherAccount: paymentKind !== 'ap-pay' ? otherAccount : undefined,
    })
  }, [useAdvancedLines, book, lines, amount, discount, partyId, receiptKind, paymentKind, otherAccount])

  const sums = lineTotals(computedLines)

  const handleSave = () => {
    const candidate = {
      book,
      date,
      docNo: docNo.trim() || nextDocNo(entries, book),
      description: description.trim(),
      reason: reason.trim() || DEFAULT_REASONS[book],
      terms: terms.trim() || undefined,
      lines: computedLines,
      closing: entry?.closing,
      isTest: false,
    }
    const res = validateEntry(candidate, { accounts, parties, testMode })
    if (!res.ok) {
      setErrors(res.errors.map((e) => e.message))
      return
    }
    const isUnbalancedTest = res.warnings.some((w) => w.code === 'V-01')
    candidate.isTest = isUnbalancedTest

    if (mode === 'edit' && entry) {
      updateEntry(entry.id, candidate)
      toast.saved(`อัปเดตรายการ ${candidate.docNo} แล้ว`)
    } else {
      const saved = addEntry(candidate)
      if (isUnbalancedTest) {
        toast.warn(`บันทึกรายการทดสอบไม่สมดุล ${saved.docNo} แล้ว — ตรวจสอบแจ้งเตือนที่งบทดลอง`)
      } else {
        toast.saved(`บันทึกรายการ ${saved.docNo} และผ่านรายการอัตโนมัติแล้ว`)
      }
    }
    onClose()
  }

  const handleDelete = (target: Entry) => {
    const removed = deleteEntry(target.id)
    if (!removed) return
    onClose()
    toast.saved(`ลบรายการ ${removed.docNo} แล้ว`, {
      actionLabel: 'เลิกทำ',
      onAction: () => {
        restoreEntries([removed])
        toast.success(`กู้คืนรายการ ${removed.docNo} แล้ว`)
      },
    })
  }

  const activeBook = mode === 'view' && entry ? entry.book : book
  const BookIcon = BOOK_ICONS[activeBook]
  const meta = BOOKS[activeBook]

  const accountOptions = useMemo(
    () =>
      accounts.map((a) => ({
        value: a.code,
        label: `${a.code} · ${a.name}`,
        badge: a.normal === 'dr' ? 'ดบ.' : 'คด.',
      })),
    [accounts],
  )

  const debtorOptions = useMemo(
    () => debtors.map((p) => ({ value: p.id, label: p.name, sublabel: `${p.id} · ${p.terms}` })),
    [debtors],
  )

  const creditorOptions = useMemo(
    () => creditors.map((p) => ({ value: p.id, label: p.name, sublabel: `${p.id} · ${p.terms}` })),
    [creditors],
  )

  const bookOptions = useMemo(
    () => BOOK_ORDER.map((b) => ({ value: b, label: BOOKS[b].name, sublabel: BOOKS[b].desc })),
    [],
  )

  return (
    <Drawer
      open={Boolean(mode)}
      onClose={onClose}
      title={
        mode === 'view' && entry
          ? `${BOOKS[entry.book].name} · ${entry.docNo}`
          : mode === 'edit'
            ? `แก้ไขรายการ ${entry?.docNo ?? ''}`
            : `บันทึกรายการใน${meta.name}`
      }
      subtitle={
        mode === 'view' && entry
          ? `${formatDateShort(entry.date)} · ผ่านรายการอัตโนมัติแล้ว`
          : meta.rule
      }
      icon={
        <div
          style={{ backgroundColor: meta.softVar, color: meta.colorVar }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px]"
        >
          <BookIcon className="h-5 w-5" />
        </div>
      }
      footer={
        mode === 'view' && entry ? (
          <>
            <Button variant="danger" size="sm" onClick={() => handleDelete(entry)}>
              <Trash2 className="h-3.5 w-3.5" /> ลบรายการ
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onEdit?.(entry)}>
              <Pencil className="h-3.5 w-3.5" /> แก้ไข
            </Button>
            <Button size="sm" onClick={onClose}>
              ปิดหน้าต่าง
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button variant="accent" onClick={handleSave}>
              <CheckCircle2 className="h-4 w-4" /> บันทึกและผ่านรายการ
            </Button>
          </>
        )
      }
    >
      {mode === 'view' && entry ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-[8px] border border-[var(--bd2)] bg-[var(--sf2)] p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ft)]">วันที่รายการ</div>
              <div className="mt-0.5 text-[14px] font-bold">{formatDateShort(entry.date)}</div>
            </div>
            <div className="rounded-[8px] border border-[var(--bd2)] bg-[var(--sf2)] p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ft)]">สมุดรายวัน</div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <JournalBadge book={entry.book} />
                {entry.closing && <Badge variant="muted">ปิดบัญชี</Badge>}
                {entry.isTest && <Badge variant="warn">รายการทดสอบ</Badge>}
              </div>
            </div>
          </div>

          <div className="rounded-r-[8px] border-l-[3px] border-[var(--ink)] bg-[var(--sf2)] px-3.5 py-2.5">
            <div className="text-[14.5px] font-semibold text-[var(--ink)]">{entry.description}</div>
            {entry.reason && (
              <div className="mt-1 text-[12.5px] text-[var(--mu)]">
                <b>เหตุผลการเลือกสมุด:</b> {entry.reason}
              </div>
            )}
          </div>

          <div>
            <h4 className="mb-2 text-[13px] font-bold text-[var(--ink)]">รายการบัญชี (เดบิต – เครดิต)</h4>
            <div className="overflow-x-auto rounded-[8px] border border-[var(--bd)]">
              <table className="acct-table">
                <thead>
                  <tr>
                    <th>บัญชี</th>
                    <th className="num">เดบิต</th>
                    <th className="num">เครดิต</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.lines.map((l, i) => (
                    <tr key={i}>
                      <td className={l.cr > 0 ? 'pl-7' : ''}>
                        <span className="mr-1.5 font-mono text-[12px] text-[var(--mu)]">{l.account}</span>
                        <span className="font-medium">{accountName(accounts, l.account)}</span>
                        {l.partyId && (
                          <span className="ml-1.5 text-[12px] text-[var(--info)]">
                            ({partyName(parties, l.partyId)})
                          </span>
                        )}
                      </td>
                      <td className="num">{l.dr ? formatMoney(l.dr) : ''}</td>
                      <td className="num">{l.cr ? formatMoney(l.cr) : ''}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>รวม</td>
                    <td className="num">{formatMoney(lineTotals(entry.lines).dr)}</td>
                    <td className="num">{formatMoney(lineTotals(entry.lines).cr)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Automatic Posting Trace */}
          <div>
            <h4 className="mb-2 text-[13px] font-bold text-[var(--ink)]">
              การผ่านรายการอัตโนมัติไปบัญชีแยกประเภทและบัญชีย่อย
            </h4>
            <div className="space-y-2">
              {traceEntry(entry, accounts, parties).map((t, i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-[var(--bd)] bg-[var(--sf2)] px-3 py-2 text-[13px]"
                >
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-3.5 w-3.5 text-[var(--mu)]" />
                    <span className="font-mono text-[12px] font-semibold text-[var(--mu)]">{t.account}</span>
                    <span className="font-semibold">{t.accountName}</span>
                    <Badge variant={t.mode === 'total' ? 'info' : 'muted'}>
                      {t.mode === 'total' ? 'ผ่านยอดรวมสิ้นเดือน' : 'ผ่านรายตัว'}
                    </Badge>
                    {t.party && <Badge variant="ok">บัญชีย่อย: {t.party.name}</Badge>}
                  </div>
                  <div className="font-mono text-[13px] font-semibold">
                    {t.side === 'dr' ? 'เดบิต' : 'เครดิต'} {formatMoney(t.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {errors.length > 0 && (
            <Banner
              variant="bad"
              title="ไม่สามารถบันทึกรายการได้"
              detail={errors.join(' · ')}
            />
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MotionDropdown
              label="สมุดรายวัน"
              options={bookOptions}
              value={book}
              onChange={(v) => handleBookSwitch(v as Book)}
            />
            <div>
              <label className="mb-1 block text-[12.5px] font-semibold text-[var(--mu)]">วันที่รายการ</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-[38px] w-full rounded-[8px] border border-[var(--bd)] bg-[var(--sf)] px-3 text-[13.5px] text-[var(--ink)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-[12.5px] font-semibold text-[var(--mu)]">เลขที่เอกสาร</label>
              <input
                type="text"
                value={docNo}
                onChange={(e) => setDocNo(e.target.value)}
                className="h-[38px] w-full rounded-[8px] border border-[var(--bd)] bg-[var(--sf)] px-3 font-mono text-[13px] text-[var(--ink)]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[12.5px] font-semibold text-[var(--mu)]">รายละเอียดรายการค้า</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="เช่น ซื้อเครื่องเขียนเป็นเงินเชื่อจาก บ.เอเทรดดิ้ง"
                className="h-[38px] w-full rounded-[8px] border border-[var(--bd)] bg-[var(--sf)] px-3 text-[13.5px] text-[var(--ink)]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[12.5px] font-semibold text-[var(--mu)]">
              เหตุผลการเลือกสมุดรายวันเล่มนี้ (ตามใบงาน AC101)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-[38px] w-full rounded-[8px] border border-[var(--bd)] bg-[var(--sf)] px-3 text-[13px] text-[var(--ink)]"
            />
          </div>

          {/* Toggle between Guided Form and Manual Lines for Special Journals */}
          {book !== 'JNL' && (
            <div className="flex items-center justify-between rounded-[8px] border border-[var(--bd)] bg-[var(--sf2)] px-3 py-2">
              <span className="text-[12.5px] font-medium text-[var(--mu)]">
                {useAdvancedLines ? 'โหมดกรอกบรรทัดเดบิต–เครดิตเอง' : `โหมดช่วยบันทึกอัตโนมัติ (${meta.shortName})`}
              </span>
              <button
                type="button"
                onClick={() => setUseAdvancedLines((v) => !v)}
                className="text-[12.5px] font-semibold text-[#2563eb] hover:underline dark:text-[#60a5fa]"
              >
                {useAdvancedLines ? 'กลับไปใช้โหมดช่วยบันทึก' : 'กำหนดบรรทัดบัญชีเอง'}
              </button>
            </div>
          )}

          {/* Guided Forms */}
          {!useAdvancedLines && book !== 'JNL' ? (
            <div className="space-y-3 rounded-[9px] border border-[var(--bd)] bg-[var(--sf2)] p-3.5">
              {book === 'PUR' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <MotionDropdown
                    label="เจ้าหนี้การค้า (บัญชีคุม 201)"
                    options={creditorOptions}
                    value={partyId}
                    onChange={setPartyId}
                    placeholder="เลือกเจ้าหนี้การค้า"
                  />
                  <div>
                    <label className="mb-1 block text-[12.5px] font-semibold text-[var(--mu)]">ยอดซื้อเงินเชื่อ (บาท)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="h-[38px] w-full rounded-[8px] border border-[var(--bd)] bg-[var(--sf)] px-3 font-mono text-[13.5px] text-[var(--ink)]"
                    />
                  </div>
                </div>
              )}

              {book === 'SAL' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <MotionDropdown
                    label="ลูกหนี้การค้า (บัญชีคุม 110)"
                    options={debtorOptions}
                    value={partyId}
                    onChange={setPartyId}
                    placeholder="เลือกลูกหนี้การค้า"
                  />
                  <div>
                    <label className="mb-1 block text-[12.5px] font-semibold text-[var(--mu)]">ยอดขายเงินเชื่อ (บาท)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="h-[38px] w-full rounded-[8px] border border-[var(--bd)] bg-[var(--sf)] px-3 font-mono text-[13.5px] text-[var(--ink)]"
                    />
                  </div>
                </div>
              )}

              {book === 'REC' && (
                <div className="space-y-3">
                  <MotionDropdown
                    label="ประเภทการรับเงิน"
                    value={receiptKind}
                    onChange={(v) => {
                      const k = v as ReceiptKind
                      setReceiptKind(k)
                      if (k === 'ar-collect' && !partyId) setPartyId(debtors[0]?.id || '')
                    }}
                    options={[
                      { value: 'cash-sale', label: 'ขายสินค้าเป็นเงินสด (เดบิต เงินสด / เครดิต ขายสินค้า)' },
                      { value: 'ar-collect', label: 'รับชำระหนี้จากลูกหนี้ (รองรับส่วนลดจ่าย)' },
                      { value: 'other', label: 'รับเงินสดจากบัญชีอื่น ๆ (ลงทุน / เงินมัดจำ / รายได้อื่น)' },
                    ]}
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[12.5px] font-semibold text-[var(--mu)]">รับเงินสดสุทธิ (บาท)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="h-[38px] w-full rounded-[8px] border border-[var(--bd)] bg-[var(--sf)] px-3 font-mono text-[13.5px] text-[var(--ink)]"
                      />
                    </div>
                    {receiptKind === 'ar-collect' && (
                      <div>
                        <label className="mb-1 block text-[12.5px] font-semibold text-[var(--mu)]">ส่วนลดจ่าย (ถ้ามี)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={discount}
                          onChange={(e) => setDiscount(e.target.value)}
                          placeholder="0.00"
                          className="h-[38px] w-full rounded-[8px] border border-[var(--bd)] bg-[var(--sf)] px-3 font-mono text-[13.5px] text-[var(--ink)]"
                        />
                      </div>
                    )}
                  </div>
                  {receiptKind === 'ar-collect' && (
                    <MotionDropdown
                      label="รับชำระจากลูกหนี้"
                      options={debtorOptions}
                      value={partyId}
                      onChange={setPartyId}
                    />
                  )}
                  {receiptKind === 'other' && (
                    <MotionDropdown
                      label="เครดิตบัญชี"
                      searchable
                      options={accountOptions.filter((a) => a.value !== ACC.CASH)}
                      value={otherAccount}
                      onChange={setOtherAccount}
                    />
                  )}
                </div>
              )}

              {book === 'PAY' && (
                <div className="space-y-3">
                  <MotionDropdown
                    label="ประเภทการจ่ายเงิน"
                    value={paymentKind}
                    onChange={(v) => {
                      const k = v as PaymentKind
                      setPaymentKind(k)
                      if (k === 'ap-pay' && !partyId) setPartyId(creditors[0]?.id || '')
                    }}
                    options={[
                      { value: 'expense', label: 'จ่ายค่าใช้จ่าย / ซื้อสินทรัพย์ / ถอนใช้ส่วนตัว' },
                      { value: 'ap-pay', label: 'จ่ายชำระหนี้เจ้าหนี้การค้า (รองรับส่วนลดรับ)' },
                    ]}
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[12.5px] font-semibold text-[var(--mu)]">จ่ายเงินสดสุทธิ (บาท)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="h-[38px] w-full rounded-[8px] border border-[var(--bd)] bg-[var(--sf)] px-3 font-mono text-[13.5px] text-[var(--ink)]"
                      />
                    </div>
                    {paymentKind === 'ap-pay' && (
                      <div>
                        <label className="mb-1 block text-[12.5px] font-semibold text-[var(--mu)]">ส่วนลดรับ (ถ้ามี)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={discount}
                          onChange={(e) => setDiscount(e.target.value)}
                          placeholder="0.00"
                          className="h-[38px] w-full rounded-[8px] border border-[var(--bd)] bg-[var(--sf)] px-3 font-mono text-[13.5px] text-[var(--ink)]"
                        />
                      </div>
                    )}
                  </div>
                  {paymentKind === 'ap-pay' ? (
                    <MotionDropdown
                      label="จ่ายชำระให้เจ้าหนี้"
                      options={creditorOptions}
                      value={partyId}
                      onChange={setPartyId}
                    />
                  ) : (
                    <MotionDropdown
                      label="เดบิตบัญชี"
                      searchable
                      options={accountOptions.filter((a) => a.value !== ACC.CASH)}
                      value={otherAccount}
                      onChange={setOtherAccount}
                    />
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-semibold text-[var(--mu)]">บรรทัดบัญชี (เดบิต / เครดิต)</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setLines((prev) => [...prev, { account: ACC.SALES, dr: '', cr: '', partyId: '' }])
                  }
                >
                  <Plus className="h-3.5 w-3.5" /> เพิ่มบรรทัด
                </Button>
              </div>
              <div className="space-y-2">
                {lines.map((l, idx) => {
                  const needsDebtor = l.account === ACC.AR
                  const needsCreditor = l.account === ACC.AP
                  return (
                    <div
                      key={idx}
                      className="rounded-[8px] border border-[var(--bd)] bg-[var(--sf2)] p-2.5 space-y-2"
                    >
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                        <div className="sm:col-span-6">
                          <MotionDropdown
                            searchable
                            options={accountOptions}
                            value={l.account}
                            onChange={(v) =>
                              setLines((prev) =>
                                prev.map((row, i) =>
                                  i === idx
                                    ? {
                                        ...row,
                                        account: v,
                                        partyId:
                                          v === ACC.AR
                                            ? debtors[0]?.id || ''
                                            : v === ACC.AP
                                              ? creditors[0]?.id || ''
                                              : '',
                                      }
                                    : row,
                                ),
                              )
                            }
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="เดบิต"
                            value={l.dr}
                            onChange={(e) =>
                              setLines((prev) =>
                                prev.map((row, i) => (i === idx ? { ...row, dr: e.target.value, cr: e.target.value ? '' : row.cr } : row)),
                              )
                            }
                            className="h-[38px] w-full rounded-[8px] border border-[var(--bd)] bg-[var(--sf)] px-2.5 font-mono text-[13px] text-[var(--ink)]"
                          />
                        </div>
                        <div className="flex gap-1.5 sm:col-span-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="เครดิต"
                            value={l.cr}
                            onChange={(e) =>
                              setLines((prev) =>
                                prev.map((row, i) => (i === idx ? { ...row, cr: e.target.value, dr: e.target.value ? '' : row.dr } : row)),
                              )
                            }
                            className="h-[38px] w-full rounded-[8px] border border-[var(--bd)] bg-[var(--sf)] px-2.5 font-mono text-[13px] text-[var(--ink)]"
                          />
                          {lines.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                              className="flex h-[38px] w-9 shrink-0 items-center justify-center rounded-[8px] text-[var(--ft)] hover:bg-[var(--badbg)] hover:text-[var(--bad)]"
                              aria-label="ลบบรรทัด"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      {(needsDebtor || needsCreditor) && (
                        <MotionDropdown
                          label={needsDebtor ? 'ระบุลูกหนี้ (สำหรับบัญชีย่อย 110)' : 'ระบุเจ้าหนี้ (สำหรับบัญชีย่อย 201)'}
                          options={needsDebtor ? debtorOptions : creditorOptions}
                          value={l.partyId}
                          onChange={(v) =>
                            setLines((prev) => prev.map((row, i) => (i === idx ? { ...row, partyId: v } : row)))
                          }
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Live Double-Entry Checkbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-[var(--bd)] bg-[var(--sf2)] px-3.5 py-2.5 text-[13px]">
            <div className="flex flex-wrap items-center gap-4 font-mono">
              <span>
                เดบิต <b>{formatMoney(sums.dr)}</b>
              </span>
              <span>
                เครดิต <b>{formatMoney(sums.cr)}</b>
              </span>
            </div>
            {sums.dr === 0 && sums.cr === 0 ? (
              <Badge variant="muted">กรอกจำนวนเงิน</Badge>
            ) : sums.balanced ? (
              <Badge variant="ok">✓ เดบิต = เครดิต สมดุล</Badge>
            ) : (
              <Badge variant="bad">
                <AlertTriangle className="h-3 w-3" /> ผลต่าง {formatMoney(Math.abs(sums.diff))}
              </Badge>
            )}
          </div>

          {/* Test mode switch for AC101 Section 5.6 */}
          <label className="flex cursor-pointer items-start gap-2.5 rounded-[8px] border border-[var(--warnbd)] bg-[var(--warnbg)] p-3 text-[12.5px] text-[var(--warn)]">
            <input
              type="checkbox"
              checked={testMode}
              onChange={(e) => setTestMode(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#d97706]"
            />
            <div>
              <div className="flex items-center gap-1.5 font-semibold">
                <FlaskConical className="h-3.5 w-3.5" /> โหมดทดสอบระบบ (อนุญาตให้บันทึกเดบิต ≠ เครดิต)
              </div>
              <div className="mt-0.5 opacity-90">
                ใช้สำหรับทดสอบระบบตามใบงานข้อ 5.6 เพื่อให้เห็นการแจ้งเตือนงบทดลองไม่สมดุล
              </div>
            </div>
          </label>
        </div>
      )}
    </Drawer>
  )
}
