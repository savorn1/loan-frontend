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

export function downloadCsv<T extends Record<string, unknown>>(
  filename: string,
  columns: ColumnDef<T>[],
  rows: T[]
) {
  const exportColumns = columns.filter((c) => c.key !== 'actions')
  const header = exportColumns.map((c) => csvEscape(c.label ?? humanize(c.key)))
  const lines = rows.map((row) =>
    exportColumns.map((c) => csvEscape(cellText(c, row))).join(',')
  )
  const csv = [header.join(','), ...lines].join('\r\n')

  const blob = new Blob([UTF8_BOM + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
