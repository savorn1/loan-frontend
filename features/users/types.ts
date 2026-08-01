// Mirrors auth-service's admin-only user-management endpoints (/api/auth/users/**).
import type { Role } from '~/shared/types'

export interface UserResponse {
  id: number
  username: string
  role: Role
  active: boolean
  branchId: number | null
  branchName: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateUserRequest {
  username: string
  password: string
  role: Role
  active: boolean
  branchId?: number
}

export interface UpdateBranchRequest {
  branchId?: number | null
}

export interface UpdateRoleRequest {
  role: Role
}

export interface UpdateStatusRequest {
  active: boolean
}

// Query params for GET /auth/users — all optional, mirrors UserFilterRequest.
export interface UserFilter {
  username?: string
  role?: Role
  active?: boolean
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
