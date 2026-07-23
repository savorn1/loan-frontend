// Mirrors loan-service's dto package.
export type LoanStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'CLOSED'

export interface LoanRequest {
  customerId: number
  principal: number
  interestRate: number
  termMonths: number
  purpose?: string
}

export interface LoanResponse {
  id: number
  customerId: number
  customerName: string
  principal: number
  interestRate: number
  termMonths: number
  status: LoanStatus
  purpose: string | null
  approvedAt: string | null
  rejectedAt: string | null
  disbursedAt: string | null
  closedAt: string | null
  maturityDate: string | null
  monthlyInstallment: number | null
  outstandingBalance: number | null
  createdAt: string
  updatedAt: string
}

export interface ApplyLoanPaymentRequest {
  amount: number
}

// ── Loan penalties (late fees / charges applied to a loan) ──────────────────
export type PenaltyStatus = 'PENDING' | 'WAIVED' | 'PAID'

export interface LoanPenaltyRequest {
  amount: number
  reason: string
  appliedDate: string // ISO date
}

export interface LoanPenaltyResponse {
  id: number
  loanId: number
  amount: number
  reason: string
  appliedDate: string
  status: PenaltyStatus
  waivedAt: string | null
  paidAt: string | null
  createdAt: string
  updatedAt: string
}

// ── Loan interest accruals ───────────────────────────────────────────────────
export interface LoanInterestRequest {
  periodStart: string // ISO date
  periodEnd: string // ISO date
  rate: number
  amount: number
}

export interface LoanInterestResponse {
  id: number
  loanId: number
  periodStart: string
  periodEnd: string
  rate: number
  amount: number
  accruedAt: string
  createdAt: string
  updatedAt: string
}

// ── Loan adjustments (manual balance corrections / write-offs) ─────────────
export type AdjustmentType = 'CREDIT' | 'DEBIT'

export interface LoanAdjustmentRequest {
  type: AdjustmentType
  amount: number
  reason: string
}

export interface LoanAdjustmentResponse {
  id: number
  loanId: number
  type: AdjustmentType
  amount: number
  reason: string
  createdAt: string
  updatedAt: string
}

// ── Loan settlement (final closure record — at most one per loan) ──────────
export type SettlementStatus = 'PENDING' | 'COMPLETED'

export interface LoanSettlementRequest {
  settlementAmount: number
  settlementDate: string // ISO date
  note?: string
}

export interface LoanSettlementResponse {
  id: number
  loanId: number
  settlementAmount: number
  settlementDate: string
  status: SettlementStatus
  note: string | null
  createdAt: string
  updatedAt: string
}

// ── Loan status history (read-only audit trail — system-generated on every
// status transition: approve/reject/disburse/close/restructure/refinance/etc.) ─
export interface LoanStatusHistoryResponse {
  id: number
  loanId: number
  fromStatus: LoanStatus | null
  toStatus: LoanStatus
  note: string | null
  changedBy: string | null
  changedAt: string
}

// ── Loan disbursements (a loan may be disbursed in stages) ──────────────────
export type DisbursementMethod = 'BANK_TRANSFER' | 'CASH' | 'CHEQUE' | 'MOBILE_WALLET'

export interface LoanDisbursementRequest {
  amount: number
  disbursedDate: string // ISO date
  method: DisbursementMethod
  reference?: string
}

export interface LoanDisbursementResponse {
  id: number
  loanId: number
  amount: number
  disbursedDate: string
  method: DisbursementMethod
  reference: string | null
  createdAt: string
  updatedAt: string
}

// ── Loan restructures (in-place term/rate change — a request + history log,
// not a PENDING/APPROVED workflow: recalculation and application is backend logic) ─
export interface LoanRestructureRequest {
  newTermMonths: number
  newInterestRate?: number
  reason: string
  effectiveDate: string // ISO date
}

export interface LoanRestructureResponse {
  id: number
  loanId: number
  newTermMonths: number
  newInterestRate: number | null
  reason: string
  effectiveDate: string
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

// ── Loan write-off (uncollectable debt — at most one per loan, mirrors
// LoanSettlement's PENDING/COMPLETED shape) ─────────────────────────────────
export type WriteoffStatus = 'PENDING' | 'COMPLETED'

export interface LoanWriteoffRequest {
  amount: number
  reason: string
  writeoffDate: string // ISO date
}

export interface LoanWriteoffResponse {
  id: number
  loanId: number
  amount: number
  reason: string
  writeoffDate: string
  status: WriteoffStatus
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
