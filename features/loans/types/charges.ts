import type { DisbursementMethod } from './ledger'

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

// ── Loan fees (charges applied to a loan instance — e.g. processing,
// insurance, administration — distinct from loan-configuration's FeeScheme,
// which defines a product's fee template rather than a charge on one loan) ──
export type LoanFeeType = 'PROCESSING' | 'INSURANCE' | 'ADMINISTRATION' | 'OTHER'
export type FeeStatus = 'PENDING' | 'WAIVED' | 'PAID'

export interface LoanFeeRequest {
  type: LoanFeeType
  amount: number
  chargedDate: string // ISO date
  description?: string
}

export interface LoanFeeResponse {
  id: number
  loanId: number
  type: LoanFeeType
  amount: number
  chargedDate: string
  description: string | null
  status: FeeStatus
  waivedAt: string | null
  paidAt: string | null
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

// ── Write-off recovery (cash recovered on a loan already written off — the
// loan stays CLOSED, this doesn't reopen it) ────────────────────────────────

export interface LoanWriteoffRecoveryRequest {
  amount: number
  recoveryDate: string // ISO date
  method: DisbursementMethod
  reference?: string
}

export interface LoanWriteoffRecoveryResponse {
  id: number
  writeoffId: number
  loanId: number
  amount: number
  recoveryDate: string
  method: DisbursementMethod
  reference: string | null
  createdAt: string
}

// ── Payoff quote (what it actually costs to close the loan today — lower
// than outstandingBalance, which bakes in a full term's interest regardless
// of how early you pay) ──────────────────────────────────────────────────

export interface LoanPayoffQuoteResponse {
  loanId: number
  asOfDate: string
  remainingPrincipal: number
  accruedInterest: number
  outstandingFees: number
  outstandingPenalties: number
  totalPayoffAmount: number
}

export interface LoanPayoffRequest {
  method: DisbursementMethod
  reference?: string
}
