// Mirrors loan-service's and payment-service's respective dto/reports contracts.
import type { CollectionBucket } from '~/features/collections/types'
import type { LoanStatus } from '~/features/loans/types'

export interface PortfolioSummaryResponse {
  activeLoanCount: number
  totalPrincipal: number
  totalOutstandingBalance: number
}

export interface LoanStatusBreakdown {
  status: LoanStatus
  loanCount: number
  totalPrincipal: number
}

export interface DisbursementTrendPoint {
  month: string
  loanCount: number
  totalDisbursed: number
}

export interface ParBucketSummary {
  bucket: CollectionBucket
  loanCount: number
  overdueAmount: number
}

export interface ParSummaryResponse {
  buckets: ParBucketSummary[]
  totalOverdueAmount: number
  totalOutstandingBalance: number
  activeLoanCount: number
  portfolioAtRiskPercent: number
}

export interface CollectionTrendPoint {
  month: string
  paymentCount: number
  totalCollected: number
}
