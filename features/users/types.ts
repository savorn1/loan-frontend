// Mirrors auth-service's admin-only user-management endpoints (/api/auth/users/**).
import type { Role } from '~/shared/types'

export interface UserResponse {
  id: number
  username: string
  role: Role
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateUserRequest {
  username: string
  password: string
  role: Role
  active: boolean
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
