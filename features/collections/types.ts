// Mirrors payment-service's new collections domain (dto package).
export type CollectionBucket = 'DPD_1_30' | 'DPD_31_60' | 'DPD_61_90' | 'DPD_90_PLUS'

export type CollectionCaseStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'

export type ContactMethod = 'PHONE' | 'EMAIL' | 'SMS' | 'VISIT' | 'OTHER'

export type ContactOutcome =
  | 'NO_ANSWER'
  | 'PROMISE_TO_PAY'
  | 'DISPUTED'
  | 'PAID'
  | 'LEFT_MESSAGE'
  | 'OTHER'

export type PromiseStatus = 'PENDING' | 'KEPT' | 'BROKEN' | 'PARTIAL'

export type LetterType = 'REMINDER' | 'DEMAND' | 'FINAL_NOTICE' | 'LEGAL_NOTICE'

export type LetterDeliveryMethod = 'EMAIL' | 'POST' | 'SMS'

export type LetterStatus = 'DRAFT' | 'SENT' | 'DELIVERED' | 'FAILED'

export interface CollectionWorkqueueItemResponse {
  loanId: number
  customerId: number
  customerName: string | null
  customerPhone: string | null
  customerEmail: string | null
  principal: number
  outstandingBalance: number | null
  totalOverdueAmount: number
  oldestDueDate: string
  maxDpd: number
  bucket: CollectionBucket
  overdueInstallmentCount: number
  caseStatus: CollectionCaseStatus | null
  assignedToUserId: number | null
  lastContactAt: string | null
  nextFollowUpAt: string | null
}

export interface CollectionCaseResponse {
  loanId: number
  status: CollectionCaseStatus
  assignedToUserId: number | null
  lastContactAt: string | null
  nextFollowUpAt: string | null
}

export interface AssignCollectionCaseRequest {
  userId: number
  note?: string
}

export interface UpdateCollectionCaseStatusRequest {
  status: CollectionCaseStatus
  note?: string
}

// ── Status / assignment history (read-only audit trails) ─────────────────
export interface CollectionStatusHistoryResponse {
  id: number
  loanId: number
  fromStatus: CollectionCaseStatus | null
  toStatus: CollectionCaseStatus
  changedBy: string
  note: string | null
  changedAt: string
}

export interface CollectionCaseAssignmentResponse {
  id: number
  loanId: number
  assignedToUserId: number | null
  assignedBy: string
  note: string | null
  assignedAt: string
}

// ── Activities (contact log — calls, emails, visits, notes) ──────────────
export interface CollectionActivityRequest {
  contactMethod: ContactMethod
  outcome: ContactOutcome
  note: string
  followUpDate?: string
}

export interface CollectionActivityResponse {
  id: number
  loanId: number
  authorName: string
  contactMethod: ContactMethod
  outcome: ContactOutcome
  note: string
  followUpDate: string | null
  createdAt: string
}

// ── Promises to pay ────────────────────────────────────────────────────────
export interface CollectionPromiseRequest {
  promisedAmount: number
  promisedDate: string
  notes?: string
}

export interface CollectionPromiseResponse {
  id: number
  loanId: number
  promisedAmount: number
  promisedDate: string
  status: PromiseStatus
  amountPaid: number | null
  notes: string | null
  createdByName: string
  resolvedAt: string | null
  createdAt: string
}

export interface ResolveCollectionPromiseRequest {
  status: Exclude<PromiseStatus, 'PENDING'>
  amountPaid?: number
}

// ── Collection letters (formal notices — record-keeping only) ────────────
export interface CollectionLetterRequest {
  letterType: LetterType
  deliveryMethod: LetterDeliveryMethod
  recipientAddress?: string
  content?: string
}

export interface CollectionLetterResponse {
  id: number
  loanId: number
  letterType: LetterType
  deliveryMethod: LetterDeliveryMethod
  status: LetterStatus
  recipientAddress: string | null
  content: string | null
  generatedByName: string
  sentAt: string | null
  createdAt: string
}

export interface UpdateCollectionLetterStatusRequest {
  status: Exclude<LetterStatus, 'DRAFT'>
}
