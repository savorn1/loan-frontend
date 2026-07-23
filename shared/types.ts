// Cross-cutting types used by more than one feature — keep this file small.
// Feature-specific types belong in that feature's own types.ts.

export type Role = 'USER' | 'ADMIN'

// Shared error shape (GlobalExceptionHandler on every backend service).
export interface ApiErrorBody {
  statusCode: number
  message: string
  errors?: Record<string, string>
}

// Mirrors backend PageResponse<T> (e.g. auth-service's dto.PageResponse) — the
// envelope returned by any list endpoint that paginates instead of returning a bare array.
export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

// ── Declarative form fields (Backpack for Laravel-style) ─────────────────────
// Modeled on https://backpackforlaravel.com/docs/7.x/crud-fields:
// `name` is the only mandatory attribute; `label` is auto-humanized from the
// name when omitted; `type` defaults to 'text'. `hint`, `prefix`, `suffix`,
// `default` and `wrapper` mirror Backpack's presentation attributes.
// Rendered by <Field> (one input) and <DynamicForm> (a whole form).

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'password'
  | 'url'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'switch'
  | 'range'
  | 'date'
  | 'datetime'
  | 'hidden'

export interface FieldOption {
  label: string
  value: string | number | boolean
}

export interface FieldDef {
  /** The only mandatory attribute — key in the form's value object. */
  name: string
  /** Auto-humanized from `name` when omitted (Backpack behavior). */
  label?: string
  /** Defaults to 'text'. */
  type?: FieldType
  /** Helper text shown under the input (Backpack's `hint`). */
  hint?: string
  placeholder?: string
  /** Leading icon (Nuxt UI icon name) — our equivalent of an icon `prefix`. */
  icon?: string
  /** Text shown before/after the input (Backpack's `prefix`/`suffix`). */
  prefix?: string
  suffix?: string
  /** Initial value applied by DynamicForm when the model has none. */
  default?: unknown
  required?: boolean
  disabled?: boolean
  readonly?: boolean
  /** select / radio choices. */
  options?: FieldOption[]
  /** number / range / date constraints. */
  min?: number | string
  max?: number | string
  step?: number | string
  /** textarea rows. */
  rows?: number
  /** Layout in DynamicForm's 2-column grid (Backpack's `wrapper`). */
  wrapper?: 'full' | 'half'
}

// ── Declarative list columns (Backpack for Laravel-style) ────────────────────
// Modeled on https://backpackforlaravel.com/docs/7.x/crud-columns: `key` (Backpack's
// `name`) is the only mandatory attribute, `label` is auto-humanized when omitted,
// `type` defaults to 'text'. Rendered by <ColumnValue> (one cell) and <DataTable>
// (a whole table, wrapping Nuxt UI's <UTable>).

export type ColumnType =
  | 'text'
  | 'number'
  | 'currency'
  | 'percent'
  | 'date'
  | 'datetime'
  | 'enum'
  | 'status'
  | 'boolean'
  | 'badge'
  | 'link'

export interface ColumnDef<T = any> {
  /** The only mandatory attribute — row property to read (Backpack's `name`). */
  key: string
  /** Auto-humanized from `key` when omitted (Backpack behavior). */
  label?: string
  /** Defaults to 'text'. */
  type?: ColumnType
  sortable?: boolean
  class?: string
  /** Derives the cell's value instead of reading row[key] (Backpack's model_function/closure). */
  value?: (row: T) => unknown
  /** Combines with `key` into a "from – to" range, e.g. key: 'minAmount', to: 'maxAmount'. */
  to?: string
  /** Text shown in place of an empty/null `to` value in a range (default '—'). */
  toEmpty?: string
  /** currency/range: text shown before the formatted value, e.g. a currency code. */
  prefix?: (row: T) => string
  /** text/number/percent/range: text appended after the value, e.g. a unit label. */
  suffix?: string | ((row: T) => string)
  /** boolean/badge: badge color (Nuxt UI color name), or a function of the row. */
  color?: string | ((row: T) => string)
  /** boolean: label/color when the value is truthy (defaults: 'Yes', primary). */
  trueLabel?: string
  trueColor?: string
  /** boolean: label/color when falsy (defaults: 'No', gray). Set to '' to render nothing. */
  falseLabel?: string
  falseColor?: string
  /** link: destination path for the row. */
  href?: (row: T) => string
}
