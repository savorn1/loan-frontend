// Mirrors loan-product-service's dto package (java/loan/loan-product-service),
// proxied through the gateway at /api/loan-products/** (see nuxt.config.ts).
// {id} below is the loan_products.id UUID. Every child resource also exposes a
// flat GET /loan-products/<resource> (no {id}) listing that resource across
// every product — backs the standalone nav pages (e.g. pages/loan-product-fees/).
//
//   GET    /loan-products                                     -> LoanProductResponse[]
//   POST   /loan-products                                     <- LoanProductRequest             -> LoanProductResponse
//   GET    /loan-products/{id}                                 -> LoanProductResponse
//   PUT    /loan-products/{id}                                 <- LoanProductRequest             -> LoanProductResponse
//   DELETE /loan-products/{id}
//
//   GET    /loan-products/interest-rates                       -> LoanProductInterestRateResponse[]  (flat, all products)
//   GET    /loan-products/{id}/interest-rates                  -> LoanProductInterestRateResponse[]
//   POST   /loan-products/{id}/interest-rates                  <- LoanProductInterestRateRequest
//   PUT    /loan-products/{id}/interest-rates/{rateId}          <- LoanProductInterestRateRequest     (rateId: UUID)
//   DELETE /loan-products/{id}/interest-rates/{rateId}
//
//   GET    /loan-products/fees                                  -> LoanProductFeeResponse[]  (flat, all products)
//   GET    /loan-products/{id}/fees                             -> LoanProductFeeResponse[]
//   POST   /loan-products/{id}/fees                             <- LoanProductFeeRequest
//   PUT    /loan-products/{id}/fees/{feeId}                     <- LoanProductFeeRequest              (feeId: number)
//   DELETE /loan-products/{id}/fees/{feeId}
//
//   GET    /loan-products/terms                                 -> LoanProductTermResponse[]  (flat, all products)
//   GET    /loan-products/{id}/terms                            -> LoanProductTermResponse[]
//   POST   /loan-products/{id}/terms                            <- LoanProductTermRequest
//   PUT    /loan-products/{id}/terms/{termId}                   <- LoanProductTermRequest             (termId: number)
//   PUT    /loan-products/{id}/terms/{termId}/set-default
//   DELETE /loan-products/{id}/terms/{termId}
//
//   GET    /loan-products/rules                                 -> LoanProductRuleResponse[]  (flat, all products)
//   GET    /loan-products/{id}/rules                             -> LoanProductRuleResponse[]
//   POST   /loan-products/{id}/rules                             <- LoanProductRuleRequest
//   PUT    /loan-products/{id}/rules/{ruleId}                    <- LoanProductRuleRequest            (ruleId: number)
//   DELETE /loan-products/{id}/rules/{ruleId}
//
//   GET    /loan-products/documents                              -> LoanProductDocumentResponse[]  (flat, all products)
//   GET    /loan-products/{id}/documents                         -> LoanProductDocumentResponse[]
//   POST   /loan-products/{id}/documents                         <- LoanProductDocumentRequest
//   PUT    /loan-products/{id}/documents/{documentId}             <- LoanProductDocumentRequest        (documentId: number)
//   DELETE /loan-products/{id}/documents/{documentId}
//
// All child resources are scoped to a loan product and carry loanProductId in
// their response; requests omit it (it's the path param).

// ── Loan product (core configuration) — mirrors the loan_products table ────
export type InterestType = 'FLAT' | 'REDUCING'
export type RepaymentMethod = 'EMI' | 'EQUAL_PRINCIPAL' | 'BULLET'
export type PaymentFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY'
export type TermUnit = 'DAY' | 'MONTH' | 'YEAR'
export type LoanProductStatus = 'ACTIVE' | 'INACTIVE'

export interface LoanProductRequest {
  productCode: string
  productName: string
  description?: string
  currency: string
  minAmount: number
  maxAmount: number
  defaultInterestRate: number
  interestType: InterestType
  repaymentMethod: RepaymentMethod
  paymentFrequency: PaymentFrequency
  minTerm: number
  maxTerm: number
  termUnit: TermUnit
  gracePeriodDays: number
  autoGenerateSchedule: boolean
  status: LoanProductStatus
}

export interface LoanProductResponse {
  id: string // UUID
  productCode: string
  productName: string
  description: string | null
  currency: string
  minAmount: number
  maxAmount: number
  defaultInterestRate: number
  interestType: InterestType
  repaymentMethod: RepaymentMethod
  paymentFrequency: PaymentFrequency
  minTerm: number
  maxTerm: number
  termUnit: TermUnit
  gracePeriodDays: number
  autoGenerateSchedule: boolean
  status: LoanProductStatus
  createdAt: string
  updatedAt: string
}

// ── Interest rates (tiered by term/amount range, with a validity window) ───
export type InterestRateStatus = 'ACTIVE' | 'INACTIVE'

export interface LoanProductInterestRateRequest {
  // Interpreted using the parent product's termUnit (DAY/MONTH/YEAR), same as LoanProductTerm.
  minTerm: number
  maxTerm: number
  minAmount: number
  maxAmount: number
  interestRate: number
  interestType: InterestType
  effectiveFrom: string // ISO date
  effectiveTo?: string // ISO date — omitted means open-ended (still in effect)
  status: InterestRateStatus
}

export interface LoanProductInterestRateResponse {
  id: string // UUID
  loanProductId: string // FK -> loan_products.id (UUID)
  minTerm: number
  maxTerm: number
  minAmount: number
  maxAmount: number
  interestRate: number
  interestType: InterestType
  effectiveFrom: string
  effectiveTo: string | null
  status: InterestRateStatus
  createdAt: string
  updatedAt: string
}

// ── Fees ─────────────────────────────────────────────────────────────────────
export type FeeType = 'ORIGINATION' | 'PROCESSING' | 'LATE_PAYMENT' | 'PREPAYMENT' | 'OTHER'
export type FeeCalculationMethod = 'FLAT' | 'PERCENTAGE'
export type FeeChargeTiming = 'UPFRONT' | 'ON_DISBURSEMENT' | 'RECURRING'

export interface LoanProductFeeRequest {
  name: string
  type: FeeType
  calculationMethod: FeeCalculationMethod
  // Flat currency amount when calculationMethod is FLAT, percentage points (0-100) when PERCENTAGE.
  amount: number
  chargeTiming: FeeChargeTiming
}

export interface LoanProductFeeResponse {
  id: number
  loanProductId: string // FK -> loan_products.id (UUID)
  name: string
  type: FeeType
  calculationMethod: FeeCalculationMethod
  amount: number
  chargeTiming: FeeChargeTiming
  createdAt: string
  updatedAt: string
}

// ── Terms (specific selectable durations within the product's min/max term —
// repayment cadence now lives on the product itself as paymentFrequency, so
// it's not repeated per term) ───────────────────────────────────────────────
export interface LoanProductTermRequest {
  // Interpreted using the parent product's termUnit (DAY/MONTH/YEAR).
  termValue: number
  isDefault: boolean
}

export interface LoanProductTermResponse {
  id: number
  loanProductId: string // FK -> loan_products.id (UUID)
  termValue: number
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

// ── Eligibility rules (structured field/operator/value builder) ────────────
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

export interface LoanProductRuleRequest {
  field: RuleField
  operator: RuleOperator
  // Single comparison value; for BETWEEN this is the lower bound, for IN a comma-separated list.
  value: string
  // Upper bound — only used (and required) when operator is BETWEEN.
  value2?: string
  description?: string
}

export interface LoanProductRuleResponse {
  id: number
  loanProductId: string // FK -> loan_products.id (UUID)
  field: RuleField
  operator: RuleOperator
  value: string
  value2: string | null
  description: string | null
  createdAt: string
  updatedAt: string
}

// ── Required documents (checklist — metadata only, no file storage) ────────
export interface LoanProductDocumentRequest {
  name: string
  description?: string
  required: boolean
}

export interface LoanProductDocumentResponse {
  id: number
  loanProductId: string // FK -> loan_products.id (UUID)
  name: string
  description: string | null
  required: boolean
  createdAt: string
  updatedAt: string
}
