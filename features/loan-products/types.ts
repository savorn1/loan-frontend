// Mirrors loan-product-service's loan_products table (java/loan/loan-product-service),
// proxied through the gateway at /api/loan-products/** (see nuxt.config.ts).
//
// This is the core product record only. Rate, fee, term, eligibility and document
// behavior is composed from the reusable scheme/template catalogs instead of being
// embedded here — see features/loan-configuration/types.ts (interest-schemes,
// fee-schemes, term-templates, rule-templates, document-templates). Linking a
// product to those catalogs is a separate join resource, not modeled in this file.
//
//   GET    /loan-products          -> LoanProductResponse[]
//   POST   /loan-products          <- LoanProductRequest   -> LoanProductResponse
//   GET    /loan-products/{id}      -> LoanProductResponse
//   PUT    /loan-products/{id}      <- LoanProductRequest   -> LoanProductResponse
//   DELETE /loan-products/{id}

import type { RuleField, RuleOperator } from '~/features/loan-configuration/types'

export type LoanType = 'PERSONAL' | 'HOME' | 'AUTO' | 'BUSINESS' | 'EDUCATION' | 'OTHER'
export type LoanProductStatus = 'DRAFT' | 'PUBLISHED' | 'INACTIVE'

export interface LoanProductRequest {
  code: string
  name: string
  description?: string
  loanType: LoanType
  currency: string
  minAmount: number
  maxAmount: number
  minTerm: number
  maxTerm: number
  status: LoanProductStatus
  effectiveFrom: string // ISO date
  effectiveTo?: string // ISO date — omitted means open-ended
}

export interface LoanProductResponse {
  id: string // UUID
  code: string
  name: string
  description: string | null
  loanType: LoanType
  currency: string
  minAmount: number
  maxAmount: number
  minTerm: number
  maxTerm: number
  status: LoanProductStatus
  version: number
  effectiveFrom: string
  effectiveTo: string | null
  createdBy: string
  createdAt: string
  updatedBy: string | null
  updatedAt: string
}

// ── Interest scheme assignments (join: which interest schemes a product can
// use, each with a priority, an optional default, and a validity window) ───
// Flat across every product at /loan-products/interest-schemes; scoped CRUD
// lives under /loan-products/{loanProductId}/interest-schemes since create
// and update are both path-scoped to the owning product.
//
//   GET    /loan-products/interest-schemes                                    -> LoanProductInterestSchemeResponse[]  (flat, all products)
//   GET    /loan-products/{loanProductId}/interest-schemes                     -> LoanProductInterestSchemeResponse[]
//   POST   /loan-products/{loanProductId}/interest-schemes                     <- LoanProductInterestSchemeRequest
//   PUT    /loan-products/{loanProductId}/interest-schemes/{mappingId}         <- LoanProductInterestSchemeRequest
//   PUT    /loan-products/{loanProductId}/interest-schemes/{mappingId}/set-default
//   DELETE /loan-products/{loanProductId}/interest-schemes/{mappingId}
export type LoanProductInterestSchemeStatus = 'ACTIVE' | 'INACTIVE'

export interface LoanProductInterestSchemeRequest {
  interestSchemeId: string // UUID
  // Lower value = evaluated first when more than one assignment's window covers a given date.
  priority: number
  isDefault: boolean
  effectiveFrom: string // ISO date
  effectiveTo?: string // ISO date — omitted means open-ended
  status: LoanProductInterestSchemeStatus
}

export interface LoanProductInterestSchemeResponse {
  id: string // UUID
  loanProductId: string // FK -> loan_products.id (UUID)
  interestSchemeId: string // UUID
  interestSchemeCode: string
  interestSchemeName: string
  priority: number
  isDefault: boolean
  effectiveFrom: string
  effectiveTo: string | null
  status: LoanProductInterestSchemeStatus
  createdAt: string
  updatedAt: string
}

// ── Fee scheme assignments (join: which fee schemes apply to a product, each
// mandatory or optional, with a priority and a validity window) ───────────
// Same shape as the interest scheme join above, minus the is-default/set-default
// concept — a product can have several mandatory fee schemes at once.
//
//   GET    /loan-products/fee-schemes                                    -> LoanProductFeeSchemeResponse[]  (flat, all products)
//   GET    /loan-products/{loanProductId}/fee-schemes                     -> LoanProductFeeSchemeResponse[]
//   POST   /loan-products/{loanProductId}/fee-schemes                     <- LoanProductFeeSchemeRequest
//   PUT    /loan-products/{loanProductId}/fee-schemes/{mappingId}         <- LoanProductFeeSchemeRequest
//   DELETE /loan-products/{loanProductId}/fee-schemes/{mappingId}
export type LoanProductFeeSchemeStatus = 'ACTIVE' | 'INACTIVE'

export interface LoanProductFeeSchemeRequest {
  feeSchemeId: string // UUID
  isMandatory: boolean
  // Lower value = evaluated first when more than one assignment's window covers a given date.
  priority: number
  effectiveFrom: string // ISO date
  effectiveTo?: string // ISO date — omitted means open-ended
  status: LoanProductFeeSchemeStatus
}

export interface LoanProductFeeSchemeResponse {
  id: string // UUID
  loanProductId: string // FK -> loan_products.id (UUID)
  feeSchemeId: string // UUID
  feeSchemeCode: string
  feeSchemeName: string
  isMandatory: boolean
  priority: number
  effectiveFrom: string
  effectiveTo: string | null
  status: LoanProductFeeSchemeStatus
  createdAt: string
  updatedAt: string
}

// ── Term assignments (join: which term templates a product offers, with an
// optional default — no priority or validity window, unlike the scheme joins
// above) ────────────────────────────────────────────────────────────────────
//
//   GET    /loan-products/terms                                    -> LoanProductTermResponse[]  (flat, all products)
//   GET    /loan-products/{loanProductId}/terms                     -> LoanProductTermResponse[]
//   POST   /loan-products/{loanProductId}/terms                     <- LoanProductTermRequest
//   PUT    /loan-products/{loanProductId}/terms/{termId}             <- LoanProductTermRequest             (termId: number)
//   PUT    /loan-products/{loanProductId}/terms/{termId}/set-default
//   DELETE /loan-products/{loanProductId}/terms/{termId}
export type LoanProductTermStatus = 'ACTIVE' | 'INACTIVE'

export interface LoanProductTermRequest {
  termTemplateId: string // UUID
  isDefault: boolean
  status: LoanProductTermStatus
}

export interface LoanProductTermResponse {
  id: number
  loanProductId: string // FK -> loan_products.id (UUID)
  termTemplateId: string // UUID
  termTemplateCode: string
  termTemplateName: string
  termValue: number
  isDefault: boolean
  status: LoanProductTermStatus
  createdAt: string
  updatedAt: string
}

// ── Rule assignments (join: which rule templates apply to a product — the
// rule's field/operator/value/description are fixed on the template and just
// carried through on the response for display, not editable here) ─────────
//
//   GET    /loan-products/rules                                    -> LoanProductRuleResponse[]  (flat, all products)
//   GET    /loan-products/{loanProductId}/rules                     -> LoanProductRuleResponse[]
//   POST   /loan-products/{loanProductId}/rules                     <- LoanProductRuleRequest             (ruleId: number)
//   PUT    /loan-products/{loanProductId}/rules/{ruleId}             <- LoanProductRuleRequest
//   DELETE /loan-products/{loanProductId}/rules/{ruleId}
export type LoanProductRuleStatus = 'ACTIVE' | 'INACTIVE'

export interface LoanProductRuleRequest {
  ruleTemplateId: string // UUID
  status: LoanProductRuleStatus
}

export interface LoanProductRuleResponse {
  id: number
  loanProductId: string // FK -> loan_products.id (UUID)
  ruleTemplateId: string // UUID
  ruleTemplateCode: string
  ruleTemplateName: string
  field: RuleField
  operator: RuleOperator
  value: string
  value2: string | null
  description: string | null
  status: LoanProductRuleStatus
  createdAt: string
  updatedAt: string
}

// ── Document assignments (join: which document templates a product requires
// for its checklist, each required or optional) ────────────────────────────
//
//   GET    /loan-products/documents                                    -> LoanProductDocumentResponse[]  (flat, all products)
//   GET    /loan-products/{loanProductId}/documents                     -> LoanProductDocumentResponse[]
//   POST   /loan-products/{loanProductId}/documents                     <- LoanProductDocumentRequest
//   PUT    /loan-products/{loanProductId}/documents/{documentId}         <- LoanProductDocumentRequest        (documentId: number)
//   DELETE /loan-products/{loanProductId}/documents/{documentId}
export type LoanProductDocumentStatus = 'ACTIVE' | 'INACTIVE'

export interface LoanProductDocumentRequest {
  documentTemplateId: string // UUID
  required: boolean
  status: LoanProductDocumentStatus
}

export interface LoanProductDocumentResponse {
  id: number
  loanProductId: string // FK -> loan_products.id (UUID)
  documentTemplateId: string // UUID
  documentTemplateCode: string
  documentTemplateName: string
  documentTemplateDescription: string | null
  required: boolean
  status: LoanProductDocumentStatus
  createdAt: string
  updatedAt: string
}
