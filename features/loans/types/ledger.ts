import type { LoanStatus } from './loan'

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

// ── Loan schedules (system-generated amortization runs — a loan may have
// several over its life, e.g. one regenerated after each restructure; at most
// one is ACTIVE at a time, earlier ones move to SUPERSEDED) ────────────────
export type ScheduleStatus = 'ACTIVE' | 'SUPERSEDED'

export interface LoanScheduleResponse {
  id: number
  loanId: number
  generatedAt: string
  totalInstallments: number
  status: ScheduleStatus
  createdAt: string
}

// ── Loan schedule details (the individual installment lines of one
// LoanSchedule — read-only, system-generated) ──────────────────────────────
export type ScheduleDetailStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE'

export interface LoanScheduleDetailResponse {
  id: number
  scheduleId: number
  loanId: number
  installmentNumber: number
  dueDate: string
  principalAmount: number
  interestAmount: number
  totalAmount: number
  outstandingBalance: number
  status: ScheduleDetailStatus
  createdAt: string
}

// ── Loan disbursements (a loan may be disbursed in stages) ──────────────────
export type DisbursementMethod = 'BANK_TRANSFER' | 'CASH' | 'CHEQUE' | 'MOBILE_WALLET'

export interface LoanDisbursementRequest {
  amount: number
  disbursedDate: string // ISO date
  method: DisbursementMethod
  reference?: string
}

export type DisbursementStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'VOIDED'

export interface LoanDisbursementResponse {
  id: number
  loanId: number
  amount: number
  disbursedDate: string
  method: DisbursementMethod
  reference: string | null
  status: DisbursementStatus
  createdBy: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  rejectionReason: string | null
  voidedBy: string | null
  voidedAt: string | null
  voidReason: string | null
  createdAt: string
  updatedAt: string
}

// ── Loan payments (money received against a loan, tracked directly in
// loan-service — distinct from payment-service's installment ledger used on
// the Overview tab) ─────────────────────────────────────────────────────────
export interface LoanPaymentRequest {
  amount: number
  paymentDate: string // ISO date
  method: DisbursementMethod
  reference?: string
}

// ── Loan payment allocations (how one LoanPayment was split across schedule
// installments — principal/interest/penalty breakdown per line; computed by
// the backend on payment, read-only, returned nested on LoanPaymentResponse) ─
export interface LoanPaymentAllocationResponse {
  id: number
  paymentId: number
  scheduleDetailId: number
  installmentNumber: number
  principalAllocated: number
  interestAllocated: number
  penaltyAllocated: number
  createdAt: string
}

export interface LoanPaymentResponse {
  id: number
  loanId: number
  amount: number
  paymentDate: string
  method: DisbursementMethod
  reference: string | null
  allocations: LoanPaymentAllocationResponse[]
  createdAt: string
  updatedAt: string
}

// ── Loan transactions (the unified money-movement ledger — read-only,
// appended by loan-service alongside every action that actually moves money:
// disbursement, payment allocation, penalty/fee payment, adjustment,
// write-off, settlement. referenceType/referenceId trace a row back to the
// record that caused it; balanceAfter is the running outstanding balance) ──
export type TransactionType =
  | 'DISBURSEMENT'
  | 'PRINCIPAL_PAYMENT'
  | 'INTEREST_PAYMENT'
  | 'PENALTY_PAYMENT'
  | 'FEE_PAYMENT'
  | 'ADJUSTMENT'
  | 'WRITE_OFF'
  | 'SETTLEMENT'

export interface LoanTransactionResponse {
  id: number
  loanId: number
  type: TransactionType
  amount: number
  transactionDate: string
  referenceType: string
  referenceId: number
  description: string | null
  balanceAfter: number
  createdAt: string
}
