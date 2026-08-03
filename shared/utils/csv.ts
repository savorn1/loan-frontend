import type { ColumnDef } from '~/shared/types'

// Excel mis-renders UTF-8 CSVs without a BOM — this app is bilingual
// (en/km) and Khmer text routinely ends up in exported fields.
const UTF8_BOM = '﻿'

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

// Mirrors <ColumnValue>'s boolean branch (the one case its template handles
// outside of formatColumnText) so exported text matches what's on screen.
function cellText<T extends Record<string, unknown>>(column: ColumnDef<T>, row: T): string {
  if (column.type === 'boolean') {
    const raw = column.value ? column.value(row) : row[column.key]
    if (!raw && column.falseLabel === '') return ''
    return raw ? (column.trueLabel ?? 'Yes') : (column.falseLabel ?? 'No')
  }
  return formatColumnText(column, row)
}

// Turns a route like /loans/123/schedule into "schedule" and /customers into
// "customers", so tables default to a meaningful export name instead of the
// generic "export.csv" without every page having to set exportFilename by hand.
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
function withTimestamp(filename: string): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const now = new Date()
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`

  const dotIndex = filename.lastIndexOf('.')
  if (dotIndex <= 0) return `${filename}-${stamp}`
  return `${filename.slice(0, dotIndex)}-${stamp}${filename.slice(dotIndex)}`
}

export function downloadCsv<T extends Record<string, unknown>>(
  filename: string,
  columns: ColumnDef<T>[],
  rows: T[]
) {
  const exportColumns = columns.filter((c) => c.key !== 'actions')
  const header = exportColumns.map((c) => csvEscape(c.label ?? humanize(c.key)))
  const lines = rows.map((row) => exportColumns.map((c) => csvEscape(cellText(c, row))).join(','))
  const csv = [header.join(','), ...lines].join('\r\n')

  const blob = new Blob([UTF8_BOM + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = withTimestamp(filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
