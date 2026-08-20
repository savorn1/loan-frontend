<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.riskComplianceReports.loanToValue.title')"
      :description="t('accounting.riskComplianceReports.loanToValue.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.riskComplianceReportsHeader') },
        { label: t('accounting.riskComplianceReports.loanToValue.title') }
      ]"
    />

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-full sm:w-64"
          :placeholder="t('accounting.riskComplianceReports.loanToValue.searchPlaceholder')"
        />
      </template>

      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable v-model:sort="sort" :rows="pagedRows" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-scale"
            :title="t('accounting.riskComplianceReports.loanToValue.emptyTitle')"
            :description="t('accounting.riskComplianceReports.loanToValue.emptyDescription')"
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
import type { LoanResponse, LoanCollateralResponse } from '~/features/loans/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

interface LtvRow {
  loanNo: string
  customer: string
  outstandingBalance: number
  collateralValue: number
  ltvPercent: number
}

const { t } = useI18n()
const api = useApi()

const {
  data: loansRaw,
  pending: p1,
  error: e1
} = await useAsyncData('risk-ltv-loans', () =>
  api<PageResponse<LoanResponse>>('/loans', { query: { size: 1000 } })
)
// Scoped to ACTIVE loans — LTV only means something while the loan (and its
// collateral obligation) is still outstanding.
const loans = computed(() => (loansRaw.value?.content ?? []).filter((l) => l.status === 'ACTIVE'))

// No portfolio-wide collateral endpoint exists — only per-loan
// (/loans/{id}/collaterals) — so fetch one call per loan.
const {
  data: collateralByLoan,
  pending: p2,
  error: e2
} = await useAsyncData(
  'risk-ltv-collateral',
  () =>
    Promise.all(
      loans.value.map((l) => api<LoanCollateralResponse[]>(`/loans/${l.id}/collaterals`))
    ),
  { watch: [loans] }
)

const pending = computed(() => p1.value || p2.value)
const fetchError = computed(() => e1.value || e2.value)

// Only loans that actually have pledged collateral produce a meaningful ratio.
const rows = computed<LtvRow[]>(() => {
  const result: LtvRow[] = []
  loans.value.forEach((loan, i) => {
    const collateralValue = (collateralByLoan.value?.[i] ?? [])
      .filter((c) => c.status === 'PLEDGED')
      .reduce((sum, c) => sum + c.estimatedValue, 0)
    if (collateralValue <= 0) return
    const outstandingBalance = loan.outstandingBalance ?? 0
    result.push({
      loanNo: loan.loanNo,
      customer: loan.customerName,
      outstandingBalance,
      collateralValue,
      ltvPercent: Math.round((outstandingBalance / collateralValue) * 1000) / 10
    })
  })
  return result
})

const {
  search,
  page,
  pageSize,
  sort,
  total,
  rows: pagedRows
} = useClientTable(rows, {
  searchFields: ['loanNo', 'customer'],
  pageSize: 15
})

const columns = computed<ColumnDef<LtvRow>[]>(() => [
  {
    key: 'loanNo',
    label: t('accounting.riskComplianceReports.loanToValue.columns.loan'),
    sortable: true
  },
  {
    key: 'customer',
    label: t('accounting.riskComplianceReports.loanToValue.columns.customer'),
    sortable: true
  },
  {
    key: 'outstandingBalance',
    label: t('accounting.riskComplianceReports.loanToValue.columns.outstandingBalance'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'collateralValue',
    label: t('accounting.riskComplianceReports.loanToValue.columns.collateralValue'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'ltvPercent',
    label: t('accounting.riskComplianceReports.loanToValue.columns.ltvPercent'),
    type: 'percent',
    sortable: true
  }
])
</script>
