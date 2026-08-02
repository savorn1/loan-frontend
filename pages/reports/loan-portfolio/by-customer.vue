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
      :title="t('accounting.loanPortfolioReports.byCustomer.title')"
      :description="t('accounting.loanPortfolioReports.byCustomer.description')"
    />

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-64"
          :placeholder="t('accounting.loanPortfolioReports.byCustomer.searchPlaceholder')"
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
            icon="i-heroicons-user-group"
            :title="t('accounting.loanPortfolioReports.byCustomer.emptyTitle')"
            :description="t('accounting.loanPortfolioReports.byCustomer.emptyDescription')"
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
import type { LoanResponse } from '~/features/loans/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

interface CustomerLoanRow {
  customerId: number
  customer: string
  loanCount: number
  totalPrincipal: number
  totalOutstanding: number
}

const { t } = useI18n()
const api = useApi()

const {
  data: loansRaw,
  pending,
  error: fetchError
} = await useAsyncData('loan-portfolio-by-customer', () => api<PageResponse<LoanResponse>>('/loans', { query: { size: 1000 } }))
const loans = computed(() => loansRaw.value?.content ?? [])

const aggregated = computed<CustomerLoanRow[]>(() => {
  const byCustomer = new Map<number, CustomerLoanRow>()
  for (const loan of loans.value) {
    const existing = byCustomer.get(loan.customerId) ?? {
      customerId: loan.customerId,
      customer: loan.customerName,
      loanCount: 0,
      totalPrincipal: 0,
      totalOutstanding: 0
    }
    existing.loanCount += 1
    existing.totalPrincipal += loan.principal
    existing.totalOutstanding += loan.outstandingBalance ?? 0
    byCustomer.set(loan.customerId, existing)
  }
  return [...byCustomer.values()]
})

const { search, page, pageSize, sort, total, rows } = useClientTable(aggregated, {
  searchFields: ['customer'],
  pageSize: 15
})

const columns = computed<ColumnDef<CustomerLoanRow>[]>(() => [
  { key: 'customer', label: t('accounting.loanPortfolioReports.byCustomer.columns.customer'), sortable: true },
  { key: 'loanCount', label: t('accounting.loanPortfolioReports.byCustomer.columns.loanCount'), sortable: true },
  { key: 'totalPrincipal', label: t('accounting.loanPortfolioReports.byCustomer.columns.totalPrincipal'), type: 'currency', sortable: true },
  {
    key: 'totalOutstanding',
    label: t('accounting.loanPortfolioReports.byCustomer.columns.totalOutstanding'),
    type: 'currency',
    sortable: true
  }
])
</script>
