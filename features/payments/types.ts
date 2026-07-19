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
