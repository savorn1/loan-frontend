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
