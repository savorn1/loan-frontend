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
  | 'currency'
  | 'email'
  | 'password'
  | 'url'
  | 'phone'
  | 'select'
  | 'relationship'
  | 'radio'
  | 'checkbox'
  | 'switch'
  | 'range'
  | 'date'
  | 'datetime'
  | 'dob'
  | 'month'
  | 'week'
  | 'file'
  | 'image'
  | 'base64Image'
  | 'repeatable'
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
  /** text: native maxlength constraint. */
  maxLength?: number
  /** Initial value applied by DynamicForm when the model has none. */
  default?: unknown
  required?: boolean
  disabled?: boolean
  readonly?: boolean
  /** select / radio choices. */
  options?: FieldOption[]
  /** relationship: called with the current search text (debounced) to look up matching options — Backpack's select2_from_ajax/relationship field, for FKs too large to preload as a static `options` list. */
  search?: (query: string) => Promise<FieldOption[]> | FieldOption[]
  /** number / range / date constraints. */
  min?: number | string
  max?: number | string
  step?: number | string
  /** textarea rows. */
  rows?: number
  /** file/image: native input + drop-target restriction, e.g. 'image/*'. */
  accept?: string
  /** file/image: allow selecting more than one. */
  multiple?: boolean
  /** file/image/base64Image: reject files over this size. */
  maxSizeMb?: number
  /** switch: text shown next to the toggle for its true/false state (Backpack's on_label/off_label), e.g. 'Active'/'Inactive'. */
  onLabel?: string
  offLabel?: string
  /** phone: ISO-3166 alpha-2 country to assume when the value has no recognized dial code (default 'KH'). */
  defaultCountry?: string
  /** Layout in DynamicForm's 2-column grid (Backpack's `wrapper`). */
  wrapper?: 'full' | 'half'
  /** repeatable: field definitions rendered inside each row (Backpack's repeatable `fields`). */
  subfields?: FieldDef[]
  /** repeatable: floor for row count — the remove button disables at this floor. Default 0. */
  minRows?: number
  /** repeatable: ceiling for row count — the add button disables at this ceiling. */
  maxRows?: number
  /** repeatable: builds a new row's default values, called when "add row" is clicked. */
  newRow?: () => Record<string, unknown>
  /** repeatable: label for the add-row button. Defaults to a generic "Add row". */
  addLabel?: string
  /** repeatable: label for a row's header, e.g. `(i) => \`Line ${i + 1}\``. Defaults to a generic "Row N". */
  rowLabel?: (index: number) => string
  /** Hide the field (and skip its `required` check) when this returns false for the current form values. */
  // `any` matches DynamicForm's own model type (Record<string, any>) — form
  // values are a dynamic Backpack-style bag of unrelated field types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  showIf?: (values: Record<string, any>) => boolean
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

// `any` here (not `unknown`) is deliberate: it's the default used only when a
// caller doesn't parameterize ColumnDef (e.g. <ColumnValue>'s untyped prop).
// `unknown`/`Record<string, unknown>` would reject every concrete response
// type passed elsewhere as ColumnDef<T> — none of them declare an index
// signature, so `T extends Record<string, unknown>` fails to satisfy.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
