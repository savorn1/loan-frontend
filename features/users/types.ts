// Mirrors auth-service's admin-only user-management endpoints (/api/auth/users/**).
import type { Role } from '~/shared/types'

export type UserStatus = 'ACTIVE' | 'INACTIVE'

export interface UserResponse {
  id: number
  username: string
  role: Role
  status: UserStatus
  branchId: number | null
  branchName: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateUserRequest {
  username: string
  password: string
  role: Role
  status: UserStatus
  branchId?: number
}

export interface UpdateBranchRequest {
  branchId?: number | null
}

export interface UpdateRoleRequest {
  role: Role
}

export interface UpdateStatusRequest {
  status: UserStatus
}

// Query params for GET /auth/users — all optional, mirrors UserFilterRequest.
export interface UserFilter {
  username?: string
  role?: Role
  status?: UserStatus
  page?: number
  size?: number
}

// ── Additive RBAC roles held by this user (features/roles/types.ts), in
// addition to their base USER/ADMIN tier (the `role` field above) ──────────
export interface UserRoleResponse {
  id: number
  userId: number
  username: string
  roleId: number
  roleName: string
  createdAt: string
}

export interface AssignUserRoleRequest {
  roleId: number
}
