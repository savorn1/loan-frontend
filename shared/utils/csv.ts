import type { ColumnDef } from '~/shared/types'
import { buildExportTable, downloadBlob } from './tableExport'

// Excel mis-renders UTF-8 CSVs without a BOM — this app is bilingual
// (en/km) and Khmer text routinely ends up in exported fields.
const UTF8_BOM = '﻿'

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function downloadCsv<T extends Record<string, unknown>>(
  filename: string,
  columns: ColumnDef<T>[],
  rows: T[]
) {
  const { header, body } = buildExportTable(columns, rows)
  const lines = body.map((cells) => cells.map(csvEscape).join(','))
  const csv = [header.map(csvEscape).join(','), ...lines].join('\r\n')

  downloadBlob(new Blob([UTF8_BOM + csv], { type: 'text/csv;charset=utf-8;' }), filename)
}
