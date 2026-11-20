import { useEffect } from 'react'
import { create } from 'zustand'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, Check, Info, X, XCircle } from 'lucide-react'

/**
 * Motion Prompt #056 — Toast notification
 * - Dark card #26282c, radius 10px, min-height 52px, positioned 18px from right and 16px from bottom.
 * - Enter: slides 240px from right over 0.35s with easeOutCubic ([0.33, 1, 0.68, 1]).
 * - Inside: white check/icon inside a colored circle + white 15px text.
 * - Time-left bar: 3px tall along the bottom shrinking linearly from 100% -> 0% over display duration.
 * - Exit: slides 240px out to the right over 0.35s with easeInOutCubic ([0.65, 0, 0.35, 1]).
 */

const EASE_OUT_CUBIC = [0.33, 1, 0.68, 1] as const
const EASE_IN_OUT_CUBIC = [0.65, 0, 0.35, 1] as const

export type ToastVariant = 'saved' | 'success' | 'info' | 'warn' | 'error'

export interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
  duration: number
  actionLabel?: string
  onAction?: () => void
}

interface ToastStore {
  items: ToastItem[]
  push: (item: Omit<ToastItem, 'id'>) => string
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  items: [],
  push: (item) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    set((s) => ({ items: [...s.items.slice(-3), { ...item, id }] }))
    return id
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}))

export const toast = {
  saved: (message: string, opts?: { duration?: number; actionLabel?: string; onAction?: () => void }) =>
    useToastStore.getState().push({
      message,
      variant: 'saved',
      duration: opts?.duration ?? (opts?.onAction ? 4500 : 2400),
      actionLabel: opts?.actionLabel,
      onAction: opts?.onAction,
    }),
  success: (message: string, opts?: { duration?: number; actionLabel?: string; onAction?: () => void }) =>
    useToastStore.getState().push({
      message,
      variant: 'success',
      duration: opts?.duration ?? (opts?.onAction ? 4500 : 2400),
      actionLabel: opts?.actionLabel,
      onAction: opts?.onAction,
    }),
  info: (message: string, opts?: { duration?: number }) =>
    useToastStore.getState().push({
      message,
      variant: 'info',
      duration: opts?.duration ?? 2400,
    }),
  warn: (message: string, opts?: { duration?: number }) =>
    useToastStore.getState().push({
      message,
      variant: 'warn',
      duration: opts?.duration ?? 3200,
    }),
  error: (message: string, opts?: { duration?: number }) =>
    useToastStore.getState().push({
      message,
      variant: 'error',
      duration: opts?.duration ?? 3600,
    }),
}

const VARIANT_META: Record<ToastVariant, { bg: string; bar: string; Icon: typeof Check }> = {
  saved: { bg: '#2563eb', bar: '#3b82f6', Icon: Check },
  success: { bg: '#16a34a', bar: '#22c55e', Icon: Check },
  info: { bg: '#2563eb', bar: '#3b82f6', Icon: Info },
  warn: { bg: '#d97706', bar: '#f59e0b', Icon: AlertTriangle },
  error: { bg: '#dc2626', bar: '#ef4444', Icon: XCircle },
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const { bg, bar, Icon } = VARIANT_META[item.variant]

  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(item.id), item.duration + 350)
    return () => window.clearTimeout(timer)
  }, [item.id, item.duration, onDismiss])

  return (
    <motion.div
      layout
      initial={{ x: 240, opacity: 0 }}
      animate={{
        x: 0,
        opacity: 1,
        transition: { duration: 0.35, ease: EASE_OUT_CUBIC },
      }}
      exit={{
        x: 240,
        opacity: 0,
        transition: { duration: 0.35, ease: EASE_IN_OUT_CUBIC },
      }}
      role="status"
      aria-live="polite"
      className="relative flex min-h-[52px] min-w-[230px] max-w-[380px] items-center gap-3 overflow-hidden rounded-[10px] border border-white/10 bg-[#26282c] px-3.5 py-2.5 text-white shadow-[0_14px_34px_-12px_rgba(0,0,0,0.55)]"
    >
      <span
        style={{ backgroundColor: bg }}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white"
      >
        <Icon className="h-3.5 w-3.5 stroke-[2.5]" />
      </span>

      <span className="flex-1 text-[14.5px] font-medium leading-snug text-white">
        {item.message}
      </span>

      {item.actionLabel && item.onAction && (
        <button
          type="button"
          onClick={() => {
            item.onAction?.()
            onDismiss(item.id)
          }}
          className="shrink-0 rounded-md bg-white/15 px-2.5 py-1 text-[12px] font-semibold text-white transition hover:bg-white/25"
        >
          {item.actionLabel}
        </button>
      )}

      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="ปิดการแจ้งเตือน"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white/60 transition hover:bg-white/10 hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Time-left bar: 3px tall, shrinks linearly after 0.35s enter */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{
          delay: 0.35,
          duration: item.duration / 1000,
          ease: 'linear',
        }}
        style={{ backgroundColor: bar, transformOrigin: 'left center' }}
        className="absolute bottom-0 left-[10px] right-[10px] h-[3px] rounded-full"
      />
    </motion.div>
  )
}

export function ToastViewport() {
  const items = useToastStore((s) => s.items)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <div className="no-print pointer-events-none fixed bottom-[16px] right-[18px] z-[120] flex flex-col items-end gap-2.5 max-sm:bottom-[72px] max-sm:left-3 max-sm:right-3 max-sm:items-stretch">
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <div key={item.id} className="pointer-events-auto">
            <ToastCard item={item} onDismiss={dismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
