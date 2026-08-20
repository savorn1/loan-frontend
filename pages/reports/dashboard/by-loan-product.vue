<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.dashboardReports.byLoanProduct.title')"
      :description="t('accounting.dashboardReports.byLoanProduct.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.dashboardReportsHeader') },
        { label: t('accounting.dashboardReports.byLoanProduct.title') }
      ]"
    />

    <UCard>
      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable :rows="rows" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-briefcase"
            :title="t('accounting.dashboardReports.byLoanProduct.emptyTitle')"
            :description="t('accounting.dashboardReports.byLoanProduct.emptyDescription')"
          />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { LoanResponse } from '~/features/loans/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

interface LoanProductRow {
  loanProduct: string
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
} = await useAsyncData('dashboard-by-loan-product', () =>
  api<PageResponse<LoanResponse>>('/loans', { query: { size: 1000 } })
)
const loans = computed(() => loansRaw.value?.content ?? [])

const rows = computed<LoanProductRow[]>(() => {
  const byProduct = new Map<string, LoanProductRow>()
  for (const loan of loans.value) {
    const loanProduct = loan.loanProductName ?? '—'
    const existing = byProduct.get(loanProduct) ?? {
      loanProduct,
      loanCount: 0,
      totalPrincipal: 0,
      totalOutstanding: 0
    }
    existing.loanCount += 1
    existing.totalPrincipal += loan.principal
    existing.totalOutstanding += loan.outstandingBalance ?? 0
    byProduct.set(loanProduct, existing)
  }
  return [...byProduct.values()]
})

const columns = computed<ColumnDef<LoanProductRow>[]>(() => [
  {
    key: 'loanProduct',
    label: t('accounting.dashboardReports.byLoanProduct.columns.loanProduct'),
    sortable: true
  },
  {
    key: 'loanCount',
    label: t('accounting.dashboardReports.byLoanProduct.columns.loanCount'),
    sortable: true
  },
  {
    key: 'totalPrincipal',
    label: t('accounting.dashboardReports.byLoanProduct.columns.totalPrincipal'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'totalOutstanding',
    label: t('accounting.dashboardReports.byLoanProduct.columns.totalOutstanding'),
    type: 'currency',
    sortable: true
  }
])
</script>
