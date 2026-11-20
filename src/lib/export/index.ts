import { buildCsvContent } from './csv'
import { buildExcelBuffer } from './excel'
import { buildFormalHtml } from './formalHtml'
import { buildJsonBackup } from './json'
import { DOC_KIND_LABELS, type ExportDataset, type ExportOptions } from './types'

export * from './types'
export * from './excel'
export * from './formalHtml'
export * from './csv'
export * from './json'

const safeFile = (s: string) => s.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '_').trim() || 'accounting'

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export function printFormalHtml(html: string): boolean {
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0'
  iframe.srcdoc = html
  document.body.appendChild(iframe)
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } finally {
      setTimeout(() => iframe.remove(), 2500)
    }
  }
  return true
}

export function runExport(
  data: ExportDataset,
  opts: ExportOptions,
): { filename: string; size: number; printed?: boolean } {
  const base = safeFile(`${DOC_KIND_LABELS[opts.kind]}_${data.company.name}_${data.company.period}`)

  if (opts.format === 'pdf') {
    const html = buildFormalHtml(data, opts)
    printFormalHtml(html)
    const size = new Blob([html]).size
    return { filename: `${base}.pdf`, size, printed: true }
  }

  if (opts.format === 'xlsx') {
    const buf = buildExcelBuffer(data, opts)
    const blob = new Blob([buf as unknown as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const filename = `${base}.xlsx`
    triggerDownload(blob, filename)
    return { filename, size: blob.size }
  }

  if (opts.format === 'html') {
    const html = buildFormalHtml(data, opts)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const filename = `${base}.html`
    triggerDownload(blob, filename)
    return { filename, size: blob.size }
  }

  if (opts.format === 'csv') {
    const csv = buildCsvContent(data, opts)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const filename = `${base}.csv`
    triggerDownload(blob, filename)
    return { filename, size: blob.size }
  }

  const json = buildJsonBackup(data)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const filename = `${safeFile(data.company.name)}_backup_${data.company.period}.json`
  triggerDownload(blob, filename)
  return { filename, size: blob.size }
}
