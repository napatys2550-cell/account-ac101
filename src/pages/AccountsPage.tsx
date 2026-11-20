import { useState } from 'react'
import { CheckCircle2, FileSpreadsheet, Plus } from 'lucide-react'
import {
  ACCOUNT_GROUP_NOTES,
  ACCOUNT_TYPE_LABELS,
  type AccountType,
  type Side,
} from '@/lib/accounting'
import { useBooks } from '@/store/useBooks'
import { MotionDropdown } from '@/components/ui/MotionDropdown'
import { Badge, Button, Card, Modal } from '@/components/ui/primitives'
import { toast } from '@/components/ui/MotionToast'

export function AccountsPage({ onQuickExport }: { onQuickExport: () => void }) {
  const { accounts, addAccount } = useBooks()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('expense')
  const [normal, setNormal] = useState<Side>('dr')
  const [note, setNote] = useState('')

  const handleAdd = () => {
    const cleanCode = code.trim()
    if (!cleanCode || !name.trim()) {
      toast.error('กรุณากรอกรหัสบัญชีและชื่อบัญชีให้ครบถ้วน')
      return
    }
    if (accounts.some((a) => a.code === cleanCode)) {
      toast.error(`มีรหัสบัญชี ${cleanCode} อยู่ในผังบัญชีแล้ว`)
      return
    }
    addAccount({
      code: cleanCode,
      name: name.trim(),
      type,
      normal,
      group: '',
      note: note.trim() || undefined,
    })
    setCode('')
    setName('')
    setNote('')
    setOpen(false)
    toast.saved(`เพิ่มบัญชี ${cleanCode} ${name.trim()} ในผังบัญชีแล้ว`)
  }

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold text-[var(--ink)]">ผังบัญชีกิจการซื้อมาขายไป</h2>
          <p className="text-[13px] text-[var(--mu)]">
            จำนวนทั้งหมด {accounts.length} บัญชี · ครบชุดบัญชีซื้อ–ส่งคืน–ส่วนลด–ค่าขนส่ง–ลูกหนี้–เจ้าหนี้ (ไม่มี VAT)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> เพิ่มบัญชีใหม่
          </Button>
          <Button variant="ghost" size="sm" onClick={onQuickExport}>
            <FileSpreadsheet className="h-3.5 w-3.5" /> ส่งออกผังบัญชี
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="acct-table min-w-[620px]">
          <thead>
            <tr>
              <th className="w-[90px]">รหัส</th>
              <th>ชื่อบัญชี</th>
              <th>หมวดบัญชี</th>
              <th>ด้านปกติ</th>
              <th>หน้าที่ / หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.code}>
                <td className="font-mono text-[12px] font-semibold">{a.code}</td>
                <td className="font-medium text-[var(--ink)]">{a.name}</td>
                <td>{ACCOUNT_TYPE_LABELS[a.type]}</td>
                <td>
                  <Badge variant={a.normal === 'dr' ? 'info' : 'muted'}>
                    {a.normal === 'dr' ? 'เดบิต' : 'เครดิต'}
                  </Badge>
                </td>
                <td className="text-[12.5px] text-[var(--mu)]">
                  {a.note || ACCOUNT_GROUP_NOTES[a.group] || '–'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="เพิ่มบัญชีใหม่ในผังบัญชี"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
            <Button variant="accent" onClick={handleAdd}>
              <CheckCircle2 className="h-4 w-4" /> บันทึกบัญชี
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-[12.5px] font-semibold text-[var(--mu)]">รหัสบัญชี</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="เช่น 535"
                className="h-[38px] w-full rounded-[8px] border border-[var(--bd)] bg-[var(--sf)] px-3 font-mono text-[13.5px]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[12.5px] font-semibold text-[var(--mu)]">ชื่อบัญชี</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น ค่าเบี้ยประกันภัย"
                className="h-[38px] w-full rounded-[8px] border border-[var(--bd)] bg-[var(--sf)] px-3 text-[13.5px]"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MotionDropdown
              label="หมวดบัญชี"
              value={type}
              onChange={(v) => {
                const t = v as AccountType
                setType(t)
                setNormal(t === 'asset' || t === 'expense' ? 'dr' : 'cr')
              }}
              options={[
                { value: 'asset', label: 'สินทรัพย์' },
                { value: 'liability', label: 'หนี้สิน' },
                { value: 'equity', label: 'ส่วนของเจ้าของ' },
                { value: 'revenue', label: 'รายได้' },
                { value: 'expense', label: 'ค่าใช้จ่าย' },
              ]}
            />
            <MotionDropdown
              label="ด้านปกติ"
              value={normal}
              onChange={(v) => setNormal(v as Side)}
              options={[
                { value: 'dr', label: 'เดบิต' },
                { value: 'cr', label: 'เครดิต' },
              ]}
            />
          </div>
          <div>
            <label className="mb-1 block text-[12.5px] font-semibold text-[var(--mu)]">หมายเหตุ</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
              className="h-[38px] w-full rounded-[8px] border border-[var(--bd)] bg-[var(--sf)] px-3 text-[13.5px]"
            />
          </div>
        </div>
      </Modal>
    </Card>
  )
}
