<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.productProfitabilityReports.loanProfitability.title')"
      :description="t('accounting.productProfitabilityReports.loanProfitability.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.productProfitabilityReportsHeader') },
        { label: t('accounting.productProfitabilityReports.loanProfitability.title') }
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
            icon="i-heroicons-presentation-chart-line"
            :title="t('accounting.productProfitabilityReports.loanProfitability.emptyTitle')"
            :description="
              t('accounting.productProfitabilityReports.loanProfitability.emptyDescription')
            "
          />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { LoanResponse } from '~/features/loans/types'
import type { PaymentResponse } from '~/features/payments/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

interface LoanProfitabilityRow {
  loanProduct: string
  loanCount: number
  totalPrincipal: number
  totalInterestCollected: number
  yieldPercent: number
}

const { t } = useI18n()
const api = useApi()

const {
  data: loansRaw,
  pending: p1,
  error: e1
} = await useAsyncData('loan-profitability-loans', () =>
  api<PageResponse<LoanResponse>>('/loans', { query: { size: 1000 } })
)
const loans = computed(() => loansRaw.value?.content ?? [])

const {
  data: paymentsRaw,
  pending: p2,
  error: e2
} = await useAsyncData('loan-profitability-payments', () =>
  api<PageResponse<PaymentResponse>>('/payments', { query: { size: 1000 } })
)
const payments = computed(() => paymentsRaw.value?.content ?? [])

const pending = computed(() => p1.value || p2.value)
const fetchError = computed(() => e1.value || e2.value)

const productByLoanId = computed(
  () => new Map(loans.value.map((l) => [l.id, l.loanProductName ?? '—']))
)

const rows = computed<LoanProfitabilityRow[]>(() => {
  const byProduct = new Map<string, LoanProfitabilityRow>()
  for (const loan of loans.value) {
    const loanProduct = loan.loanProductName ?? '—'
    const existing = byProduct.get(loanProduct) ?? {
      loanProduct,
      loanCount: 0,
      totalPrincipal: 0,
      totalInterestCollected: 0,
      yieldPercent: 0
    }
    existing.loanCount += 1
    existing.totalPrincipal += loan.principal
    byProduct.set(loanProduct, existing)
  }
  for (const p of payments.value) {
    if (p.status !== 'PAID') continue
    const loanProduct = productByLoanId.value.get(p.loanId)
    if (!loanProduct) continue
    const row = byProduct.get(loanProduct)
    if (row) row.totalInterestCollected += p.interestComponent ?? 0
  }
  return [...byProduct.values()].map((row) => ({
    ...row,
    yieldPercent:
      row.totalPrincipal > 0
        ? Math.round((row.totalInterestCollected / row.totalPrincipal) * 1000) / 10
        : 0
  }))
})

const columns = computed<ColumnDef<LoanProfitabilityRow>[]>(() => [
  {
    key: 'loanProduct',
    label: t('accounting.productProfitabilityReports.loanProfitability.columns.loanProduct'),
    sortable: true
  },
  {
    key: 'loanCount',
    label: t('accounting.productProfitabilityReports.loanProfitability.columns.loanCount'),
    sortable: true
  },
  {
    key: 'totalPrincipal',
    label: t('accounting.productProfitabilityReports.loanProfitability.columns.totalPrincipal'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'totalInterestCollected',
    label: t(
      'accounting.productProfitabilityReports.loanProfitability.columns.totalInterestCollected'
    ),
    type: 'currency',
    sortable: true
  },
  {
    key: 'yieldPercent',
    label: t('accounting.productProfitabilityReports.loanProfitability.columns.yieldPercent'),
    type: 'percent',
    sortable: true
  }
])
</script>
