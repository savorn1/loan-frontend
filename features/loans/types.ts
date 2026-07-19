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
