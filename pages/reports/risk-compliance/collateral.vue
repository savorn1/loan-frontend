<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.riskComplianceReports.collateral.title')"
      :description="t('accounting.riskComplianceReports.collateral.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.riskComplianceReportsHeader') },
        { label: t('accounting.riskComplianceReports.collateral.title') }
      ]"
    />

    <UCard v-if="rows.length > 0" class="mb-6">
      <dl class="grid grid-cols-2 gap-y-3 text-sm">
        <dt class="text-gray-500">
          {{ t('accounting.riskComplianceReports.collateral.pledgedCount') }}
        </dt>
        <dd class="font-semibold text-right">{{ pledgedCount }}</dd>
        <dt class="text-gray-500">
          {{ t('accounting.riskComplianceReports.collateral.totalPledgedValue') }}
        </dt>
        <dd class="font-semibold text-right">{{ formatCurrency(totalPledgedValue) }}</dd>
      </dl>
    </UCard>

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-full sm:w-64"
          :placeholder="t('accounting.riskComplianceReports.collateral.searchPlaceholder')"
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
            icon="i-heroicons-shield-check"
            :title="t('accounting.riskComplianceReports.collateral.emptyTitle')"
            :description="t('accounting.riskComplianceReports.collateral.emptyDescription')"
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

interface CollateralRow {
  loanNo: string
  customer: string
  type: string
  description: string
  estimatedValue: number
  status: string
}

const { t } = useI18n()
const api = useApi()

const {
  data: loansRaw,
  pending: p1,
  error: e1
} = await useAsyncData('risk-collateral-loans', () =>
  api<PageResponse<LoanResponse>>('/loans', { query: { size: 1000 } })
)
// Scoped to ACTIVE loans (the population collateral coverage actually matters
// for) to keep the per-loan collateral fan-out below bounded.
const loans = computed(() => (loansRaw.value?.content ?? []).filter((l) => l.status === 'ACTIVE'))

// No portfolio-wide collateral endpoint exists — only per-loan
// (/loans/{id}/collaterals) — so fetch one call per loan.
const {
  data: collateralByLoan,
  pending: p2,
  error: e2
} = await useAsyncData(
  'risk-collateral-items',
  () =>
    Promise.all(
      loans.value.map((l) => api<LoanCollateralResponse[]>(`/loans/${l.id}/collaterals`))
    ),
  { watch: [loans] }
)

const pending = computed(() => p1.value || p2.value)
const fetchError = computed(() => e1.value || e2.value)

const rows = computed<CollateralRow[]>(() => {
  const result: CollateralRow[] = []
  loans.value.forEach((loan, i) => {
    for (const c of collateralByLoan.value?.[i] ?? []) {
      result.push({
        loanNo: loan.loanNo,
        customer: loan.customerName,
        type: c.type,
        description: c.description,
        estimatedValue: c.estimatedValue,
        status: c.status
      })
    }
  })
  return result
})

const pledgedCount = computed(() => rows.value.filter((r) => r.status === 'PLEDGED').length)
const totalPledgedValue = computed(() =>
  rows.value.filter((r) => r.status === 'PLEDGED').reduce((sum, r) => sum + r.estimatedValue, 0)
)

const {
  search,
  page,
  pageSize,
  sort,
  total,
  rows: pagedRows
} = useClientTable(rows, {
  searchFields: ['loanNo', 'customer', 'description'],
  pageSize: 15
})

const columns = computed<ColumnDef<CollateralRow>[]>(() => [
  {
    key: 'loanNo',
    label: t('accounting.riskComplianceReports.collateral.columns.loan'),
    sortable: true
  },
  {
    key: 'customer',
    label: t('accounting.riskComplianceReports.collateral.columns.customer'),
    sortable: true
  },
  {
    key: 'type',
    label: t('accounting.riskComplianceReports.collateral.columns.type'),
    type: 'enum',
    sortable: true
  },
  {
    key: 'description',
    label: t('accounting.riskComplianceReports.collateral.columns.description')
  },
  {
    key: 'estimatedValue',
    label: t('accounting.riskComplianceReports.collateral.columns.estimatedValue'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'status',
    label: t('accounting.riskComplianceReports.collateral.columns.status'),
    type: 'badge',
    color: (row) => (row.status === 'PLEDGED' ? 'teal' : row.status === 'SEIZED' ? 'red' : 'gray'),
    sortable: true
  }
])
</script>
