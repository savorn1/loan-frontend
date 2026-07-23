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

// ── Loan collateral (assets pledged as security — a loan may have several;
// each is released independently, typically once the loan is settled/closed) ─
export type CollateralType = 'REAL_ESTATE' | 'VEHICLE' | 'EQUIPMENT' | 'CASH_DEPOSIT' | 'OTHER'
export type CollateralStatus = 'PLEDGED' | 'RELEASED'

export interface LoanCollateralRequest {
  type: CollateralType
  description: string
  estimatedValue: number
  reference?: string
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

// ── Loan applications (pre-approval workflow — a separate resource from Loan
// itself, not a status on it) ────────────────────────────────────────────────
// A customer submits an Application; once an approval decision with decision
// APPROVED is recorded, loan-service creates the actual Loan (already APPROVED,
// skipping straight to eligible-for-disbursement) and links it back via loanId.
// A REJECTED decision just marks the application REJECTED — no loan is created.
//
//   POST   /loans/applications                                    <- ApplicationRequest  -> ApplicationResponse
//   GET    /loans/applications/{id}                                 -> ApplicationResponse
//   GET    /loans/applications                                     -> PageResponse<ApplicationResponse>
//   GET    /loans/applications/customer/{customerId}                 -> ApplicationResponse[]
//   PUT    /loans/applications/{id}                                 <- ApplicationRequest  -> ApplicationResponse   (SUBMITTED only)
//   PUT    /loans/applications/{id}/start-review                     -> ApplicationResponse                        (ADMIN, SUBMITTED only)
//   PUT    /loans/applications/{id}/withdraw                         -> ApplicationResponse                        (SUBMITTED/UNDER_REVIEW only)
//   DELETE /loans/applications/{id}                                                                                (ADMIN, only if no loan was created)
export type ApplicationStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN'

export interface ApplicationRequest {
  customerId: number
  requestedAmount: number
  requestedTermMonths: number
  purpose?: string
}

export interface ApplicationResponse {
  id: number
  customerId: number
  customerName: string
  requestedAmount: number
  requestedTermMonths: number
  purpose: string | null
  status: ApplicationStatus
  submittedAt: string
  decidedAt: string | null
  loanId: number | null
  documents: ApplicationDocumentResponse[]
  notes: ApplicationNoteResponse[]
  approvals: ApplicationApprovalResponse[]
  createdAt: string
  updatedAt: string
}

// ── Application documents (supporting docs submitted with the application —
// metadata + an external URL/reference only, no file storage) ──────────────
//
//   POST   /loans/applications/{id}/documents                        <- ApplicationDocumentRequest -> ApplicationDocumentResponse
//   PUT    /loans/applications/{id}/documents/{documentId}/verify      -> ApplicationDocumentResponse (ADMIN)
//   PUT    /loans/applications/{id}/documents/{documentId}/reject      -> ApplicationDocumentResponse (ADMIN)
//   DELETE /loans/applications/{id}/documents/{documentId}                                           (ADMIN)
export type ApplicationDocumentStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'

export interface ApplicationDocumentRequest {
  documentType: string
  fileName: string
  fileUrl: string
}

export interface ApplicationDocumentResponse {
  id: number
  applicationId: number
  documentType: string
  fileName: string
  fileUrl: string
  status: ApplicationDocumentStatus
  uploadedAt: string
}

// ── Application notes (free-text reviewer/internal commentary) ────────────
//
//   POST /loans/applications/{id}/notes <- ApplicationNoteRequest -> ApplicationNoteResponse
export interface ApplicationNoteRequest {
  note: string
}

export interface ApplicationNoteResponse {
  id: number
  applicationId: number
  authorName: string
  note: string
  createdAt: string
}

// ── Application approvals (an append-only decision trail — approvedAmount/
// approvedInterestRate/approvedTermMonths are only set when decision is
// APPROVED, and can differ from what the customer originally requested) ────
//
//   POST /loans/applications/{id}/approvals <- ApplicationApprovalRequest -> ApplicationResponse (ADMIN)
export type ApprovalDecision = 'APPROVED' | 'REJECTED'

export interface ApplicationApprovalRequest {
  decision: ApprovalDecision
  approvedAmount?: number
  approvedInterestRate?: number
  approvedTermMonths?: number
  comments?: string
}

export interface ApplicationApprovalResponse {
  id: number
  applicationId: number
  approverName: string
  decision: ApprovalDecision
  approvedAmount: number | null
  approvedInterestRate: number | null
  approvedTermMonths: number | null
  comments: string | null
  decidedAt: string
}
