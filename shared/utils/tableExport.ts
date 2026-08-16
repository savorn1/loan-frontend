// Auto-imported by Nuxt (files under /utils are global, same as /composables).
// Shared by csv.ts, xlsx.ts and pdf.ts so all three export formats — plus the
// "Copy" action — read exactly the same cell text as what's on screen.

import type { ColumnDef } from '~/shared/types'

// Mirrors <ColumnValue>'s boolean branch (the one case its template handles
// outside of formatColumnText) so exported text matches what's on screen.
export function exportCellText<T extends Record<string, unknown>>(
  column: ColumnDef<T>,
  row: T
): string {
  if (column.type === 'boolean') {
    const raw = column.value ? column.value(row) : row[column.key]
    if (!raw && column.falseLabel === '') return ''
    return raw ? (column.trueLabel ?? 'Yes') : (column.falseLabel ?? 'No')
  }
  return formatColumnText(column, row)
}

export function exportableColumns<T extends Record<string, unknown>>(
  columns: ColumnDef<T>[]
): ColumnDef<T>[] {
  return columns.filter((c) => c.key !== 'actions')
}

export function buildExportTable<T extends Record<string, unknown>>(
  columns: ColumnDef<T>[],
  rows: T[]
): { header: string[]; body: string[][] } {
  const cols = exportableColumns(columns)
  return {
    header: cols.map((c) => c.label ?? humanize(c.key)),
    body: rows.map((row) => cols.map((c) => exportCellText(c, row)))
  }
}

// Turns a route like /loans/123/schedule into "schedule" and /customers into
// "customers", so exports default to a meaningful name instead of the
// generic "export" without every page having to set exportFilename by hand.
export function deriveExportBaseName(
  path: string,
  params: Record<string, string | string[]> = {}
): string {
  const paramValues = new Set(Object.values(params).flatMap((v) => (Array.isArray(v) ? v : [v])))
  const segments = path.split('/').filter((s) => s && !paramValues.has(s))
  return segments.at(-1) ?? 'export'
}

// Stamps each export with the moment it was downloaded so re-exports of the
// same page never collide or silently overwrite one another.
export function withTimestamp(filename: string): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const now = new Date()
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`

  const dotIndex = filename.lastIndexOf('.')
  if (dotIndex <= 0) return `${filename}-${stamp}`
  return `${filename.slice(0, dotIndex)}-${stamp}${filename.slice(dotIndex)}`
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = withTimestamp(filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function downloadBlob(blob: Blob, filename: string) {
  triggerDownload(blob, filename)
}

// Tab-separated so pasting into Excel/Sheets/Word lands each cell in its own
// column instead of one comma-joined blob of text.
export function tableToTsv(header: string[], body: string[][]): string {
  return [header, ...body].map((cells) => cells.join('\t')).join('\n')
}

export async function copyTableToClipboard<T extends Record<string, unknown>>(
  columns: ColumnDef<T>[],
  rows: T[]
): Promise<void> {
  const { header, body } = buildExportTable(columns, rows)
  await navigator.clipboard.writeText(tableToTsv(header, body))
}
