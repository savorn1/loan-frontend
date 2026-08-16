// ── Loan restructures (in-place term/rate change — maker-checker like
// disbursements: requesting one only logs the request, the recalculation and
// application to the loan happen on approval by a different admin) ──────────
export type RestructureStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'

export interface LoanRestructureRequest {
  newTermMonths: number
  newInterestRate?: number
  reason: string
  effectiveDate: string // ISO date
}

export interface LoanRestructureRejectRequest {
  reason: string
}

export interface LoanRestructureResponse {
  id: number
  loanId: number
  newTermMonths: number
  newInterestRate: number | null
  reason: string
  effectiveDate: string
  status: RestructureStatus
  createdBy: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
}

// ── Loan refinances (loan is replaced by a new loan — logged with a reference
// to the replacement loan's id; creating that new loan is a separate step) ──
export interface LoanRefinanceRequest {
  newLoanId: number
  reason: string
  effectiveDate: string // ISO date
}

export interface LoanRefinanceResponse {
  id: number
  loanId: number
  newLoanId: number
  reason: string
  effectiveDate: string
  createdAt: string
  updatedAt: string
}

// ── Loan notes (free-text internal notes/comments) ──────────────────────────
export interface LoanNoteRequest {
  note: string
}

export interface LoanNoteResponse {
  id: number
  loanId: number
  note: string
  authorName: string
  createdAt: string
}

// ── Loan documents (status checklist for an applicant's actual loan — no file
// storage; distinct from LoanProductDocument, which is the product's requirements list) ─
export type LoanDocumentStatus = 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED'

export interface LoanDocumentRequest {
  name: string
  status: LoanDocumentStatus
  notes?: string
}

export interface LoanDocumentResponse {
  id: number
  loanId: number
  name: string
  status: LoanDocumentStatus
  notes: string | null
  createdAt: string
  updatedAt: string
}

// ── Loan collateral (assets pledged as security — a loan may have several;
// each is released independently, typically once the loan is settled/closed) ─
export type CollateralType = 'REAL_ESTATE' | 'VEHICLE' | 'EQUIPMENT' | 'CASH_DEPOSIT' | 'OTHER'
export type CollateralStatus = 'PLEDGED' | 'RELEASED' | 'SEIZED'

export interface LoanCollateralRequest {
  type: CollateralType
  description: string
  estimatedValue: number
  reference?: string
}

export interface LoanCollateralSeizeRequest {
  reason: string
}

export interface LoanCollateralResponse {
  id: number
  loanId: number
  type: CollateralType
  description: string
  estimatedValue: number
  reference: string | null
  status: CollateralStatus
  releasedAt: string | null
  seizedAt: string | null
  seizureReason: string | null
  createdAt: string
  updatedAt: string
}

// ── Loan guarantors (third parties backing repayment — a loan may have
// several; each is released independently, typically once the loan is
// settled/closed) ────────────────────────────────────────────────────────────
export type GuarantorStatus = 'ACTIVE' | 'RELEASED'

export interface LoanGuarantorRequest {
  name: string
  phone: string
  relationship?: string
  guaranteedAmount?: number
}

export interface LoanGuarantorResponse {
  id: number
  loanId: number
  name: string
  phone: string
  relationship: string | null
  guaranteedAmount: number | null
  status: GuarantorStatus
  releasedAt: string | null
  createdAt: string
  updatedAt: string
}
