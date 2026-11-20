import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Motion Prompt #053 — Dropdown (select)
 * - Open: 0 -> 1 over 0.25s with easeOutCubic ([0.33, 1, 0.68, 1]), drops 6px, shadow blur 18px, chevron rotates 180deg, 2px blue border.
 * - Highlight: light blue on hover / keyboard focus.
 * - Close: 0.15s with easeInOutCubic ([0.65, 0, 0.35, 1]).
 * - Label cross-fade: 0.10s non-overlapping transition between placeholder and selected option.
 */

const EASE_OUT_CUBIC = [0.33, 1, 0.68, 1] as const
const EASE_IN_OUT_CUBIC = [0.65, 0, 0.35, 1] as const

export interface DropdownOption {
  value: string
  label: string
  sublabel?: string
  badge?: string
  disabled?: boolean
}

export interface MotionDropdownProps {
  options: DropdownOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  searchable?: boolean
  searchPlaceholder?: string
  className?: string
  triggerClassName?: string
  disabled?: boolean
  'aria-label'?: string
}

export function MotionDropdown({
  options,
  value,
  onChange,
  placeholder = 'เลือกรายการ…',
  label,
  searchable = false,
  searchPlaceholder = 'ค้นหา…',
  className,
  triggerClassName,
  disabled = false,
  'aria-label': ariaLabel,
}: MotionDropdownProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  const selected = options.find((o) => o.value === value)
  const filtered = query.trim()
    ? options.filter((o) =>
        `${o.label} ${o.sublabel ?? ''} ${o.value}`.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : options

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }
    const idx = filtered.findIndex((o) => o.value === value)
    setActiveIndex(idx >= 0 ? idx : 0)
    if (searchable) {
      requestAnimationFrame(() => searchRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((prev) => (filtered.length ? (prev + 1) % filtered.length : -1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((prev) => (filtered.length ? (prev - 1 + filtered.length) % filtered.length : -1))
      } else if (e.key === 'Enter' && activeIndex >= 0 && filtered[activeIndex]) {
        e.preventDefault()
        const opt = filtered[activeIndex]
        if (!opt.disabled) {
          onChange(opt.value)
          setOpen(false)
        }
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, filtered, activeIndex, onChange])

  return (
    <div ref={rootRef} className={cn('relative w-full', className)}>
      {label && (
        <span className="mb-1 block text-[12.5px] font-semibold text-[var(--mu)]">{label}</span>
      )}
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel || (label ? `${label}: ${selected?.label ?? placeholder}` : undefined)}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={cn(
          'flex h-[38px] w-full items-center justify-between gap-2 rounded-[8px] bg-[var(--sf)] px-3 text-left text-[13.5px] transition-colors',
          open
            ? 'border-2 border-[#2563eb] dark:border-[#3b82f6] px-[11px]'
            : 'border border-[var(--bd)] hover:border-[var(--bd-strong)]',
          disabled && 'cursor-not-allowed opacity-50',
          triggerClassName,
        )}
      >
        <div className="min-w-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            {selected ? (
              <motion.span
                key={`val-${selected.value}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1, ease: EASE_IN_OUT_CUBIC }}
                className="block truncate font-medium text-[var(--ink)]"
              >
                {selected.label}
              </motion.span>
            ) : (
              <motion.span
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1, ease: EASE_IN_OUT_CUBIC }}
                className="block truncate text-[var(--ft)]"
              >
                {placeholder}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: open ? 0.25 : 0.15, ease: open ? EASE_OUT_CUBIC : EASE_IN_OUT_CUBIC }}
          className="flex shrink-0 items-center text-[var(--mu)]"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: { duration: 0.25, ease: EASE_OUT_CUBIC },
            }}
            exit={{
              opacity: 0,
              y: -6,
              transition: { duration: 0.15, ease: EASE_IN_OUT_CUBIC },
            }}
            style={{
              boxShadow: '0 8px 18px rgba(15, 23, 42, 0.16)',
            }}
            className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-[8px] border border-[var(--bd)] bg-[var(--sf)]"
          >
            {searchable && (
              <div className="flex items-center gap-2 border-b border-[var(--bd2)] bg-[var(--sf2)] px-2.5 py-1.5">
                <Search className="h-3.5 w-3.5 shrink-0 text-[var(--ft)]" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setActiveIndex(0)
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full bg-transparent text-[13px] text-[var(--ink)] placeholder:text-[var(--ft)] focus:outline-none"
                />
              </div>
            )}

            <div className="max-h-60 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <div className="px-3 py-3 text-center text-[12.5px] text-[var(--ft)]">ไม่พบรายการ</div>
              ) : (
                filtered.map((opt, idx) => {
                  const isSelected = opt.value === value
                  const isActive = idx === activeIndex
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={opt.disabled}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => {
                        if (opt.disabled) return
                        onChange(opt.value)
                        setOpen(false)
                      }}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 px-3 py-[6px] text-left text-[13.5px] transition-colors',
                        isActive && 'bg-[#dbeafe] text-[#1d4ed8] dark:bg-[#1e3a5f] dark:text-[#93c5fd]',
                        !isActive && isSelected && 'bg-[#eff6ff] font-semibold text-[#1d4ed8] dark:bg-[#172554]/60 dark:text-[#93c5fd]',
                        !isActive && !isSelected && 'text-[var(--ink)]',
                        opt.disabled && 'cursor-not-allowed opacity-45',
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        <span className="block truncate">{opt.label}</span>
                        {opt.sublabel && (
                          <span className="block truncate text-[11.5px] text-[var(--mu)]">{opt.sublabel}</span>
                        )}
                      </span>
                      {opt.badge && (
                        <span className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10.5px] bg-[var(--sf2)] text-[var(--mu)]">
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-[#2563eb] dark:text-[#60a5fa]" />}
                    </button>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
