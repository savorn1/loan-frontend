// Mirrors accounting-service's dto package (java/loan/accounting-service), proxied
// through the gateway at /api/gl-accounts/**, /api/journal-templates/**,
// /api/accounting-schemes/**, /api/financial-periods/**, /api/journal-entries/**
// and /api/trial-balance/** (see nuxt.config.ts). Every id here is a Long (number) —
// unlike loan-product-service, accounting-service does not use UUIDs.
//
// accounting-service knows nothing about loan products — only TransactionType
// (a business event name) and opaque referenceType/referenceId strings pointing
// back at the upstream domain object that triggered the posting.

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'
export type EntrySide = 'DEBIT' | 'CREDIT'
export type GlAccountStatus = 'ACTIVE' | 'INACTIVE'

export type TransactionType =
  | 'DISBURSEMENT'
  | 'PRINCIPAL_PAYMENT'
  | 'INTEREST_PAYMENT'
  | 'FEE_CHARGE'
  | 'PENALTY_CHARGE'
  | 'LOAN_WRITE_OFF'
  | 'PAYMENT_REVERSAL'

// ── Chart of Accounts ──────────────────────────────────────────────────────
//
//   GET    /gl-accounts       -> GlAccountResponse[]
//   POST   /gl-accounts       <- GlAccountRequest   -> GlAccountResponse
//   GET    /gl-accounts/{id}   -> GlAccountResponse
//   PUT    /gl-accounts/{id}   <- GlAccountRequest   -> GlAccountResponse
//   DELETE /gl-accounts/{id}                                                  (fails if it has child accounts)

export interface GlAccountRequest {
  parentId?: number
  accountNo: string
  accountName: string
  accountType: AccountType
  normalBalance: EntrySide
  currency: string
  allowPosting: boolean
  status: GlAccountStatus
}

export interface GlAccountResponse {
  id: number
  parentId: number | null
  accountNo: string
  accountName: string
  accountType: AccountType
  normalBalance: EntrySide
  currency: string
  allowPosting: boolean
  status: GlAccountStatus
  createdAt: string
  updatedAt: string
}

// ── Journal Templates ──────────────────────────────────────────────────────
// A template's lines are symbolic placeholders (accountRole, e.g. "CASH") —
// AccountingScheme resolves each role to a real gl_account per currency.
//
//   GET    /journal-templates       -> JournalTemplateResponse[]
//   POST   /journal-templates       <- JournalTemplateRequest   -> JournalTemplateResponse
//   GET    /journal-templates/{id}   -> JournalTemplateResponse
//   PUT    /journal-templates/{id}   <- JournalTemplateRequest   -> JournalTemplateResponse
//   DELETE /journal-templates/{id}

export type JournalTemplateStatus = 'ACTIVE' | 'INACTIVE'

export interface JournalTemplateLineRequest {
  lineNo: number
  accountRole: string
  entrySide: EntrySide
  description?: string
}

export interface JournalTemplateLineResponse {
  id: number
  lineNo: number
  accountRole: string
  entrySide: EntrySide
  description: string | null
}

export interface JournalTemplateRequest {
  code: string
  name: string
  transactionType: TransactionType
  description?: string
  status: JournalTemplateStatus
  lines: JournalTemplateLineRequest[]
}

export interface JournalTemplateResponse {
  id: number
  code: string
  name: string
  transactionType: TransactionType
  description: string | null
  status: JournalTemplateStatus
  lines: JournalTemplateLineResponse[]
  createdAt: string
  updatedAt: string
}

// ── Accounting Schemes ─────────────────────────────────────────────────────
// Binds one journal template's accountRole + currency to a real gl_account.
//
//   GET    /accounting-schemes       -> AccountingSchemeResponse[]
//   POST   /accounting-schemes       <- AccountingSchemeRequest   -> AccountingSchemeResponse
//   GET    /accounting-schemes/{id}   -> AccountingSchemeResponse
//   PUT    /accounting-schemes/{id}   <- AccountingSchemeRequest   -> AccountingSchemeResponse
//   DELETE /accounting-schemes/{id}

export type AccountingSchemeStatus = 'ACTIVE' | 'INACTIVE'

export interface AccountingSchemeRequest {
  journalTemplateId: number
  accountRole: string
  glAccountId: number
  currency: string
  status: AccountingSchemeStatus
}

export interface AccountingSchemeResponse {
  id: number
  journalTemplateId: number
  accountRole: string
  glAccountId: number
  glAccountNo: string
  currency: string
  status: AccountingSchemeStatus
  createdAt: string
  updatedAt: string
}

// ── Financial Periods ──────────────────────────────────────────────────────
// Every journal entry is scoped to the period covering its transactionDate;
// posting/reversing is blocked once a period is closed.
//
//   GET    /financial-periods            -> FinancialPeriodResponse[]
//   POST   /financial-periods            <- FinancialPeriodRequest   -> FinancialPeriodResponse
//   GET    /financial-periods/{id}        -> FinancialPeriodResponse
//   PUT    /financial-periods/{id}        <- FinancialPeriodRequest   -> FinancialPeriodResponse
//   POST   /financial-periods/{id}/close   -> FinancialPeriodResponse
//   DELETE /financial-periods/{id}

export type FinancialPeriodStatus = 'OPEN' | 'CLOSED'

export interface FinancialPeriodRequest {
  periodName: string
  startDate: string // ISO date
  endDate: string // ISO date
}

export interface FinancialPeriodResponse {
  id: number
  periodName: string
  startDate: string
  endDate: string
  status: FinancialPeriodStatus
  createdAt: string
  updatedAt: string
}

// ── Journal Posting ────────────────────────────────────────────────────────
// Created as DRAFT (must already balance); POST /{id}/post moves it to POSTED
// (re-validates balance + open period); POST /{id}/reverse creates a new,
// already-POSTED entry with every line's side flipped and marks the original
// REVERSED.
//
//   GET    /journal-entries                          -> JournalEntryResponse[]
//   GET    /journal-entries?financialPeriodId={id}     -> JournalEntryResponse[]
//   POST   /journal-entries                          <- JournalEntryRequest   -> JournalEntryResponse
//   GET    /journal-entries/{id}                       -> JournalEntryResponse
//   POST   /journal-entries/{id}/post                  -> JournalEntryResponse
//   POST   /journal-entries/{id}/reverse                -> JournalEntryResponse

export type JournalEntryStatus = 'DRAFT' | 'POSTED' | 'REVERSED'

export interface JournalEntryLineRequest {
  lineNo: number
  glAccountId: number
  entrySide: EntrySide
  amount: number
  description?: string
}

export interface JournalEntryLineResponse {
  id: number
  lineNo: number
  glAccountId: number
  glAccountNo: string
  entrySide: EntrySide
  amount: number
  description: string | null
}

export interface JournalEntryRequest {
  transactionType: TransactionType
  transactionDate: string // ISO date
  referenceType?: string
  referenceId?: string
  currency: string
  description?: string
  lines: JournalEntryLineRequest[]
}

export interface JournalEntryResponse {
  id: number
  entryNo: string | null
  transactionType: TransactionType
  transactionDate: string
  financialPeriodId: number
  financialPeriodName: string
  referenceType: string | null
  referenceId: string | null
  currency: string
  description: string | null
  status: JournalEntryStatus
  postedAt: string | null
  postedBy: string | null
  lines: JournalEntryLineResponse[]
  createdAt: string
  updatedAt: string
}

// ── Journal Audit Log ──────────────────────────────────────────────────────
// Append-only trail written by JournalEntryService on create/post/reverse —
// distinct from JournalEntryResponse's own createdAt/updatedAt, which only
// describe the entry row's own lifecycle, not who acted on it and when.
//
//   GET /journal-entries/{id}/audit-logs -> JournalAuditLogResponse[]

export type JournalAuditAction = 'CREATED' | 'POSTED' | 'REVERSED'

export interface JournalAuditLogResponse {
  id: number
  journalEntryId: number
  action: JournalAuditAction
  performedBy: string
  performedAt: string
  details: string | null
}

// ── General Ledger (persisted balance table, not computed on the fly) ────
// One row conceptually per (gl_account, financial_period) in general_ledger,
// updated incrementally whenever a journal entry posts (see
// GeneralLedgerServiceImpl.applyPostedEntry). openingBalance/closingBalance are
// signed in the account's own normalBalance direction and roll forward from the
// prior period automatically — lines[] still lists the individual posted
// transactions for the period, with a running balance seeded from openingBalance.
//
//   GET /gl-accounts/{id}/ledger?financialPeriodId={id} -> GeneralLedgerResponse

export interface LedgerLineResponse {
  entryNo: string
  transactionDate: string
  description: string | null
  entrySide: EntrySide
  amount: number
  runningBalance: number
}

export interface GeneralLedgerResponse {
  glAccountId: number
  accountNo: string
  accountName: string
  financialPeriodId: number
  financialPeriodName: string
  openingBalance: number
  periodDebitTotal: number
  periodCreditTotal: number
  closingBalance: number
  lines: LedgerLineResponse[]
}

// ── Trial Balance ──────────────────────────────────────────────────────────
// Two ways to see it: a live report re-aggregated from journal_entry_lines on
// every call (no carryforward — period activity only), or an immutable,
// persisted snapshot sourced from general_ledger balances (includes the
// rolled-forward closing balance, the traditional trial-balance semantic).
// The two can legitimately show different "balance" numbers for the same
// period; the snapshot is the one with carryforward.
//
//   GET  /trial-balance?financialPeriodId={id}              -> TrialBalanceRowResponse[]            (live, computed)
//   POST /trial-balance/snapshots?financialPeriodId={id}     -> TrialBalanceResponse                  (generates + persists)
//   GET  /trial-balance/snapshots?financialPeriodId={id}     -> TrialBalanceResponse[]                (most recent first)
//   GET  /trial-balance/snapshots/{id}                       -> TrialBalanceResponse

export interface TrialBalanceRowResponse {
  glAccountId: number
  accountNo: string
  accountName: string
  totalDebit: number
  totalCredit: number
  balance: number
}

export interface TrialBalanceResponse {
  id: number
  financialPeriodId: number
  financialPeriodName: string
  generatedAt: string
  generatedBy: string
  totalDebit: number
  totalCredit: number
  lines: TrialBalanceRowResponse[]
}
