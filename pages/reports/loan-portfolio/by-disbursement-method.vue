<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.loanPortfolioReports.byDisbursementMethod.title')"
      :description="t('accounting.loanPortfolioReports.byDisbursementMethod.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.loanPortfolioReportsHeader') },
        { label: t('accounting.loanPortfolioReports.byDisbursementMethod.title') }
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

      <DataTable :rows="rows" :columns="columns" :loading="pending" :exportable="false">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-banknotes"
            :title="t('accounting.loanPortfolioReports.byDisbursementMethod.emptyTitle')"
            :description="
              t('accounting.loanPortfolioReports.byDisbursementMethod.emptyDescription')
            "
          />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { LoanResponse, LoanDisbursementResponse } from '~/features/loans/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

interface MethodRow {
  method: string
  disbursementCount: number
  totalAmount: number
}

const { t } = useI18n()
const api = useApi()

const {
  data: loansRaw,
  pending: p1,
  error: e1
} = await useAsyncData('loan-portfolio-disbursement-method-loans', () =>
  api<PageResponse<LoanResponse>>('/loans', { query: { size: 1000 } })
)
// Only loans that have actually been disbursed have any disbursement records
// to fetch — bounds the per-loan fan-out below.
const disbursedLoans = computed(() => (loansRaw.value?.content ?? []).filter((l) => l.disbursedAt))

// No portfolio-wide disbursements endpoint exists — only per-loan
// (/loans/{id}/disbursements) — so fetch one call per disbursed loan.
const {
  data: disbursementsByLoan,
  pending: p2,
  error: e2
} = await useAsyncData(
  'loan-portfolio-disbursement-method-items',
  () =>
    Promise.all(
      disbursedLoans.value.map((l) =>
        api<LoanDisbursementResponse[]>(`/loans/${l.id}/disbursements`)
      )
    ),
  { watch: [disbursedLoans] }
)

const pending = computed(() => p1.value || p2.value)
const fetchError = computed(() => e1.value || e2.value)

// Only APPROVED disbursements represent cash that actually went out —
// PENDING_APPROVAL/REJECTED/VOIDED records shouldn't count toward the total.
const rows = computed<MethodRow[]>(() => {
  const byMethod = new Map<string, MethodRow>()
  for (const disbursements of disbursementsByLoan.value ?? []) {
    for (const d of disbursements) {
      if (d.status !== 'APPROVED') continue
      const existing = byMethod.get(d.method) ?? {
        method: d.method,
        disbursementCount: 0,
        totalAmount: 0
      }
      existing.disbursementCount += 1
      existing.totalAmount += d.amount
      byMethod.set(d.method, existing)
    }
  }
  return [...byMethod.values()].sort((a, b) => b.totalAmount - a.totalAmount)
})

const columns = computed<ColumnDef<MethodRow>[]>(() => [
  {
    key: 'method',
    label: t('accounting.loanPortfolioReports.byDisbursementMethod.columns.method'),
    type: 'enum'
  },
  {
    key: 'disbursementCount',
    label: t('accounting.loanPortfolioReports.byDisbursementMethod.columns.disbursementCount')
  },
  {
    key: 'totalAmount',
    label: t('accounting.loanPortfolioReports.byDisbursementMethod.columns.totalAmount'),
    type: 'currency'
  }
])
</script>
