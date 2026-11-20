import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { BOOKS, type Book } from '@/lib/accounting'
import { cn } from '@/lib/utils'

const EASE_OUT = [0.22, 0.9, 0.3, 1] as const

export function Card({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, delay, ease: EASE_OUT }}
      className={cn(
        'rounded-[10px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)] sm:p-5',
        className,
      )}
    >
      {children}
    </motion.section>
  )
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'accent'
  size?: 'sm' | 'md'
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[7px] border font-semibold transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        size === 'sm' ? 'h-8 px-2.5 text-[12.5px]' : 'h-[38px] px-3.5 text-[13.5px]',
        variant === 'primary' &&
          'border-[var(--ink)] bg-[var(--ink)] text-[var(--sf)] hover:opacity-90',
        variant === 'accent' &&
          'border-[#2563eb] bg-[#2563eb] text-white hover:bg-[#1d4ed8]',
        variant === 'ghost' &&
          'border-[var(--bd)] bg-[var(--sf)] text-[var(--ink)] hover:border-[var(--bd-strong)] hover:bg-[var(--sf2)]',
        variant === 'danger' &&
          'border-[var(--badbd)] bg-[var(--sf)] text-[var(--bad)] hover:bg-[var(--badbg)]',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Badge({
  variant = 'muted',
  className,
  children,
}: {
  variant?: 'ok' | 'bad' | 'warn' | 'info' | 'muted'
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold',
        variant === 'ok' && 'border-[var(--okbd)] bg-[var(--okbg)] text-[var(--ok)]',
        variant === 'bad' && 'border-[var(--badbd)] bg-[var(--badbg)] text-[var(--bad)]',
        variant === 'warn' && 'border-[var(--warnbd)] bg-[var(--warnbg)] text-[var(--warn)]',
        variant === 'info' && 'border-[var(--infobd)] bg-[var(--infobg)] text-[var(--info)]',
        variant === 'muted' && 'border-[var(--bd)] bg-[var(--sf2)] text-[var(--mu)]',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function JournalBadge({ book, compact = false }: { book: Book; compact?: boolean }) {
  const meta = BOOKS[book]
  return (
    <span
      style={{
        color: meta.colorVar,
        backgroundColor: meta.softVar,
        borderColor: meta.softVar,
      }}
      className="inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold"
    >
      {compact ? meta.shortName.replace('รายวัน', '') : meta.shortName}
    </span>
  )
}

export function Banner({
  variant,
  title,
  detail,
  action,
  className,
}: {
  variant: 'ok' | 'bad' | 'warn' | 'muted'
  title: string
  detail?: string
  action?: ReactNode
  className?: string
}) {
  const Icon =
    variant === 'ok'
      ? CheckCircle2
      : variant === 'bad'
        ? XCircle
        : variant === 'warn'
          ? AlertTriangle
          : Info
  return (
    <div
      className={cn(
        'mb-3.5 flex flex-wrap items-center justify-between gap-2.5 rounded-[8px] border px-3.5 py-2.5 text-[13.5px]',
        variant === 'ok' && 'border-[var(--okbd)] bg-[var(--okbg)] text-[var(--ok)]',
        variant === 'bad' && 'border-[var(--badbd)] bg-[var(--badbg)] text-[var(--bad)]',
        variant === 'warn' && 'border-[var(--warnbd)] bg-[var(--warnbg)] text-[var(--warn)]',
        variant === 'muted' && 'border-[var(--bd)] bg-[var(--sf2)] text-[var(--mu)]',
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <div className="font-semibold">{title}</div>
          {detail && <div className="mt-0.5 text-[12.5px] opacity-85">{detail}</div>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'max-w-[540px]',
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  maxWidth?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.24, ease: EASE_OUT }}
            role="dialog"
            aria-modal="true"
            className={cn(
              'relative z-10 flex max-h-[88vh] w-full flex-col overflow-hidden rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] shadow-[var(--shl)]',
              maxWidth,
            )}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[var(--bd)] px-5 py-4">
              <div>
                <h3 className="m-0 text-[16.5px] font-bold text-[var(--ink)]">{title}</h3>
                {subtitle && <p className="mt-0.5 text-[12.5px] text-[var(--mu)]">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="ปิดหน้าต่าง"
                className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--mu)] transition hover:bg-[var(--sf2)] hover:text-[var(--ink)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && (
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--bd)] bg-[var(--sf2)] px-5 py-3">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  icon?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px]"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.32, ease: [0.22, 0.9, 0.26, 1] }}
            role="dialog"
            aria-modal="true"
            className="fixed bottom-0 right-0 top-0 z-10 flex w-full max-w-[600px] flex-col border-l border-[var(--bd)] bg-[var(--sf)] shadow-[var(--shl)]"
          >
            <div className="flex items-center gap-3 border-b border-[var(--bd)] bg-[var(--sf2)] px-5 py-3.5">
              {icon}
              <div className="min-w-0 flex-1">
                <h3 className="m-0 truncate text-[16px] font-bold text-[var(--ink)]">{title}</h3>
                {subtitle && <div className="truncate font-mono text-[11.5px] text-[var(--mu)]">{subtitle}</div>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="ปิดหน้าต่าง"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--mu)] transition hover:bg-[var(--bd2)] hover:text-[var(--ink)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
            {footer && (
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--bd)] bg-[var(--sf2)] px-5 py-3">
                {footer}
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}
