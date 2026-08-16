// Group lending ("solidarity group") — a set of customers, with a leader, who
// co-guarantee each other's individually-held loans. Mirrors the real
// `loan_groups` table (id, code, name, loan_product_id, branch_id,
// leader_customer_id, formation_date, status, created_at, updated_at) — no
// REST service answers these endpoints yet, but the row shape itself is now
// ground truth rather than assumed:
//
//   GET    /groups                          -> PageResponse<GroupResponse>
//   POST   /groups                          -> GroupResponse
//   GET    /groups/{id}                     -> GroupResponse
//   PUT    /groups/{id}                     -> GroupResponse
//   PUT    /groups/{id}/status              -> GroupResponse (ACTIVE <-> INACTIVE)
//   PUT    /groups/{id}/leader              -> GroupResponse (customerId must already be a member)
//   POST   /groups/{id}/close               -> GroupResponse (terminal)
//   GET    /groups/{id}/members             -> GroupMemberResponse[]
//   POST   /groups/{id}/members             -> GroupMemberResponse
//   PUT    /groups/{id}/members/{customerId}/leave -> GroupMemberResponse (status ACTIVE -> LEFT, sets leftAt; no hard delete — mirrors `loan_group_members`'s left_at/status columns)
export type GroupStatus = 'ACTIVE' | 'INACTIVE' | 'CLOSED'

export interface GroupRequest {
  name: string
  code?: string
  loanProductId?: string // LoanProductResponse.id (UUID) — see features/loan-products/types.ts
  branchId?: number
  leaderCustomerId?: number
  formationDate?: string // ISO date (yyyy-MM-dd)
}

export interface GroupResponse {
  id: number
  name: string
  code: string
  loanProductId: string | null
  loanProductName: string | null
  branchId: number | null
  branchName: string | null
  leaderCustomerId: number | null
  leaderName: string | null
  memberCount: number
  formationDate: string | null
  status: GroupStatus
  createdAt: string
  updatedAt: string
}

// Query params for GET /groups — all optional.
export interface GroupFilter {
  search?: string
  status?: GroupStatus
  branchId?: number
  page?: number
  size?: number
}

// Mirrors the real `loan_group_members` table (id, group_id, customer_id,
// role, joined_at, left_at, status). `role` is membership-level (this app
// only ever sets/reads LEADER vs MEMBER via the leader endpoints above —
// loan_groups.leader_customer_id stays the authoritative "who is the
// current leader" pointer, kept in sync with role server-side).
export type GroupMemberRole = 'LEADER' | 'MEMBER'
export type GroupMemberStatus = 'ACTIVE' | 'LEFT'

export interface GroupMemberResponse {
  id: number
  customerId: number
  customerName: string
  role: GroupMemberRole
  status: GroupMemberStatus
  // Server-derived: VERIFIED if the customer has >=1 ACTIVE identity on file
  // (features/customers/types.ts CustomerIdentityResponse) — not a stored
  // loan_group_members column; verification happens on the customer's own
  // Identities (KYC) card, not here.
  kycStatus: 'VERIFIED' | 'PENDING'
  joinedAt: string
  leftAt: string | null
}

export interface AddGroupMemberRequest {
  customerId: number
}

export interface SetGroupLeaderRequest {
  customerId: number
}

// ── Group loan applications (group_loan_applications) — bundles one line-item
// request per participating member instead of features/loans' single
// customerId/amount; approval is one whole-application decision that creates
// one individual Loan per member (loan-service; each Loan stays customerId-only,
// see features/loans/types/loan.ts — group-awareness lives only at this layer).
//
//   POST   /group-loan-applications                                      -> GroupLoanApplicationResponse
//   GET    /group-loan-applications/{id}                                 -> GroupLoanApplicationResponse
//   GET    /group-loan-applications                                      -> PageResponse<GroupLoanApplicationResponse>
//   GET    /group-loan-applications/group/{groupId}                      -> GroupLoanApplicationResponse[]
//   PUT    /group-loan-applications/{id}/start-review                    -> GroupLoanApplicationResponse (ADMIN, SUBMITTED only)
//   PUT    /group-loan-applications/{id}/cancel                          -> GroupLoanApplicationResponse (SUBMITTED/UNDER_REVIEW only)
//   POST   /group-loan-applications/{id}/approvals   <- GroupLoanApplicationApprovalRequest -> GroupLoanApplicationResponse (ADMIN)
//   POST   /group-loan-applications/{id}/documents   <- GroupLoanApplicationDocumentRequest -> GroupLoanApplicationDocumentResponse
//   PUT    /group-loan-applications/{id}/documents/{documentId}/verify   -> GroupLoanApplicationDocumentResponse (ADMIN)
//   PUT    /group-loan-applications/{id}/documents/{documentId}/reject   -> GroupLoanApplicationDocumentResponse (ADMIN)
//   DELETE /group-loan-applications/{id}/documents/{documentId}                                                  (ADMIN)
export type GroupLoanApplicationStatus =
  'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN'

export interface GroupLoanMemberRequest {
  customerId: number
  requestedAmount: number
  requestedTermMonths: number
}

export interface GroupLoanApplicationRequest {
  groupId: number
  purpose?: string
  members: GroupLoanMemberRequest[]
}

export interface GroupLoanMemberLine {
  customerId: number
  customerName: string
  requestedAmount: number
  requestedTermMonths: number
  approvedAmount: number | null
  approvedInterestRate: number | null
  approvedTermMonths: number | null
  loanId: number | null
}

export interface GroupLoanApplicationResponse {
  id: number
  applicationNo: string | null
  groupId: number
  groupName: string
  branchId: number | null
  purpose: string | null
  status: GroupLoanApplicationStatus
  members: GroupLoanMemberLine[]
  documents: GroupLoanApplicationDocumentResponse[]
  submittedAt: string
  decidedAt: string | null
  createdAt: string
  updatedAt: string
}

// Query params for GET /group-loan-applications — all optional.
export interface GroupLoanApplicationFilter {
  search?: string
  status?: GroupLoanApplicationStatus
  branchId?: number
  page?: number
  size?: number
}

export type GroupLoanDocumentStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'

export interface GroupLoanApplicationDocumentRequest {
  documentType: string
  fileName: string
  fileUrl: string
}

export interface GroupLoanApplicationDocumentResponse {
  id: number
  applicationId: number
  documentType: string
  fileName: string
  fileUrl: string
  status: GroupLoanDocumentStatus
  uploadedAt: string
}

export type GroupLoanApprovalDecision = 'APPROVED' | 'REJECTED'

export interface GroupLoanApprovalMemberDecision {
  customerId: number
  approvedAmount?: number
  approvedInterestRate?: number
  approvedTermMonths?: number
}

export interface GroupLoanApplicationApprovalRequest {
  decision: GroupLoanApprovalDecision
  // Required when decision === 'APPROVED', one entry per application member.
  members?: GroupLoanApprovalMemberDecision[]
  comments?: string
}
