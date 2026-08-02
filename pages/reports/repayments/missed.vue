<template>
  <div>
    <UButton
      to="/reports"
      variant="link"
      icon="i-heroicons-arrow-left"
      size="xs"
      class="mb-1 px-0"
    >
      {{ t('admin.reports.title') }}
    </UButton>
    <PageHeader
      :title="t('accounting.repaymentReports.missed.title')"
      :description="t('accounting.repaymentReports.missed.description')"
    />

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-56"
          :placeholder="t('accounting.repaymentReports.missed.searchPlaceholder')"
        />
      </template>

      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable v-model:sort="sort" :rows="rows" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-exclamation-triangle"
            :title="t('accounting.repaymentReports.missed.emptyTitle')"
            :description="t('accounting.repaymentReports.missed.emptyDescription')"
          />
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { PaymentResponse } from '~/features/payments/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

interface MissedRow {
  loanId: number
  installmentNumber: number | null
  dueDate: string
  daysOverdue: number
  amount: number
}

const { t } = useI18n()
const api = useApi()

const {
  data: paymentsRaw,
  pending,
  error: fetchError
} = await useAsyncData('repayments-missed', () => api<PageResponse<PaymentResponse>>('/payments', { query: { size: 1000 } }))
const payments = computed(() => paymentsRaw.value?.content ?? [])

function todayIsoDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const todayIso = todayIsoDate()

const missedRows = computed<MissedRow[]>(() =>
  payments.value
    .filter((p) => p.status === 'OVERDUE')
    .map((p) => ({
      loanId: p.loanId,
      installmentNumber: p.installmentNumber,
      dueDate: p.dueDate,
      daysOverdue: Math.round((new Date(todayIso).getTime() - new Date(p.dueDate).getTime()) / 86400000),
      amount: p.amount
    }))
)

const { search, page, pageSize, sort, total, rows } = useClientTable(missedRows, {
  searchFields: ['loanId'],
  pageSize: 15
})

const columns = computed<ColumnDef<MissedRow>[]>(() => [
  { key: 'loanId', label: t('accounting.repaymentReports.missed.columns.loanId'), sortable: true },
  { key: 'installmentNumber', label: t('accounting.repaymentReports.missed.columns.installmentNumber'), sortable: true },
  { key: 'dueDate', label: t('accounting.repaymentReports.missed.columns.dueDate'), type: 'date', sortable: true },
  { key: 'daysOverdue', label: t('accounting.repaymentReports.missed.columns.daysOverdue'), sortable: true },
  { key: 'amount', label: t('accounting.repaymentReports.missed.columns.amount'), type: 'currency', sortable: true }
])
</script>
