import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ColumnDef } from '~/shared/types'
import { buildExportTable, withTimestamp } from './tableExport'

export function downloadPdf<T extends Record<string, unknown>>(
  filename: string,
  columns: ColumnDef<T>[],
  rows: T[]
) {
  const { header, body } = buildExportTable(columns, rows)
  // Wide tables (many columns) clip in portrait — landscape gives autoTable
  // room before it starts shrinking font size to fit.
  const doc = new jsPDF({ orientation: header.length > 5 ? 'landscape' : 'portrait' })

  autoTable(doc, {
    head: [header],
    body,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [51, 65, 85] }
  })

  doc.save(withTimestamp(filename))
}
