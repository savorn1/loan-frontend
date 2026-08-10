// Mirrors loan-service's and payment-service's respective dto/reports contracts.
import type { CollectionBucket } from '~/features/collections/types'
import type { ApplicationStatus, LoanStatus } from '~/features/loans/types'

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

// A single link in one of the reports index page's ~19 category sections
// (see ~/components/ReportCategoryCard.vue) — not a backend response, just
// the shape those sections' hardcoded tile arrays share.
export interface ReportTile {
  to: string
  icon: string
  label: string
  description: string
}

// ── Risk & compliance ─────────────────────────────────────────────────────

export interface VintageCohortResponse {
  cohortMonth: string
  loanCount: number
  totalPrincipal: number
  activeCount: number
  activePrincipal: number
  closedCount: number
  closedPrincipal: number
}

export interface BranchConcentrationRow {
  branchId: number | null
  loanCount: number
  outstandingBalance: number
  percentOfPortfolio: number
}

export interface BorrowerConcentrationRow {
  customerId: number
  loanCount: number
  outstandingBalance: number
  percentOfPortfolio: number
}

export interface ConcentrationRiskResponse {
  totalOutstandingBalance: number
  byBranch: BranchConcentrationRow[]
  topBorrowers: BorrowerConcentrationRow[]
}

export type ProvisioningStage = 'STAGE_1' | 'STAGE_2' | 'STAGE_3'

export interface ProvisioningStageRow {
  stage: ProvisioningStage
  label: string
  loanCount: number
  outstandingBalance: number
  provisionRatePercent: number
  provisionAmount: number
}

export interface ProvisioningSummaryResponse {
  stages: ProvisioningStageRow[]
  totalOutstandingBalance: number
  totalProvisionAmount: number
}

export interface LargeTransactionRow {
  loanId: number
  amount: number
  paidAt: string
  installmentNumber: number | null
}

export interface PricingBandRow {
  band: string
  loanCount: number
  totalPrincipal: number
  avgInterestRate: number
}

export interface PricingSummaryResponse {
  byRateBand: PricingBandRow[]
  byTermBand: PricingBandRow[]
}

// ── Operational performance ───────────────────────────────────────────────

export interface CollectorProductivityRow {
  assignedToUserId: number
  caseCount: number
  openCaseCount: number
  resolvedCaseCount: number
  paymentCount: number
  totalCollected: number
}

export interface ApplicationStatusCount {
  status: ApplicationStatus
  count: number
}

export interface ApprovalFunnelResponse {
  totalSubmitted: number
  totalApproved: number
  totalRejected: number
  approvalRatePercent: number
  avgDecisionDays: number | null
  statusBreakdown: ApplicationStatusCount[]
}

export interface StatusAuditEntryResponse {
  loanId: number
  loanNo: string | null
  fromStatus: LoanStatus | null
  toStatus: LoanStatus
  note: string | null
  changedBy: string | null
  changedAt: string
}

export type DataQualityEntityType = 'LOAN' | 'APPLICATION'

export interface DataQualityExceptionRow {
  entityType: DataQualityEntityType
  entityId: number
  identifier: string
  issueType: string
  description: string
  recordCreatedAt: string | null
}

// ── Product & profitability ───────────────────────────────────────────────

export interface IncomeByBranchRow {
  branchId: number | null
  totalIncome: number
  totalExpense: number
  netIncome: number
}

export interface IncomeByBranchResponse {
  dateFrom: string | null
  dateTo: string | null
  rows: IncomeByBranchRow[]
}

export interface BudgetLineRequest {
  financialPeriodId: number
  glAccountId: number
  budgetAmount: number
}

export interface BudgetLineResponse {
  id: number
  financialPeriodId: number
  financialPeriodName: string
  glAccountId: number
  accountNo: string
  accountName: string
  budgetAmount: number
}

export interface BudgetVsActualRow {
  glAccountId: number
  accountNo: string
  accountName: string
  budgetAmount: number
  actualAmount: number
  variance: number
  variancePercent: number
}
