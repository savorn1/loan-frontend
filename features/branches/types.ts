// Mirrors branch-service's dto package (entity/Branch.java, dto/BranchRequest.java,
// dto/BranchResponse.java) — the physical branch/office concept shared by users,
// customers, and loans. auth-service/customer-service/loan-service each reference
// a branch only by its raw branchId; branch-service is the sole owner of the entity.
export type BranchStatus = 'ACTIVE' | 'INACTIVE'

export interface BranchResponse {
  id: number
  code: string
  name: string
  address: string | null
  phone: string | null
  status: BranchStatus
  createdAt: string
  updatedAt: string
}

export interface BranchRequest {
  code: string
  name: string
  address?: string
  phone?: string
  status: BranchStatus
}

// ── Weekly business hours (branch-service's BranchBusinessHours) — at most one
// row per day of week, upserted by day rather than an open-ended add/remove list.
export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY'

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY'
]

export interface BranchBusinessHoursResponse {
  id: number
  branchId: number
  dayOfWeek: DayOfWeek
  openingTime: string | null // "HH:mm:ss"
  closingTime: string | null
  isClosed: boolean
  createdAt: string
  updatedAt: string
}

export interface BranchBusinessHoursRequest {
  openingTime?: string
  closingTime?: string
  isClosed: boolean
}
