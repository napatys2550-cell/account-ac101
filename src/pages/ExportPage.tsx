import { useMemo } from 'react'
import {
  Clock,
  Download,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Printer,
  RotateCcw,
} from 'lucide-react'
import {
  DOC_KIND_LABELS,
  buildCsvContent,
  buildFormalHtml,
  buildJsonBackup,
  runExport,
  type ExportDocKind,
  type ExportFormat,
} from '@/lib/export'
import { formatBytes, formatTimestamp } from '@/lib/format'
import { useBooks } from '@/store/useBooks'
import { MotionDropdown } from '@/components/ui/MotionDropdown'
import { Badge, Button, Card } from '@/components/ui/primitives'
import { toast } from '@/components/ui/MotionToast'

const FORMAT_TABS: Array<{ id: ExportFormat; label: string; desc: string }> = [
  { id: 'xlsx', label: 'Excel (.xlsx)', desc: 'ไฟล์ Workbook Excel จริง แยกชีตตามรายงาน พร้อมสูตรรูปแบบตัวเลข #,##0.00 ไม่เตือนไฟล์เสียหาย' },
  { id: 'pdf', label: 'PDF (พิมพ์)', desc: 'เอกสารทางการแบบ Vector คมชัดทุกตัวอักษรไทย สั่งพิมพ์หรือบันทึกเป็น PDF ได้ทันที' },
  { id: 'html', label: 'HTML ทางการ', desc: 'ไฟล์รายงานฉบับสมบูรณ์เปิดอ่านและสั่งพิมพ์ได้ในทุกอุปกรณ์โดยไม่ต้องติดตั้งโปรแกรม' },
  { id: 'csv', label: 'CSV (UTF-8)', desc: 'CSV เข้ารหัส UTF-8 พร้อม BOM เปิดใน Excel ภาษาไทยไม่เพี้ยน' },
  { id: 'json', label: 'JSON สำรอง', desc: 'สำรองข้อมูลผังบัญชี ลูกหนี้/เจ้าหนี้ และรายการค้าทั้งหมดสำหรับนำเข้าซ้ำ' },
]

export function ExportPage() {
  const {
    company,
    accounts,
    parties,
    entries,
    exportOpts,
    exportHistory,
    setExportOpts,
    resetExportOpts,
    addExportHistory,
    clearExportHistory,
  } = useBooks()

  const dataset = useMemo(
    () => ({ company, accounts, parties, entries }),
    [company, accounts, parties, entries],
  )

  const docOptions = useMemo(
    () =>
      (Object.keys(DOC_KIND_LABELS) as ExportDocKind[]).map((k) => ({
        value: k,
        label: DOC_KIND_LABELS[k],
      })),
    [],
  )

  const previewHtml = useMemo(() => buildFormalHtml(dataset, exportOpts), [dataset, exportOpts])
  const previewRaw = useMemo(() => {
    if (exportOpts.format === 'csv') return buildCsvContent(dataset, exportOpts)
    if (exportOpts.format === 'json') return buildJsonBackup(dataset)
    return ''
  }, [dataset, exportOpts])

  const activeFormatMeta = FORMAT_TABS.find((f) => f.id === exportOpts.format) ?? FORMAT_TABS[0]

  const handleExport = (overrideFmt?: ExportFormat) => {
    const opts = overrideFmt ? { ...exportOpts, format: overrideFmt } : exportOpts
    try {
      const res = runExport(dataset, opts)
      addExportHistory({
        name: res.filename,
        format: opts.format.toUpperCase(),
        docKind: DOC_KIND_LABELS[opts.kind],
        size: res.size,
        period: company.period,
        createdAt: formatTimestamp(),
      })
      if (res.printed) {
        toast.info('เปิดหน้าต่างพิมพ์แล้ว — เลือก "บันทึกเป็น PDF" เพื่อรับไฟล์ Vector คมชัด')
      } else {
        toast.saved(`ส่งออกไฟล์ ${res.filename} แล้ว`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ไม่สามารถส่งออกไฟล์ได้')
    }
  }

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
      {/* Left Control Rail */}
      <Card className="space-y-4 lg:sticky lg:top-[116px] lg:col-span-4">
        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--ft)]">
            เอกสารที่ต้องการส่งออก
          </div>
          <MotionDropdown
            label="เลือกชุดเอกสาร"
            options={docOptions}
            value={exportOpts.kind}
            onChange={(v) => setExportOpts({ kind: v as ExportDocKind })}
          />
          <label className="mt-2.5 flex cursor-pointer items-center justify-between text-[13px] text-[var(--ink3)]">
            <span>รวมรายการปิดบัญชีสินค้า</span>
            <input
              type="checkbox"
              checked={exportOpts.includeClosing}
              onChange={(e) => setExportOpts({ includeClosing: e.target.checked })}
              className="h-4 w-4 accent-[var(--ink)]"
            />
          </label>
        </div>

        <div className="border-t border-[var(--bd2)] pt-3.5">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--ft)]">
            รูปแบบไฟล์ทางการ
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-2">
            {FORMAT_TABS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setExportOpts({ format: f.id })}
                className={`rounded-[7px] border px-2.5 py-2 text-[12.5px] font-semibold transition ${
                  exportOpts.format === f.id
                    ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--sf)]'
                    : 'border-[var(--bd)] bg-[var(--sf2)] text-[var(--mu)] hover:text-[var(--ink)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-[var(--mu)]">{activeFormatMeta.desc}</p>
        </div>

        <div className="space-y-2.5 border-t border-[var(--bd2)] pt-3.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ft)]">
            รูปแบบหน้ากระดาษและหัวจดหมาย
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MotionDropdown
              label="ขนาดกระดาษ"
              value={exportOpts.paper}
              onChange={(v) => setExportOpts({ paper: v as 'a4' | 'letter' })}
              options={[
                { value: 'a4', label: 'A4 (มาตรฐานไทย)' },
                { value: 'letter', label: 'Letter' },
              ]}
            />
            <MotionDropdown
              label="แนวกระดาษ"
              value={exportOpts.landscape ? 'landscape' : 'portrait'}
              onChange={(v) => setExportOpts({ landscape: v === 'landscape' })}
              options={[
                { value: 'portrait', label: 'แนวตั้ง' },
                { value: 'landscape', label: 'แนวนอน' },
              ]}
            />
          </div>

          <div className="space-y-1.5 pt-1 text-[13px] text-[var(--ink3)]">
            <label className="flex cursor-pointer items-center justify-between">
              <span>หัวจดหมายกิจการและหน่วย (บาท)</span>
              <input
                type="checkbox"
                checked={exportOpts.letterhead}
                onChange={(e) => setExportOpts({ letterhead: e.target.checked })}
                className="h-4 w-4 accent-[var(--ink)]"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between">
              <span>ช่องลายเซ็นผู้จัดทำ / ผู้สอบทาน</span>
              <input
                type="checkbox"
                checked={exportOpts.signature}
                onChange={(e) => setExportOpts({ signature: e.target.checked })}
                className="h-4 w-4 accent-[var(--ink)]"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between">
              <span>ท้ายกระดาษและวันเวลาที่พิมพ์</span>
              <input
                type="checkbox"
                checked={exportOpts.footer}
                onChange={(e) => setExportOpts({ footer: e.target.checked })}
                className="h-4 w-4 accent-[var(--ink)]"
              />
            </label>
          </div>

          {exportOpts.signature && (
            <div className="grid grid-cols-1 gap-2 pt-1">
              <input
                id="export-prepared-by"
                name="preparedBy"
                type="text"
                value={exportOpts.preparedBy}
                onChange={(e) => setExportOpts({ preparedBy: e.target.value })}
                placeholder="ชื่อผู้จัดทำบัญชี"
                aria-label="ชื่อผู้จัดทำบัญชี"
                className="h-[34px] rounded-[7px] border border-[var(--bd)] bg-[var(--sf)] px-2.5 text-[12.5px]"
              />
              <input
                id="export-approved-by"
                name="approvedBy"
                type="text"
                value={exportOpts.approvedBy}
                onChange={(e) => setExportOpts({ approvedBy: e.target.value })}
                placeholder="ชื่อผู้สอบทาน / ผู้อนุมัติ"
                aria-label="ชื่อผู้สอบทาน / ผู้อนุมัติ"
                className="h-[34px] rounded-[7px] border border-[var(--bd)] bg-[var(--sf)] px-2.5 text-[12.5px]"
              />
            </div>
          )}
        </div>

        <div className="space-y-2 border-t border-[var(--bd2)] pt-3.5">
          <Button variant="accent" className="w-full" onClick={() => handleExport()}>
            {exportOpts.format === 'pdf' ? (
              <Printer className="h-4 w-4" />
            ) : exportOpts.format === 'xlsx' ? (
              <FileSpreadsheet className="h-4 w-4" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {exportOpts.format === 'pdf'
              ? 'พิมพ์ / บันทึกเป็น PDF ทางการ'
              : `ดาวน์โหลดไฟล์ ${exportOpts.format.toUpperCase()}`}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" size="sm" onClick={() => handleExport('xlsx')}>
              <FileSpreadsheet className="h-3.5 w-3.5" /> Excel (.xlsx)
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleExport('pdf')}>
              <Printer className="h-3.5 w-3.5" /> พิมพ์ PDF
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="flex-1" onClick={() => handleExport('json')}>
              <FileCode2 className="h-3.5 w-3.5" /> สำรอง JSON
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label="คืนค่าการตั้งค่าส่งออก"
              title="คืนค่าการตั้งค่าส่งออก"
              onClick={() => {
                resetExportOpts()
                toast.info('คืนค่าการตั้งค่าส่งออกแล้ว')
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Right Live Official Preview + History */}
      <div className="space-y-3.5 lg:col-span-8">
        <Card className="p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[17px] font-bold text-[var(--ink)]">
                พรีวิวเอกสารทางการ — {DOC_KIND_LABELS[exportOpts.kind]}
              </h2>
              <p className="text-[12.5px] text-[var(--mu)]">
                หัวจดหมายมาตรฐานบัญชีไทย · เส้นคู่ใต้ยอดรวม · รองรับภาษาไทย 100%
              </p>
            </div>
            <Badge variant="ok">พร้อมส่งออก {exportOpts.format.toUpperCase()}</Badge>
          </div>

          {exportOpts.format === 'csv' || exportOpts.format === 'json' ? (
            <pre className="max-h-[65vh] overflow-auto rounded-[8px] border border-[var(--bd)] bg-[var(--sf2)] p-4 font-mono text-[12px] leading-relaxed text-[var(--ink2)]">
              {previewRaw.slice(0, 8000)}
              {previewRaw.length > 8000 ? `\n\n… (ตัดทอนเฉพาะพรีวิว — ไฟล์จริงมีทั้งหมด ${previewRaw.length.toLocaleString('th-TH')} อักขระ)` : ''}
            </pre>
          ) : (
            <div className="overflow-hidden rounded-[8px] border border-[var(--bd)] bg-zinc-200/70 p-2 sm:p-4 dark:bg-zinc-900">
              <iframe
                title="พรีวิวเอกสารบัญชีทางการ"
                srcDoc={previewHtml}
                className="mx-auto h-[68vh] w-full rounded-[4px] border border-zinc-300 bg-white shadow-md"
              />
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-[15.5px] font-bold text-[var(--ink)]">ประวัติการส่งออกล่าสุด</h3>
              <p className="text-[12px] text-[var(--mu)]">บันทึกอัตโนมัติในเบราว์เซอร์</p>
            </div>
            {exportHistory.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearExportHistory}>
                ล้างประวัติ
              </Button>
            )}
          </div>
          {exportHistory.length === 0 ? (
            <div className="py-6 text-center text-[13px] text-[var(--mu)]">
              <Clock className="mx-auto mb-1.5 h-6 w-6 text-[var(--ft)]" />
              ยังไม่มีประวัติการส่งออกไฟล์
            </div>
          ) : (
            <div className="space-y-1.5">
              {exportHistory.map((h) => (
                <div
                  key={h.id}
                  className="flex flex-wrap items-center gap-2.5 rounded-[7px] border border-[var(--bd)] bg-[var(--sf2)] px-3 py-2 text-[12.5px]"
                >
                  <span className="rounded bg-[var(--ink)] px-2 py-0.5 font-mono text-[10.5px] font-bold text-[var(--sf)]">
                    {h.format}
                  </span>
                  <FileText className="h-3.5 w-3.5 text-[var(--mu)]" />
                  <span className="min-w-0 flex-1 truncate font-medium text-[var(--ink)]">{h.name}</span>
                  <span className="font-mono text-[11.5px] text-[var(--mu)]">{formatBytes(h.size)}</span>
                  <span className="text-[11.5px] text-[var(--ft)]">{h.createdAt}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
