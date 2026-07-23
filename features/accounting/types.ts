// Mirrors accounting-service's dto package.
export type JournalEntryLineType = 'DEBIT' | 'CREDIT'

export interface JournalEntryLineRequest {
  account: string
  type: JournalEntryLineType
  amount: number
}

export interface JournalEntryLineResponse extends JournalEntryLineRequest {
  id: number
}

export interface JournalEntryRequest {
  entryDate: string // ISO date
  description: string
  reference?: string
  lines: JournalEntryLineRequest[]
}

export interface JournalEntryResponse {
  id: number
  entryDate: string
  description: string
  reference: string | null
  totalDebit: number
  totalCredit: number
  lines: JournalEntryLineResponse[]
  createdAt: string
  updatedAt: string
}
