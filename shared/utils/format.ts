// Auto-imported by Nuxt (files under /utils are global, same as /composables).

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

// Backend LocalDateTime values arrive with no timezone suffix (e.g. "2026-08-08T14:09:07"),
// which the JS Date parser treats as local time — local to whichever environment reads it.
// That differs between SSR (the server's timezone) and the browser (the viewer's), shifting
// the displayed value and causing hydration mismatches. Appending 'Z' before parsing plus
// timeZone: 'UTC' on the formatter treats the string's digits as literal wall-clock values
// everywhere, independent of where it's parsed or rendered. Date-only strings (no time part,
// used by formatDate) already parse as UTC per spec, so only the formatter needs pinning there.
function parseBackendDateTime(value: string): Date {
  return new Date(value.endsWith('Z') ? value : `${value}Z`)
}

// Different Intl/ICU builds render the space before AM/PM differently (regular space vs.
// U+202F narrow no-break space) — normalized here so output is byte-identical regardless
// of which ICU version formatted it, another common, invisible hydration-mismatch source.
function normalizeSpaces(text: string): string {
  return text.replace(/[\u202f\xa0]/g, ' ')
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return normalizeSpaces(
    new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    })
  )
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  return normalizeSpaces(
    parseBackendDateTime(value).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC'
    })
  )
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
