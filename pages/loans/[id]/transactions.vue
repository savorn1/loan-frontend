<template>
  <div>
    <UCard>
      <template #header>
        <span class="font-semibold">{{ t('loans.transactions.title') }}</span>
      </template>

      <DataTable :rows="transactions ?? []" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-banknotes"
            :title="t('loans.transactions.empty.title')"
            :description="t('loans.transactions.empty.description')"
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

const { t } = useI18n()
const route = useRoute()
const api = useApi()

const loanId = route.params.id as string

const { data: transactions, pending } = await useAsyncData(`loan-${loanId}-transactions`, () =>
  api<LoanTransactionResponse[]>(`/loans/${loanId}/transactions`)
)

const columns = computed<ColumnDef<LoanTransactionResponse>[]>(() => [
  { key: 'transactionDate', label: t('loans.transactions.columns.date'), type: 'date' },
  { key: 'type', label: t('loans.transactions.columns.type'), type: 'enum' },
  { key: 'amount', label: t('loans.transactions.columns.amount'), type: 'currency' },
  { key: 'description', label: t('loans.transactions.columns.description') },
  {
    key: 'balanceAfter',
    label: t('loans.transactions.columns.balanceAfter'),
    type: 'currency'
  }
])
</script>
