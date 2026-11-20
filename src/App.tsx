import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  BookOpen,
  Calculator,
  FileSpreadsheet,
  FileText,
  Layers,
  LayoutDashboard,
  List,
  Moon,
  Plus,
  Scale,
  Sun,
  TableProperties,
  Users,
} from 'lucide-react'
import type { Book, Entry } from '@/lib/accounting'
import { useBooks, type ActiveTab } from '@/store/useBooks'
import { EntryDrawer } from '@/components/accounting/EntryDrawer'
import { ClosingInventoryModal } from '@/components/accounting/ClosingInventoryModal'
import { Button } from '@/components/ui/primitives'
import { ToastViewport } from '@/components/ui/MotionToast'
import { DashboardPage } from '@/pages/DashboardPage'
import { EntriesPage } from '@/pages/EntriesPage'
import { JournalPage } from '@/pages/JournalPage'
import { LedgerPage } from '@/pages/LedgerPage'
import { SubLedgerPage } from '@/pages/SubLedgerPage'
import { TrialBalancePage } from '@/pages/TrialBalancePage'
import { StatementsPage } from '@/pages/StatementsPage'
import { ExportPage } from '@/pages/ExportPage'
import { AccountsPage } from '@/pages/AccountsPage'

const NAV_ITEMS: Array<{ id: ActiveTab; label: string; Icon: typeof LayoutDashboard }> = [
  { id: 'dash', label: 'ภาพรวม', Icon: LayoutDashboard },
  { id: 'entries', label: 'รายการค้า', Icon: List },
  { id: 'journals', label: 'สมุดรายวัน 5 เล่ม', Icon: BookOpen },
  { id: 'ledger', label: 'แยกประเภททั่วไป', Icon: Layers },
  { id: 'subledger', label: 'บัญชีย่อย AR/AP', Icon: Users },
  { id: 'trial', label: 'งบทดลอง', Icon: Scale },
  { id: 'statements', label: 'งบการเงิน', Icon: FileText },
  { id: 'export', label: 'ส่งออกทางการ', Icon: FileSpreadsheet },
  { id: 'accounts', label: 'ผังบัญชี', Icon: TableProperties },
]

export function App() {
  const { company, theme, toggleTheme, setPeriod, setExportOpts } = useBooks()
  const [tab, setTab] = useState<ActiveTab>('dash')
  const [drawerMode, setDrawerMode] = useState<'view' | 'create' | 'edit' | null>(null)
  const [activeEntry, setActiveEntry] = useState<Entry | null>(null)
  const [createBook, setCreateBook] = useState<Book>('PUR')
  const [closingOpen, setClosingOpen] = useState(false)

  const openCreate = (book: Book = 'PUR') => {
    setCreateBook(book)
    setActiveEntry(null)
    setDrawerMode('create')
  }

  const openView = (entry: Entry) => {
    setActiveEntry(entry)
    setDrawerMode('view')
  }

  const openEdit = (entry: Entry) => {
    setActiveEntry(entry)
    setDrawerMode('edit')
  }

  const goExport = (kind?: Parameters<typeof setExportOpts>[0]['kind']) => {
    if (kind) setExportOpts({ kind })
    setTab('export')
  }

  return (
    <div className="min-h-screen">
      <div className="bg-ambient" aria-hidden="true" />

      {/* Sticky Top Header */}
      <header
        style={{ backgroundColor: 'var(--header-bg)' }}
        className="no-print sticky top-0 z-30 border-b border-[var(--bd)] backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-[1260px] flex-wrap items-center gap-3 px-4 py-2.5 sm:px-5">
          <button
            type="button"
            onClick={() => setTab('dash')}
            className="flex items-center gap-3 text-left"
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] border-[1.5px] border-[var(--ink)] bg-[var(--sf)] text-[17px] font-bold text-[var(--ink)]">
              บ
            </div>
            <div className="min-w-0">
              <div className="truncate text-[15.5px] font-bold leading-tight text-[var(--ink)]">
                {company.name}
              </div>
              <div className="truncate text-[11.5px] text-[var(--mu)]">
                <b className="text-[var(--ink3)]">กิจการซื้อมาขายไป</b> · สมุดรายวันเฉพาะ · ไม่มี VAT
              </div>
            </div>
          </button>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <label className="hidden items-center gap-1.5 text-[12px] text-[var(--mu)] md:flex">
              <span>งวดรายงาน</span>
              <input
                id="report-period"
                name="period"
                type="month"
                value={company.period}
                onChange={(e) => e.target.value && setPeriod(e.target.value)}
                aria-label="งวดรายงาน"
                className="h-[34px] rounded-[7px] border border-[var(--bd)] bg-[var(--sf)] px-2 font-mono text-[12.5px] text-[var(--ink)]"
              />
            </label>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'สลับเป็นธีมสว่าง' : 'สลับเป็นธีมมืด'}
              title={theme === 'dark' ? 'สลับเป็นธีมสว่าง' : 'สลับเป็นธีมมืด'}
              className="w-8 px-0"
            >
              <AnimatePresence mode="wait" initial={false}>
                {theme === 'dark' ? (
                  <motion.span
                    key="sun"
                    initial={{ rotate: -60, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 60, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <Sun className="h-4 w-4 text-amber-400" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="moon"
                    initial={{ rotate: 60, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -60, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <Moon className="h-4 w-4" />
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>

            <Button variant="ghost" size="sm" onClick={() => setClosingOpen(true)} className="hidden sm:inline-flex">
              <Calculator className="h-3.5 w-3.5" /> ปิดบัญชีสินค้า
            </Button>
            <Button variant="ghost" size="sm" onClick={() => goExport('packet')} className="hidden sm:inline-flex">
              <FileSpreadsheet className="h-3.5 w-3.5" /> ส่งออก
            </Button>
            <Button size="sm" onClick={() => openCreate('PUR')}>
              <Plus className="h-3.5 w-3.5" /> บันทึกรายการ
            </Button>
          </div>
        </div>

        {/* Horizontal Navigation Tabs */}
        <nav
          aria-label="เมนูหลัก"
          className="no-scrollbar mx-auto flex max-w-[1260px] gap-1 overflow-x-auto px-3 sm:px-5"
        >
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const active = tab === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-[13.5px] transition-colors ${
                  active ? 'font-bold text-[var(--ink)]' : 'font-medium text-[var(--mu)] hover:text-[var(--ink)]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {active && (
                  <motion.div
                    layoutId="nav-underline"
                    transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-[var(--ink)]"
                  />
                )}
              </button>
            )
          })}
        </nav>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-[1260px] px-4 pb-16 pt-5 sm:px-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.33, 1, 0.68, 1] }}
          >
            {tab === 'dash' && (
              <DashboardPage
                onNavigate={setTab}
                onOpenEntry={openView}
                onOpenCreate={openCreate}
                onOpenClosing={() => setClosingOpen(true)}
                onQuickExport={() => goExport('packet')}
              />
            )}
            {tab === 'entries' && (
              <EntriesPage
                onOpenEntry={openView}
                onOpenCreate={openCreate}
                onEditEntry={openEdit}
                onQuickExport={() => goExport('entries')}
              />
            )}
            {tab === 'journals' && (
              <JournalPage
                onOpenEntry={openView}
                onOpenCreate={openCreate}
                onQuickExport={() => goExport('journals')}
              />
            )}
            {tab === 'ledger' && <LedgerPage onQuickExport={() => goExport('ledger')} />}
            {tab === 'subledger' && <SubLedgerPage onQuickExport={() => goExport('subledger')} />}
            {tab === 'trial' && <TrialBalancePage onQuickExport={() => goExport('trial')} />}
            {tab === 'statements' && (
              <StatementsPage
                onOpenClosing={() => setClosingOpen(true)}
                onQuickExport={() => goExport('income')}
              />
            )}
            {tab === 'export' && <ExportPage />}
            {tab === 'accounts' && <AccountsPage onQuickExport={() => goExport('accounts')} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="no-print mx-auto max-w-[1260px] px-4 pb-8 text-[12px] text-[var(--ft)] sm:px-5">
        {company.name} · ระบบบัญชีสมุดรายวันเฉพาะ 5 เล่ม · ส่งออก Excel (.xlsx) · PDF ทางการ · HTML · CSV (UTF-8) · JSON — บันทึกข้อมูลอัตโนมัติในเบราว์เซอร์
      </footer>

      <EntryDrawer
        mode={drawerMode}
        entry={activeEntry}
        initialBook={createBook}
        onClose={() => setDrawerMode(null)}
        onEdit={(e) => openEdit(e)}
      />

      <ClosingInventoryModal open={closingOpen} onClose={() => setClosingOpen(false)} />

      <ToastViewport />
    </div>
  )
}

export default App
