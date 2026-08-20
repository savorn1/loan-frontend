// Mirrors loan-service's dto package.
export type LoanStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'CLOSED'

// Interpreted per the sibling termUnit: a literal month count for MONTH, a year
// count for YEAR (×12 monthly installments), or a day count for DAY (a single
// bullet repayment — principal + simple interest, Actual/365 — instead of a
// monthly schedule).
export type TermUnit = 'DAY' | 'MONTH' | 'YEAR'

export interface LoanRequest {
  customerId: number
  principal: number
  interestRate: number
  termMonths: number
  termUnit: TermUnit
  purpose?: string
}

export interface LoanResponse {
  id: number
  loanNo: string
  customerId: number
  branchId: number | null
  customerName: string
  loanProductId: string | null
  loanProductName: string | null
  principal: number
  interestRate: number
  termMonths: number
  termUnit: TermUnit
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
