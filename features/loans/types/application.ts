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
  loanProductId: string
  requestedAmount: number
  requestedTermMonths: number
  purpose?: string
}

export interface ApplicationResponse {
  id: number
  applicationNo: string
  customerId: number
  branchId: number | null
  customerName: string
  loanProductId: string | null
  loanProductName: string | null
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
