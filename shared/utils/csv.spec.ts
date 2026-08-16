import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadCsv } from './csv'
import { deriveExportBaseName } from './tableExport'
import type { ColumnDef } from '~/shared/types'

interface Row extends Record<string, unknown> {
  name: string
  amount: number
  active: boolean
  actions?: string
}

const BOM = String.fromCharCode(0xfeff)

function captureDownload() {
  let capturedBlob: Blob | undefined
  let capturedAnchor: HTMLAnchorElement | undefined
  const createObjectURL = vi.fn((blob: Blob) => {
    capturedBlob = blob
    return 'blob:mock-url'
  })
  const revokeObjectURL = vi.fn()
  vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })

  const clickSpy = vi.fn()
  const originalCreateElement = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    const el = originalCreateElement(tag)
    if (tag === 'a') {
      el.click = clickSpy
      capturedAnchor = el as HTMLAnchorElement
    }
    return el
  })

  return {
    clickSpy,
    getBlob: () => capturedBlob,
    getFilename: () => capturedAnchor?.download
  }
}

describe('downloadCsv', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const columns: ColumnDef<Row>[] = [
    { key: 'name', label: 'Name' },
    { key: 'amount', type: 'currency', label: 'Amount' },
    { key: 'active', type: 'boolean', label: 'Active' },
    { key: 'actions', label: '' }
  ]

  it('excludes the actions column and triggers a download', async () => {
    const { clickSpy, getBlob } = captureDownload()
    const rows: Row[] = [{ name: 'Loan A', amount: 1000, active: true }]

    downloadCsv('export.csv', columns, rows)

    expect(clickSpy).toHaveBeenCalledOnce()
    const text = await getBlob()!.text()
    const lines = (text.startsWith(BOM) ? text.slice(BOM.length) : text).split('\r\n')
    expect(lines[0]).toBe('Name,Amount,Active')
    expect(lines[1]).toBe('Loan A,"$1,000.00",Yes')
  })

  it('escapes values containing commas, quotes, or newlines', async () => {
    const { getBlob } = captureDownload()
    const rows: Row[] = [{ name: 'Smith, "Big" Loan\nSecond line', amount: 0, active: false }]

    downloadCsv('export.csv', columns, rows)

    const text = await getBlob()!.text()
    expect(text).toContain('"Smith, ""Big"" Loan\nSecond line"')
  })

  it('renders falseLabel/trueLabel overrides for boolean columns', async () => {
    const { getBlob } = captureDownload()
    const customColumns: ColumnDef<Row>[] = [
      { key: 'active', type: 'boolean', trueLabel: 'On', falseLabel: 'Off' }
    ]
    const rows: Row[] = [{ name: '', amount: 0, active: false }]

    downloadCsv('export.csv', customColumns, rows)

    const text = await getBlob()!.text()
    expect(text.split('\r\n')[1]).toBe('Off')
  })

  it('prepends a UTF-8 BOM so Excel renders bilingual text correctly', async () => {
    const { getBlob } = captureDownload()
    downloadCsv('export.csv', columns, [{ name: 'ខ្មែរ', amount: 0, active: true }])

    // TextDecoder strips a leading BOM by default on .text(), so assert on
    // the raw bytes instead: EF BB BF is the UTF-8 BOM.
    const bytes = new Uint8Array(await getBlob()!.arrayBuffer())
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf])
  })

  it('stamps the downloaded filename with the current date and time', async () => {
    const { getFilename } = captureDownload()
    downloadCsv('export.csv', columns, [])

    expect(getFilename()).toMatch(/^export-\d{8}-\d{6}\.csv$/)
  })
})

describe('deriveExportBaseName', () => {
  it('uses the last static path segment', () => {
    expect(deriveExportBaseName('/customers')).toBe('customers')
    expect(deriveExportBaseName('/loans')).toBe('loans')
  })

  it('drops dynamic route params so ids are never used as the name', () => {
    expect(deriveExportBaseName('/loans/123/schedule', { id: '123' })).toBe('schedule')
    expect(deriveExportBaseName('/groups/123', { id: '123' })).toBe('groups')
    expect(deriveExportBaseName('/journal-entries/123', { id: '123' })).toBe('journal-entries')
  })

  it('handles array route params', () => {
    expect(deriveExportBaseName('/reports/a/b/summary', { slug: ['a', 'b'] })).toBe('summary')
  })

  it('falls back to "export" when nothing static remains', () => {
    expect(deriveExportBaseName('/123', { id: '123' })).toBe('export')
    expect(deriveExportBaseName('/')).toBe('export')
  })
})
