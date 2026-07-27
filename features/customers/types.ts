// Mirrors customer-service's dto package (java/loan/customer-service).
export type CustomerType = 'INDIVIDUAL' | 'CORPORATE'
export type Gender = 'MALE' | 'FEMALE' | 'OTHER'
export type MaritalStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED'
export type CustomerStatus = 'ACTIVE' | 'INACTIVE'

export interface CustomerRequest {
  customerType: CustomerType
  // Required for INDIVIDUAL — ignored/derived server-side otherwise.
  firstName?: string
  lastName?: string
  // Required for CORPORATE (the company/legal name) — derived from
  // firstName/lastName server-side for INDIVIDUAL, so omit it there.
  fullName?: string
  gender?: Gender
  email: string
  phone?: string
  nationalId?: string
  address?: string
  dateOfBirth?: string // ISO date (yyyy-MM-dd)
  nationality?: string
  maritalStatus?: MaritalStatus
  status?: CustomerStatus
  branchId?: number
}

export interface CustomerResponse {
  id: number
  customerNo: string
  customerType: CustomerType
  firstName: string | null
  lastName: string | null
  fullName: string
  gender: Gender | null
  email: string
  phone: string | null
  nationalId: string | null
  address: string | null
  dateOfBirth: string | null
  nationality: string | null
  maritalStatus: MaritalStatus | null
  status: CustomerStatus
  branchId: number | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

// Query params for GET /customers — all optional, mirrors CustomerFilterRequest.
export interface CustomerFilter {
  search?: string
  customerType?: CustomerType
  status?: CustomerStatus
  branchId?: number
  page?: number
  size?: number
}

// KYC identity documents (customer_identities) — a customer can have several.
export type IdentityType = 'NATIONAL_ID' | 'PASSPORT' | 'DRIVER_LICENSE'
export type IdentityStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED'

export interface CustomerIdentityRequest {
  identityType: IdentityType
  identityNumber: string
  issueDate?: string // ISO date (yyyy-MM-dd)
  expiryDate?: string // ISO date (yyyy-MM-dd)
  issuingCountry?: string
  status?: IdentityStatus
}

export interface CustomerIdentityResponse {
  id: number
  customerId: number
  identityType: IdentityType
  identityNumber: string
  issueDate: string | null
  expiryDate: string | null
  issuingCountry: string | null
  status: IdentityStatus
  createdAt: string
  updatedAt: string
}

// Addresses (customer_addresses) — a customer can have several; at most one
// is primary (isPrimary: true clears the flag on the customer's others).
export type AddressType = 'CURRENT' | 'PERMANENT' | 'OFFICE'

export interface CustomerAddressRequest {
  addressType: AddressType
  country?: string
  province?: string
  district?: string
  commune?: string
  village?: string
  street?: string
  postalCode?: string
  isPrimary?: boolean
}

export interface CustomerAddressResponse {
  id: number
  customerId: number
  addressType: AddressType
  country: string | null
  province: string | null
  district: string | null
  commune: string | null
  village: string | null
  street: string | null
  postalCode: string | null
  isPrimary: boolean
  createdAt: string
  updatedAt: string
}

// Emergency/reference contacts (customer_contacts) — a customer can have several.
export interface CustomerContactRequest {
  name: string
  relationship?: string
  phone?: string
  email?: string
  address?: string
}

export interface CustomerContactResponse {
  id: number
  customerId: number
  name: string
  relationship: string | null
  phone: string | null
  email: string | null
  address: string | null
  createdAt: string
  updatedAt: string
}

// Employment records (customer_employments) — a customer can have several.
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'SELF_EMPLOYED' | 'CONTRACT' | 'UNEMPLOYED'
export type EmploymentStatus = 'ACTIVE' | 'INACTIVE'

export interface CustomerEmploymentRequest {
  companyName: string
  occupation?: string
  employmentType: EmploymentType
  salary?: number
  currency?: string
  startDate?: string // ISO date (yyyy-MM-dd)
  status?: EmploymentStatus
}

export interface CustomerEmploymentResponse {
  id: number
  customerId: number
  companyName: string
  occupation: string | null
  employmentType: EmploymentType
  salary: number | null
  currency: string | null
  startDate: string | null
  status: EmploymentStatus
  createdAt: string
  updatedAt: string
}

// Income sources (customer_incomes) — a customer can have several.
export type IncomeType = 'SALARY' | 'BUSINESS' | 'RENTAL' | 'INVESTMENT' | 'PENSION' | 'OTHER'
export type IncomeFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'ANNUALLY'

export interface CustomerIncomeRequest {
  incomeType: IncomeType
  amount: number
  currency?: string
  frequency: IncomeFrequency
}

export interface CustomerIncomeResponse {
  id: number
  customerId: number
  incomeType: IncomeType
  amount: number
  currency: string | null
  frequency: IncomeFrequency
  createdAt: string
  updatedAt: string
}

// Links between customers (customer_relationships) — directional: this
// customer has relationshipType to relatedCustomerId, not implicitly mirrored.
export type RelationshipType =
  'SPOUSE' | 'PARENT' | 'CHILD' | 'SIBLING' | 'BUSINESS_PARTNER' | 'GUARANTOR' | 'OTHER'

export interface CustomerRelationshipRequest {
  relatedCustomerId: number
  relationshipType: RelationshipType
}

export interface CustomerRelationshipResponse {
  id: number
  customerId: number
  relatedCustomerId: number
  relatedCustomerName: string
  relationshipType: RelationshipType
  createdAt: string
  updatedAt: string
}

// Risk profile (customer_risk_profiles) — singleton, at most one per customer.
// GET /customers/{id}/risk-profile returns null (not a 404) when unset;
// PUT upserts (creates on first save, updates thereafter).
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'
export type AmlStatus = 'CLEAR' | 'FLAGGED' | 'UNDER_REVIEW'

export interface CustomerRiskProfileRequest {
  riskLevel: RiskLevel
  pep: boolean
  sanctionChecked: boolean
  amlStatus: AmlStatus
  lastReviewDate?: string // ISO date (yyyy-MM-dd)
}

export interface CustomerRiskProfileResponse {
  id: number
  customerId: number
  riskLevel: RiskLevel
  pep: boolean
  sanctionChecked: boolean
  amlStatus: AmlStatus
  lastReviewDate: string | null
  createdAt: string
  updatedAt: string
}

// Preferences (customer_preferences) — singleton, same upsert shape as the
// risk profile: GET returns null when unset, PUT creates-or-updates.
export type NotificationMethod = 'EMAIL' | 'SMS' | 'PHONE' | 'NONE'

export interface CustomerPreferenceRequest {
  language?: string
  currency?: string
  notificationMethod: NotificationMethod
}

export interface CustomerPreferenceResponse {
  id: number
  customerId: number
  language: string | null
  currency: string | null
  notificationMethod: NotificationMethod
  createdAt: string
  updatedAt: string
}

// Audit log (customer_audit_logs) — read-only. Nothing writes rows here yet;
// GET /customers/{id}/audit-logs is the read side only, no create/edit/delete.
export interface CustomerAuditLogResponse {
  id: number
  customerId: number
  action: string
  userId: number | null
  oldValue: string | null
  newValue: string | null
  createdAt: string
}
