<template>
  <div>
    <PageHeader
      :title="t('accounting.interestReports.outstanding.title')"
      :description="t('accounting.interestReports.outstanding.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.interestReportsHeader') },
        { label: t('accounting.interestReports.outstanding.title') }
      ]"
    />

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-56"
          :placeholder="t('accounting.interestReports.outstanding.searchPlaceholder')"
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
            icon="i-heroicons-scale"
            :title="t('accounting.interestReports.outstanding.emptyTitle')"
            :description="t('accounting.interestReports.outstanding.emptyDescription')"
          />
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
      <p class="text-xs text-gray-500 mt-3">
        {{ t('accounting.interestReports.outstanding.note') }}
      </p>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { LoanInterestResponse } from '~/features/loans/types'
import type { PaymentResponse } from '~/features/payments/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

interface OutstandingRow {
  loanId: number
  totalAccrued: number
  totalCollected: number
  outstanding: number
}

const { t } = useI18n()
const api = useApi()

const [
  { data: accrualsRaw, pending: p1, error: e1 },
  { data: paymentsRaw, pending: p2, error: e2 }
] = await Promise.all([
  useAsyncData('interest-outstanding-accruals', () =>
    api<PageResponse<LoanInterestResponse>>('/loans/interest', { query: { size: 1000 } })
  ),
  useAsyncData('interest-outstanding-payments', () =>
    api<PageResponse<PaymentResponse>>('/payments', { query: { size: 1000 } })
  )
])

const pending = computed(() => p1.value || p2.value)
const fetchError = computed(() => e1.value || e2.value)

const outstandingRows = computed<OutstandingRow[]>(() => {
  const accruedByLoan = new Map<number, number>()
  for (const a of accrualsRaw.value?.content ?? []) {
    accruedByLoan.set(a.loanId, (accruedByLoan.get(a.loanId) ?? 0) + a.amount)
  }
  const collectedByLoan = new Map<number, number>()
  for (const p of paymentsRaw.value?.content ?? []) {
    if (p.status !== 'PAID' || !p.interestComponent) continue
    collectedByLoan.set(p.loanId, (collectedByLoan.get(p.loanId) ?? 0) + p.interestComponent)
  }

  const result: OutstandingRow[] = []
  for (const [loanId, totalAccrued] of accruedByLoan) {
    const totalCollected = collectedByLoan.get(loanId) ?? 0
    const outstanding = totalAccrued - totalCollected
    if (outstanding > 0) {
      result.push({ loanId, totalAccrued, totalCollected, outstanding })
    }
  }
  return result
})

const { search, page, pageSize, sort, total, rows } = useClientTable(outstandingRows, {
  searchFields: ['loanId'],
  pageSize: 15
})

const columns = computed<ColumnDef<OutstandingRow>[]>(() => [
  {
    key: 'loanId',
    label: t('accounting.interestReports.outstanding.columns.loanId'),
    sortable: true
  },
  {
    key: 'totalAccrued',
    label: t('accounting.interestReports.outstanding.columns.totalAccrued'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'totalCollected',
    label: t('accounting.interestReports.outstanding.columns.totalCollected'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'outstanding',
    label: t('accounting.interestReports.outstanding.columns.outstanding'),
    type: 'currency',
    sortable: true
  }
])
</script>
