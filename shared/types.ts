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
