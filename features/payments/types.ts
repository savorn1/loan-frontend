// Mirrors payment-service's dto package.
export type PaymentStatus = 'PENDING' | 'PAID' | 'OVERDUE'

export interface PaymentRequest {
  loanId: number
  amount: number
  dueDate: string // ISO date
  note?: string
}

export interface PaymentResponse {
  id: number
  loanId: number
  amount: number
  dueDate: string
  paidAt: string | null
  status: PaymentStatus
  note: string | null
  installmentNumber: number | null
  principalComponent: number | null
  interestComponent: number | null
  createdAt: string
  updatedAt: string
}

export interface ScheduleInstallmentRequest {
  installmentNumber: number
  dueDate: string
  principalComponent: number
  interestComponent: number
  amount: number
}

export interface GenerateScheduleRequest {
  loanId: number
  installments: ScheduleInstallmentRequest[]
}

// ── Payment methods (lookup entity — how a payment was/can be collected) ───
export type PaymentMethodType = 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'MOBILE_WALLET' | 'CHEQUE'

export interface PaymentMethodRequest {
  name: string
  type: PaymentMethodType
  isActive: boolean
  details?: string
}

export interface PaymentMethodResponse {
  id: number
  name: string
  type: PaymentMethodType
  isActive: boolean
  details: string | null
  createdAt: string
  updatedAt: string
}

// ── Payment transactions (a single money-movement event against a payment) ─
export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED'

export interface PaymentTransactionRequest {
  paymentId: number
  paymentMethodId: number
  amount: number
  reference?: string
}

export interface PaymentTransactionResponse {
  id: number
  paymentId: number
  loanId: number
  paymentMethodId: number
  paymentMethodName: string
  amount: number
  reference: string | null
  status: TransactionStatus
  processedAt: string | null
  createdAt: string
  updatedAt: string
}
