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
export type PaymentMethodType =
  'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'MOBILE_WALLET' | 'CHEQUE'

export type PaymentMethodStatus = 'ACTIVE' | 'INACTIVE'

export interface PaymentMethodRequest {
  code: string
  name: string
  type: PaymentMethodType
  status: PaymentMethodStatus
}

export interface PaymentMethodResponse {
  id: number
  code: string
  name: string
  type: PaymentMethodType
  status: PaymentMethodStatus
  createdAt: string
  updatedAt: string
}

// ── Payment channels (lookup entity — the route a payment came in through) ─
export type PaymentChannelStatus = 'ACTIVE' | 'INACTIVE'

export interface PaymentChannelRequest {
  code: string
  name: string
  channelType: string
  status: PaymentChannelStatus
}

export interface PaymentChannelResponse {
  id: number
  code: string
  name: string
  channelType: string
  status: PaymentChannelStatus
  createdAt: string
  updatedAt: string
}

// ── Payment gateways (lookup entity — the external provider a channel calls) ─
export type PaymentGatewayStatus = 'ACTIVE' | 'INACTIVE'

export interface PaymentGatewayRequest {
  code: string
  name: string
  provider: string
  apiUrl: string
  status: PaymentGatewayStatus
}

export interface PaymentGatewayResponse {
  id: number
  code: string
  name: string
  provider: string
  apiUrl: string
  status: PaymentGatewayStatus
  createdAt: string
  updatedAt: string
}

// ── Payment transactions (a money-movement event routed through a method/ ──
// channel/gateway on behalf of a customer, against some business entity) ──
export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED'

export interface PaymentTransactionRequest {
  customerId: number
  paymentMethodId: number
  paymentChannelId: number
  paymentGatewayId: number
  businessType: string
  businessReference?: string
  currency: string
  amount: number
  referenceNo?: string
}

// How a transaction's amount is split across the business entities it settles
// (e.g. multiple loan installments in one payment) — computed by the backend,
// read-only, returned nested on PaymentTransactionResponse.
export interface PaymentTransactionItemResponse {
  id: number
  paymentTransactionId: number
  referenceType: string
  referenceId: number
  amount: number
}

export interface PaymentTransactionResponse {
  id: number
  paymentNo: string
  referenceNo: string | null
  customerId: number
  customerName: string
  paymentMethodId: number
  paymentMethodName: string
  paymentChannelId: number
  paymentChannelName: string
  paymentGatewayId: number
  paymentGatewayName: string
  businessType: string
  businessReference: string | null
  currency: string
  amount: number
  status: TransactionStatus
  requestedAt: string
  completedAt: string | null
  items: PaymentTransactionItemResponse[]
}
