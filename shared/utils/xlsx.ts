import * as XLSX from 'xlsx'
import type { ColumnDef } from '~/shared/types'
import { buildExportTable, downloadBlob } from './tableExport'

export function downloadXlsx<T extends Record<string, unknown>>(
  filename: string,
  columns: ColumnDef<T>[],
  rows: T[]
) {
  const { header, body } = buildExportTable(columns, rows)
  const worksheet = XLSX.utils.aoa_to_sheet([header, ...body])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer

  downloadBlob(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }),
    filename
  )
}
