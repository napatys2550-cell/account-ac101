import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_COMPANY,
  DEFAULT_PARTIES,
  createSampleEntries,
  nextDocNo,
  type Account,
  type Book,
  type CompanyInfo,
  type Entry,
  type ExportRecord,
  type Party,
  type SavedView,
} from '@/lib/accounting'
import { DEFAULT_EXPORT_OPTIONS, type ExportOptions } from '@/lib/export'

export type ThemeMode = 'light' | 'dark'

interface BooksState {
  company: CompanyInfo
  accounts: Account[]
  parties: Party[]
  entries: Entry[]
  theme: ThemeMode
  testMode: boolean
  savedViews: SavedView[]
  exportOpts: ExportOptions
  exportHistory: ExportRecord[]

  // Actions
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  setTestMode: (on: boolean) => void
  setPeriod: (period: string) => void
  updateCompany: (patch: Partial<CompanyInfo>) => void
  addEntry: (entry: Omit<Entry, 'id' | 'createdAt' | 'docNo'> & { docNo?: string }) => Entry
  updateEntry: (id: string, patch: Partial<Omit<Entry, 'id' | 'createdAt'>>) => void
  deleteEntry: (id: string) => Entry | undefined
  deleteEntries: (ids: string[]) => Entry[]
  restoreEntries: (items: Entry[]) => void
  loadSampleData: () => void
  clearAllEntries: () => void
  importDataset: (data: { company: CompanyInfo; accounts: Account[]; parties: Party[]; entries: Entry[] }) => void
  addParty: (party: Omit<Party, 'id'>) => Party
  addAccount: (account: Account) => void
  saveView: (view: Omit<SavedView, 'id'>) => void
  deleteView: (id: string) => void
  setExportOpts: (patch: Partial<ExportOptions>) => void
  resetExportOpts: () => void
  addExportHistory: (rec: Omit<ExportRecord, 'id'>) => void
  clearExportHistory: () => void
  postClosingInventory: (params: {
    period: string
    endingBaht: number
    cogsLines: Entry['lines']
    invLines: Entry['lines']
    date: string
  }) => void
}

function applyThemeClass(theme: ThemeMode) {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }
}

export const useBooks = create<BooksState>()(
  persist(
    (set, get) => ({
      company: DEFAULT_COMPANY,
      accounts: DEFAULT_ACCOUNTS,
      parties: DEFAULT_PARTIES,
      entries: createSampleEntries(),
      theme: 'light',
      testMode: false,
      savedViews: [],
      exportOpts: DEFAULT_EXPORT_OPTIONS,
      exportHistory: [],

      setTheme: (theme) => {
        applyThemeClass(theme)
        set({ theme })
      },
      toggleTheme: () => {
        const next: ThemeMode = get().theme === 'dark' ? 'light' : 'dark'
        applyThemeClass(next)
        set({ theme: next })
      },
      setTestMode: (testMode) => set({ testMode }),
      setPeriod: (period) => set((s) => ({ company: { ...s.company, period } })),
      updateCompany: (patch) => set((s) => ({ company: { ...s.company, ...patch } })),

      addEntry: (raw) => {
        const docNo = raw.docNo?.trim() || nextDocNo(get().entries, raw.book)
        const created: Entry = {
          ...raw,
          docNo,
          id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          createdAt: Date.now(),
        }
        set((s) => ({ entries: [...s.entries, created] }))
        return created
      },

      updateEntry: (id, patch) => {
        set((s) => ({
          entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        }))
      },

      deleteEntry: (id) => {
        const found = get().entries.find((e) => e.id === id)
        if (!found) return undefined
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }))
        return found
      },

      deleteEntries: (ids) => {
        const idSet = new Set(ids)
        const removed = get().entries.filter((e) => idSet.has(e.id))
        set((s) => ({ entries: s.entries.filter((e) => !idSet.has(e.id)) }))
        return removed
      },

      restoreEntries: (items) => {
        set((s) => {
          const existing = new Set(s.entries.map((e) => e.id))
          const toAdd = items.filter((i) => !existing.has(i.id))
          return { entries: [...s.entries, ...toAdd] }
        })
      },

      loadSampleData: () => {
        set({
          company: DEFAULT_COMPANY,
          accounts: DEFAULT_ACCOUNTS,
          parties: DEFAULT_PARTIES,
          entries: createSampleEntries(),
        })
      },

      clearAllEntries: () => set({ entries: [] }),

      importDataset: (data) =>
        set({
          company: data.company,
          accounts: data.accounts,
          parties: data.parties,
          entries: data.entries,
        }),

      addParty: (party) => {
        const prefix = party.kind === 'debtor' ? 'AR' : 'AP'
        const same = get().parties.filter((p) => p.kind === party.kind)
        const id = `${prefix}-${String(same.length + 1).padStart(2, '0')}`
        const created: Party = { ...party, id }
        set((s) => ({ parties: [...s.parties, created] }))
        return created
      },

      addAccount: (account) => {
        set((s) => ({
          accounts: [...s.accounts, account].sort((a, b) => a.code.localeCompare(b.code)),
        }))
      },

      saveView: (view) => {
        const created: SavedView = { ...view, id: `v-${Date.now()}` }
        set((s) => ({ savedViews: [...s.savedViews, created] }))
      },

      deleteView: (id) => {
        set((s) => ({ savedViews: s.savedViews.filter((v) => v.id !== id) }))
      },

      setExportOpts: (patch) => set((s) => ({ exportOpts: { ...s.exportOpts, ...patch } })),
      resetExportOpts: () => set({ exportOpts: DEFAULT_EXPORT_OPTIONS }),

      addExportHistory: (rec) => {
        const created: ExportRecord = { ...rec, id: `h-${Date.now()}` }
        set((s) => ({ exportHistory: [created, ...s.exportHistory].slice(0, 10) }))
      },
      clearExportHistory: () => set({ exportHistory: [] }),

      postClosingInventory: ({ period, endingBaht, cogsLines, invLines, date }) => {
        set((s) => {
          const kept = s.entries.filter((e) => !(e.closing && e.date.startsWith(period)))
          const doc1 = nextDocNo(kept, 'JNL')
          const e1: Entry = {
            id: `close-cogs-${Date.now()}`,
            book: 'JNL',
            date,
            docNo: doc1,
            description: 'ปิดบัญชี: โอนซื้อ–ส่งคืน–ส่วนลดรับ–ขนส่งเข้า เข้าต้นทุนขาย',
            reason: 'รายการปิดบัญชีต้นทุนซื้อแบบสิ้นงวด (Periodic) จึงบันทึกในสมุดรายวันทั่วไป',
            lines: cogsLines,
            closing: true,
            createdAt: Date.now(),
          }
          const doc2 = nextDocNo([...kept, e1], 'JNL')
          const e2: Entry = {
            id: `close-inv-${Date.now() + 1}`,
            book: 'JNL',
            date,
            docNo: doc2,
            description: `ปิดบัญชี: บันทึกสินค้าคงเหลือปลายงวด (ตรวจนับได้ ${endingBaht.toLocaleString('th-TH')} บาท)`,
            reason: 'บันทึกสินค้าคงเหลือปลายงวดเพื่อหักออกจากต้นทุนขาย จึงบันทึกในสมุดรายวันทั่วไป',
            lines: invLines,
            closing: true,
            createdAt: Date.now() + 1,
          }
          return { entries: [...kept, e1, e2] }
        })
      },
    }),
    {
      name: 'maewnam-books-v3',
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyThemeClass(state.theme)
      },
    },
  ),
)

export type ActiveTab =
  | 'dash'
  | 'entries'
  | 'journals'
  | 'ledger'
  | 'subledger'
  | 'trial'
  | 'statements'
  | 'export'
  | 'accounts'

export const BOOK_COLORS: Record<Book, { color: string; soft: string }> = {
  PUR: { color: 'var(--j-pur)', soft: 'var(--j-pur-soft)' },
  SAL: { color: 'var(--j-sal)', soft: 'var(--j-sal-soft)' },
  REC: { color: 'var(--j-rec)', soft: 'var(--j-rec-soft)' },
  PAY: { color: 'var(--j-pay)', soft: 'var(--j-pay-soft)' },
  JNL: { color: 'var(--j-jnl)', soft: 'var(--j-jnl-soft)' },
}
