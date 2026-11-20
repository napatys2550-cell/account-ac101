import { useMemo, useRef, useState } from 'react'
import {
  Bookmark,
  Database,
  FileSpreadsheet,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import {
  BOOKS,
  BOOK_ORDER,
  accountName,
  lineTotals,
  type Book,
  type Entry,
  type SortKey,
} from '@/lib/accounting'
import { formatDateShort, formatMoney } from '@/lib/format'
import { parseJsonBackup } from '@/lib/export'
import { useBooks } from '@/store/useBooks'
import { MotionDropdown } from '@/components/ui/MotionDropdown'
import { Badge, Button, Card, JournalBadge, Modal } from '@/components/ui/primitives'
import { toast } from '@/components/ui/MotionToast'

export function EntriesPage({
  onOpenEntry,
  onOpenCreate,
  onEditEntry,
  onQuickExport,
}: {
  onOpenEntry: (e: Entry) => void
  onOpenCreate: (book?: Book) => void
  onEditEntry: (e: Entry) => void
  onQuickExport: () => void
}) {
  const {
    entries,
    accounts,
    savedViews,
    deleteEntry,
    deleteEntries,
    restoreEntries,
    loadSampleData,
    clearAllEntries,
    importDataset,
    saveView,
    deleteView,
  } = useBooks()

  const [query, setQuery] = useState('')
  const [bookFilter, setBookFilter] = useState<string>('')
  const [sortBy, setSortBy] = useState<SortKey>('date-asc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showViews, setShowViews] = useState(false)
  const [viewName, setViewName] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = entries.filter((e) => {
      if (bookFilter && e.book !== bookFilter) return false
      if (!q) return true
      const hay = [
        e.docNo,
        e.description,
        e.reason,
        e.date,
        BOOKS[e.book].name,
        ...e.lines.map((l) => `${l.account} ${accountName(accounts, l.account)}`),
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })

    list.sort((a, b) => {
      if (sortBy === 'date-desc') return b.date.localeCompare(a.date) || b.createdAt - a.createdAt
      if (sortBy === 'amt-desc') return lineTotals(b.lines).dr - lineTotals(a.lines).dr
      if (sortBy === 'amt-asc') return lineTotals(a.lines).dr - lineTotals(b.lines).dr
      if (sortBy === 'doc') return a.docNo.localeCompare(b.docNo)
      return a.date.localeCompare(b.date) || a.createdAt - b.createdAt
    })
    return list
  }, [entries, accounts, query, bookFilter, sortBy])

  const allChecked = filtered.length > 0 && filtered.every((e) => selected.has(e.id))

  const toggleAll = () => {
    if (allChecked) setSelected(new Set())
    else setSelected(new Set(filtered.map((e) => e.id)))
  }

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBulkDelete = () => {
    const removed = deleteEntries([...selected])
    setSelected(new Set())
    toast.saved(`ลบ ${removed.length} รายการแล้ว`, {
      actionLabel: 'เลิกทำ',
      onAction: () => {
        restoreEntries(removed)
        toast.success(`กู้คืน ${removed.length} รายการแล้ว`)
      },
    })
  }

  const handleDeleteOne = (e: Entry) => {
    const removed = deleteEntry(e.id)
    if (!removed) return
    toast.saved(`ลบรายการ ${removed.docNo} แล้ว`, {
      actionLabel: 'เลิกทำ',
      onAction: () => {
        restoreEntries([removed])
        toast.success(`กู้คืน ${removed.docNo} แล้ว`)
      },
    })
  }

  const handleImport = async (file?: File) => {
    if (!file) return
    try {
      const data = parseJsonBackup(await file.text())
      importDataset(data)
      toast.success(`นำเข้าข้อมูล ${data.entries.length} รายการเรียบร้อยแล้ว`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ไม่สามารถนำเข้าไฟล์ JSON ได้')
    }
  }

  const totalDr = filtered.reduce((s, e) => s + lineTotals(e.lines).dr, 0)
  const totalCr = filtered.reduce((s, e) => s + lineTotals(e.lines).cr, 0)

  return (
    <div className="space-y-3.5">
      <Card>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[18px] font-bold text-[var(--ink)]">รายการค้าทั้งหมด</h2>
            <p className="text-[13px] text-[var(--mu)]">
              สมุดรายวันเฉพาะ 4 เล่ม + สมุดรายวันทั่วไป พร้อมเหตุผลการเลือกสมุด · แสดง {filtered.length} จาก {entries.length} รายการ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => onOpenCreate('PUR')}>
              <Plus className="h-3.5 w-3.5" /> บันทึกรายการ
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                loadSampleData()
                toast.saved('โหลดรายการค้าตัวอย่าง (29 รายการ) แล้ว')
              }}
            >
              <Database className="h-3.5 w-3.5" /> กดปุ่มโหลดตัวอย่างเพื่อดูรายการค้า
            </Button>
            <Button variant="ghost" size="sm" onClick={onQuickExport}>
              <FileSpreadsheet className="h-3.5 w-3.5" /> ส่งออก
            </Button>
            <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" /> นำเข้า JSON
            </Button>
            <Button variant="danger" size="sm" onClick={() => setConfirmClear(true)}>
              ล้างข้อมูล
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                handleImport(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </div>
        </div>

        {/* Filters Row with MotionDropdown (#053) */}
        <div className="mb-3.5 grid grid-cols-1 gap-2.5 md:grid-cols-12">
          <div className="relative md:col-span-5">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ft)]" />
            <input
              id="entries-search"
              name="search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาเลขที่เอกสาร / รายละเอียด / เหตุผล / ชื่อบัญชี…"
              className="h-[38px] w-full rounded-[8px] border border-[var(--bd)] bg-[var(--sf)] pl-9 pr-3 text-[13.5px] text-[var(--ink)] placeholder:text-[var(--ft)]"
            />
          </div>
          <div className="md:col-span-3">
            <MotionDropdown
              value={bookFilter}
              onChange={setBookFilter}
              placeholder="ทุกสมุดรายวัน"
              options={[
                { value: '', label: 'ทุกสมุดรายวัน' },
                ...BOOK_ORDER.map((b) => ({ value: b, label: BOOKS[b].name })),
              ]}
            />
          </div>
          <div className="md:col-span-3">
            <MotionDropdown
              value={sortBy}
              onChange={(v) => setSortBy(v as SortKey)}
              options={[
                { value: 'date-asc', label: 'วันที่ · เก่า → ใหม่' },
                { value: 'date-desc', label: 'วันที่ · ใหม่ → เก่า' },
                { value: 'amt-desc', label: 'จำนวนเงิน · มาก → น้อย' },
                { value: 'amt-asc', label: 'จำนวนเงิน · น้อย → มาก' },
                { value: 'doc', label: 'เลขที่เอกสาร' },
              ]}
            />
          </div>
          <div className="relative md:col-span-1">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setShowViews((v) => !v)}
              title="มุมมองที่บันทึกไว้"
            >
              <Bookmark className="h-4 w-4" />
            </Button>
            {showViews && (
              <div className="absolute right-0 top-[44px] z-40 w-[260px] overflow-hidden rounded-[9px] border border-[var(--bd)] bg-[var(--sf)] shadow-[var(--shl)]">
                <div className="border-b border-[var(--bd2)] px-3 py-2 text-[12px] font-bold text-[var(--mu)]">
                  มุมมองตัวกรองที่บันทึกไว้
                </div>
                {savedViews.length === 0 ? (
                  <div className="px-3 py-3 text-center text-[12px] text-[var(--ft)]">ยังไม่มีมุมมองที่บันทึก</div>
                ) : (
                  savedViews.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between border-b border-[var(--bd2)] px-3 py-2 text-[13px] hover:bg-[var(--sf2)]"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setBookFilter(v.book)
                          setQuery(v.q)
                          setSortBy(v.sort)
                          setShowViews(false)
                        }}
                        className="flex-1 truncate text-left font-medium text-[var(--ink)]"
                      >
                        {v.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteView(v.id)}
                        className="ml-2 text-[var(--ft)] hover:text-[var(--bad)]"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
                <div className="flex gap-1.5 bg-[var(--sf2)] p-2">
                  <input
                    value={viewName}
                    onChange={(e) => setViewName(e.target.value)}
                    placeholder="ตั้งชื่อมุมมอง…"
                    className="h-8 flex-1 rounded-md border border-[var(--bd)] bg-[var(--sf)] px-2 text-[12.5px]"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!viewName.trim()) return
                      saveView({ name: viewName.trim(), book: bookFilter as Book | '', q: query, sort: sortBy })
                      setViewName('')
                      toast.saved('บันทึกมุมมองตัวกรองแล้ว')
                    }}
                  >
                    บันทึก
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Search className="mx-auto mb-2 h-8 w-8 text-[var(--ft)]" />
            <p className="mb-3 text-[13.5px] text-[var(--mu)]">
              {query || bookFilter ? 'ไม่พบรายการค้าตามเงื่อนไขที่ค้นหา' : 'ยังไม่มีรายการค้าในระบบ'}
            </p>
            {query || bookFilter ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuery('')
                  setBookFilter('')
                }}
              >
                ล้างตัวกรอง
              </Button>
            ) : (
              <Button
                variant="accent"
                size="sm"
                onClick={() => {
                  loadSampleData()
                  toast.saved('โหลดรายการค้าตัวอย่างแล้ว')
                }}
              >
                <Database className="h-3.5 w-3.5" /> กดปุ่มโหลดตัวอย่างเพื่อดูรายการค้า
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="acct-table min-w-[880px]">
              <thead>
                <tr>
                  <th className="w-9">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={toggleAll}
                      aria-label="เลือกทั้งหมด"
                      className="h-4 w-4 accent-[var(--ink)]"
                    />
                  </th>
                  <th>วันที่</th>
                  <th>เลขที่</th>
                  <th>สมุด</th>
                  <th>รายละเอียด &amp; เหตุผลการเลือกสมุด</th>
                  <th className="num">เดบิต</th>
                  <th className="num">เครดิต</th>
                  <th>สถานะ</th>
                  <th className="no-print w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const s = lineTotals(e.lines)
                  return (
                    <tr
                      key={e.id}
                      onClick={() => onOpenEntry(e)}
                      className={`clickable ${e.isTest ? 'is-test' : ''}`}
                    >
                      <td onClick={(ev) => ev.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(e.id)}
                          onChange={() => toggleOne(e.id)}
                          aria-label={`เลือก ${e.docNo}`}
                          className="h-4 w-4 accent-[var(--ink)]"
                        />
                      </td>
                      <td className="whitespace-nowrap text-[12.5px] text-[var(--mu)]">
                        {formatDateShort(e.date)}
                      </td>
                      <td className="whitespace-nowrap font-mono text-[12px] font-semibold">
                        {e.docNo}
                        {e.closing && <Badge variant="muted" className="ml-1.5">ปิดบัญชี</Badge>}
                      </td>
                      <td>
                        <JournalBadge book={e.book} compact />
                      </td>
                      <td>
                        <div className="font-medium text-[var(--ink)]">{e.description}</div>
                        <div className="mt-0.5 text-[12px] text-[var(--mu)]">{e.reason}</div>
                      </td>
                      <td className="num">{formatMoney(s.dr)}</td>
                      <td className="num">{formatMoney(s.cr)}</td>
                      <td>
                        {s.balanced ? (
                          <Badge variant="ok">✓ ดุล</Badge>
                        ) : (
                          <Badge variant="bad">✗ ไม่ดุล</Badge>
                        )}
                      </td>
                      <td className="no-print whitespace-nowrap" onClick={(ev) => ev.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onEditEntry(e)}
                          aria-label="แก้ไข"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--ft)] hover:bg-[var(--bd2)] hover:text-[var(--ink)]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteOne(e)}
                          aria-label="ลบ"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--ft)] hover:bg-[var(--badbg)] hover:text-[var(--bad)]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5}>รวมรายการที่แสดง ({filtered.length} รายการ)</td>
                  <td className="num">{formatMoney(totalDr)}</td>
                  <td className="num">{formatMoney(totalCr)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Floating Bulk Action Bar */}
      {selected.size > 0 && (
        <div className="no-print fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-[var(--ink)] bg-[var(--sf)] py-1.5 pl-4 pr-2 shadow-[var(--shl)]">
          <span className="font-mono text-[13px] font-semibold">เลือก {selected.size} รายการ</span>
          <Button variant="danger" size="sm" onClick={handleBulkDelete}>
            <Trash2 className="h-3.5 w-3.5" /> ลบที่เลือก
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            ยกเลิก
          </Button>
        </div>
      )}

      {/* Confirm Clear Modal */}
      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="ยืนยันการล้างรายการค้าทั้งหมด"
        subtitle="การดำเนินการนี้จะลบรายการค้าทั้งหมดในเบราว์เซอร์ (สามารถกดโหลดตัวอย่างกลับมาได้ตลอด)"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmClear(false)}>
              ยกเลิก
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                clearAllEntries()
                setConfirmClear(false)
                toast.info('ล้างรายการค้าทั้งหมดแล้ว')
              }}
            >
              ล้างรายการทั้งหมด
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] text-[var(--mu)]">
          คุณกำลังจะลบรายการค้าทั้งหมด {entries.length} รายการ หากต้องการเก็บข้อมูลไว้ กรุณาส่งออกไฟล์ JSON สำรองก่อน
        </p>
      </Modal>
    </div>
  )
}
