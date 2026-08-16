// Mirrors auth-service's dto package (login/refresh/logout/change-password). No
// register — this is a staff-only system with no self-signup; new users are
// created by an admin via the users management page.
import type { Role } from '~/shared/types'

export interface LoginRequest {
  username: string
  password: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  username: string
  role: Role
  branchId?: number | null
  branchName?: string | null
}

export interface RefreshRequest {
  refreshToken: string
}

export interface LogoutRequest {
  refreshToken: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface UserProfileResponse {
  id: number
  uuid: string
  username: string
  email: string | null
  avatarUrl: string | null
  role: Role
  status: string
  branchId: number | null
  branchName: string | null
  createdAt: string
  updatedAt: string
}

export interface UpdateProfileRequest {
  email?: string
}
