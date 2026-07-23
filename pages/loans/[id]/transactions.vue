<template>
  <div>
    <UCard>
      <template #header>
        <span class="font-semibold">Transactions</span>
      </template>

      <DataTable :rows="transactions ?? []" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-banknotes"
            title="No transactions yet"
            description="Every disbursement, payment, penalty/fee payment, adjustment, write-off and settlement on this loan is logged here."
          />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
// Read-only — the unified money-movement ledger. Nothing creates rows here
// directly; they're appended by loan-service alongside whatever action
// actually moved money (see the Disbursements/Payments/Penalties/Fees/
// Adjustments/Write-off/Settlement tabs).
import type { LoanTransactionResponse } from '~/features/loans/types'
import type { ColumnDef } from '~/shared/types'

const route = useRoute()
const api = useApi()

const loanId = route.params.id as string

const { data: transactions, pending } = await useAsyncData(`loan-${loanId}-transactions`, () =>
  api<LoanTransactionResponse[]>(`/loans/${loanId}/transactions`)
)

const columns: ColumnDef<LoanTransactionResponse>[] = [
  { key: 'transactionDate', label: 'Date', type: 'date' },
  { key: 'type', type: 'enum' },
  { key: 'amount', type: 'currency' },
  { key: 'description' },
  { key: 'balanceAfter', label: 'Balance after', type: 'currency' }
]
</script>
