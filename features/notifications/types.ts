// Mirrors notification-service's dto package.
export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP'

export type RecipientType = 'CUSTOMER' | 'USER'

export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED'

export interface NotificationResponse {
  id: number
  recipientType: RecipientType
  recipientId: number
  channel: NotificationChannel
  recipientContact: string | null
  subject: string | null
  message: string
  status: NotificationStatus
  sentAt: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

// Query params for GET /notifications — mirrors NotificationFilterRequest.
export interface NotificationFilter {
  recipientType?: RecipientType
  channel?: NotificationChannel
  status?: NotificationStatus
  page?: number
  size?: number
}
