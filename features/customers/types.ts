// Mirrors customer-service's dto package.
export interface CustomerRequest {
  firstName: string
  lastName: string
  email: string
  phone?: string
  nationalId?: string
  address?: string
  dateOfBirth?: string // ISO date (yyyy-MM-dd)
}

export interface CustomerResponse extends CustomerRequest {
  id: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}
