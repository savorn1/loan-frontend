// Mirrors auth-service's additive RBAC layer (roles/permissions/
// role_permissions tables) — separate from the base USER/ADMIN tier on
// UserResponse.role, which this doesn't touch. Nothing in the platform
// enforces these permissions yet; this is reference data + assignment UI.

export interface RoleResponse {
  id: number
  name: string
  code: string
  isDefault: boolean
  description: string | null
  permissionCount: number
  userCount: number
  createdAt: string
  updatedAt: string
}

export interface RoleRequest {
  name: string
  code: string
  isDefault?: boolean
  description?: string
}

export interface PermissionResponse {
  id: number
  name: string
  module: string
  action: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface PermissionRequest {
  name: string
  description?: string
}

export interface RolePermissionResponse {
  id: number
  roleId: number
  permissionId: number
  permissionName: string
  permissionDescription: string | null
  createdAt: string
}

export interface AssignPermissionRequest {
  permissionId: number
}

export interface AssignUserToRoleRequest {
  userId: number
}
