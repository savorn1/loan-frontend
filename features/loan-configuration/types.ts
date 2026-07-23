// Mirrors loan-product-service's new master/template catalog resources (dto
// package, java/loan/loan-product-service), proxied through the gateway at
// /api/interest-schemes/**, /api/fee-schemes/**, /api/term-templates/**,
// /api/rule-templates/**, /api/document-templates/** (see nuxt.config.ts).
// These are flat, parent-less catalogs — reusable definitions a loan product
// later references by id, not data scoped to any one product.
//
//   GET    /interest-schemes                          -> InterestSchemeResponse[]
//   POST   /interest-schemes                          <- InterestSchemeRequest       -> InterestSchemeResponse
//   GET    /interest-schemes/{id}                      -> InterestSchemeResponse
//   PUT    /interest-schemes/{id}                      <- InterestSchemeRequest       -> InterestSchemeResponse
//   DELETE /interest-schemes/{id}
//   GET    /interest-schemes/{id}/details               -> InterestSchemeDetailResponse[]
//   POST   /interest-schemes/{id}/details               <- InterestSchemeDetailRequest
//   PUT    /interest-schemes/{id}/details/{detailId}    <- InterestSchemeDetailRequest
//   DELETE /interest-schemes/{id}/details/{detailId}
//
//   (fee-schemes, term-templates, rule-templates, document-templates follow the
//   same top-level CRUD shape; fee-schemes also has a /details sub-resource.)

// ── Interest schemes (+ tiered detail rows) ─────────────────────────────────
export type InterestType = 'FLAT' | 'REDUCING'
export type InterestCalculationMethod = 'ACTUAL_365' | 'ACTUAL_360' | 'THIRTY_360'
export type InterestSchemeStatus = 'ACTIVE' | 'INACTIVE'

export interface InterestSchemeRequest {
  code: string
  name: string
  interestType: InterestType
  calculationMethod: InterestCalculationMethod
  status: InterestSchemeStatus
}

export interface InterestSchemeResponse {
  id: string // UUID
  code: string
  name: string
  interestType: InterestType
  calculationMethod: InterestCalculationMethod
  status: InterestSchemeStatus
  createdAt: string
  updatedAt: string
}

export interface InterestSchemeDetailRequest {
  minTerm: number
  maxTerm: number
  minAmount: number
  maxAmount: number
  interestRate: number
}

export interface InterestSchemeDetailResponse {
  id: string // UUID
  interestSchemeId: string // UUID
  minTerm: number
  maxTerm: number
  minAmount: number
  maxAmount: number
  interestRate: number
  createdAt: string
  updatedAt: string
}

// ── Fee schemes (+ fee line-item detail rows) ───────────────────────────────
export type FeeType = 'ORIGINATION' | 'PROCESSING' | 'LATE_PAYMENT' | 'PREPAYMENT' | 'OTHER'
export type FeeCalculationMethod = 'FLAT' | 'PERCENTAGE'
export type FeeChargeTiming = 'UPFRONT' | 'ON_DISBURSEMENT' | 'RECURRING'
export type FeeSchemeStatus = 'ACTIVE' | 'INACTIVE'

export interface FeeSchemeRequest {
  code: string
  name: string
  status: FeeSchemeStatus
}

export interface FeeSchemeResponse {
  id: string // UUID
  code: string
  name: string
  status: FeeSchemeStatus
  createdAt: string
  updatedAt: string
}

export interface FeeSchemeDetailRequest {
  type: FeeType
  calculationMethod: FeeCalculationMethod
  // Flat currency amount when calculationMethod is FLAT, percentage points (0-100) when PERCENTAGE.
  amount: number
  chargeTiming: FeeChargeTiming
}

export interface FeeSchemeDetailResponse {
  id: string // UUID
  feeSchemeId: string // UUID
  type: FeeType
  calculationMethod: FeeCalculationMethod
  amount: number
  chargeTiming: FeeChargeTiming
  createdAt: string
  updatedAt: string
}

// ── Term templates ──────────────────────────────────────────────────────────
export type TermTemplateStatus = 'ACTIVE' | 'INACTIVE'

export interface TermTemplateRequest {
  code: string
  name: string
  // Interpreted using the assigned product's termUnit (DAY/MONTH/YEAR).
  termValue: number
  status: TermTemplateStatus
}

export interface TermTemplateResponse {
  id: string // UUID
  code: string
  name: string
  termValue: number
  status: TermTemplateStatus
  createdAt: string
  updatedAt: string
}

// ── Rule templates (fully-formed reusable eligibility rule) ───────────────
export type RuleField =
  | 'CREDIT_SCORE'
  | 'MONTHLY_INCOME'
  | 'AGE'
  | 'EMPLOYMENT_STATUS'
  | 'EXISTING_LOAN_COUNT'
  | 'DEBT_TO_INCOME_RATIO'

export type RuleOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER_THAN'
  | 'GREATER_THAN_OR_EQUAL'
  | 'LESS_THAN'
  | 'LESS_THAN_OR_EQUAL'
  | 'BETWEEN'
  | 'IN'

export type RuleTemplateStatus = 'ACTIVE' | 'INACTIVE'

export interface RuleTemplateRequest {
  code: string
  name: string
  field: RuleField
  operator: RuleOperator
  // Single comparison value; for BETWEEN this is the lower bound, for IN a comma-separated list.
  value: string
  // Upper bound — required when operator is BETWEEN.
  value2?: string
  description?: string
  status: RuleTemplateStatus
}

export interface RuleTemplateResponse {
  id: string // UUID
  code: string
  name: string
  field: RuleField
  operator: RuleOperator
  value: string
  value2: string | null
  description: string | null
  status: RuleTemplateStatus
  createdAt: string
  updatedAt: string
}

// ── Document templates ──────────────────────────────────────────────────────
export type DocumentTemplateStatus = 'ACTIVE' | 'INACTIVE'

export interface DocumentTemplateRequest {
  code: string
  name: string
  description?: string
  status: DocumentTemplateStatus
}

export interface DocumentTemplateResponse {
  id: string // UUID
  code: string
  name: string
  description: string | null
  status: DocumentTemplateStatus
  createdAt: string
  updatedAt: string
}
