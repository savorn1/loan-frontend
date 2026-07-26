// Auto-imported by Nuxt (files under /utils are global, same as /composables).

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
}

// 'PAST_DUE' / 'past_due' both become 'Past due' — shared by <ColumnValue>'s
// 'enum' column type and any backend enum value shown as plain text.
export function formatEnum(value: string | null | undefined): string {
  if (!value) return '—'
  return humanize(value)
}

// Shared by <FileUpload>'s file list — e.g. 1536 -> '1.5 KB'.
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  return `${exponent === 0 ? value : value.toFixed(1)} ${units[exponent]}`
}

// 'dateOfBirth' / 'date_of_birth' both become 'Date of birth' (Backpack's
// auto-label behavior) — shared by <Field>'s label and <ColumnValue>/<DataTable>'s
// column header.
export function humanize(name: string): string {
  const words = name
    .replace(/_/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}
