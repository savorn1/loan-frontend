<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.collectionReports.branchPerformance.title')"
      :description="t('accounting.collectionReports.branchPerformance.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.collectionReportsHeader') },
        { label: t('accounting.collectionReports.branchPerformance.title') }
      ]"
    />

    <UCard class="mb-6">
      <UFormGroup
        :label="t('common.dateRangeFilter.from') + ' – ' + t('common.dateRangeFilter.to')"
        class="max-w-xs"
      >
        <DateRangeFilter v-model:from="dateFrom" v-model:to="dateTo" />
      </UFormGroup>
    </UCard>

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
            icon="i-heroicons-building-office-2"
            :title="
              hasFullRange
                ? t('accounting.collectionReports.branchPerformance.emptyTitleNoActivity')
                : t('accounting.collectionReports.branchPerformance.emptyTitlePick')
            "
            :description="
              hasFullRange
                ? t('accounting.collectionReports.branchPerformance.emptyDescriptionNoActivity')
                : t('accounting.collectionReports.branchPerformance.emptyDescriptionPick')
            "
          />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { PaymentResponse } from '~/features/payments/types'
import type { LoanResponse } from '~/features/loans/types'
import type { BranchResponse } from '~/features/branches/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

interface BranchPerformanceRow {
  branch: string
  totalDue: number
  totalCollected: number
  collectionRate: number
  paymentCount: number
}

const { t } = useI18n()
const api = useApi()

const {
  data: paymentsRaw,
  pending,
  error: fetchError
} = await useAsyncData('collection-branch-performance-payments', () =>
  api<PageResponse<PaymentResponse>>('/payments', { query: { size: 1000 } })
)
const payments = computed(() => paymentsRaw.value?.content ?? [])

const { data: loansRaw } = await useAsyncData('collection-branch-performance-loans', () =>
  api<PageResponse<LoanResponse>>('/loans', { query: { size: 1000 } })
)
const branchIdByLoanId = computed(
  () => new Map((loansRaw.value?.content ?? []).map((l) => [l.id, l.branchId]))
)

const { data: branches } = await useAsyncData('collection-branch-performance-branches', () =>
  api<BranchResponse[]>('/branches')
)
const branchNameById = computed(() => new Map((branches.value ?? []).map((b) => [b.id, b.name])))

const dateFrom = ref('')
const dateTo = ref('')
const hasFullRange = computed(() => !!dateFrom.value && !!dateTo.value)

// Every installment that fell due in the selected window, attributed to the
// branch of the loan it belongs to — mirrors the collection-performance rate,
// broken down per branch instead of overall.
const rows = computed<BranchPerformanceRow[]>(() => {
  if (!hasFullRange.value) return []
  const byBranch = new Map<string, BranchPerformanceRow>()
  for (const p of payments.value) {
    if (p.dueDate < dateFrom.value || p.dueDate > dateTo.value) continue
    const branchId = branchIdByLoanId.value.get(p.loanId) ?? null
    const branch = branchId != null ? (branchNameById.value.get(branchId) ?? String(branchId)) : '—'
    const existing = byBranch.get(branch) ?? {
      branch,
      totalDue: 0,
      totalCollected: 0,
      collectionRate: 0,
      paymentCount: 0
    }
    existing.totalDue += p.amount
    if (p.status === 'PAID') existing.totalCollected += p.amount
    existing.paymentCount += 1
    byBranch.set(branch, existing)
  }
  return [...byBranch.values()].map((row) => ({
    ...row,
    collectionRate:
      row.totalDue > 0 ? Math.round((row.totalCollected / row.totalDue) * 1000) / 10 : 0
  }))
})

const columns = computed<ColumnDef<BranchPerformanceRow>[]>(() => [
  {
    key: 'branch',
    label: t('accounting.collectionReports.branchPerformance.columns.branch'),
    sortable: true
  },
  {
    key: 'totalDue',
    label: t('accounting.collectionReports.branchPerformance.columns.totalDue'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'totalCollected',
    label: t('accounting.collectionReports.branchPerformance.columns.totalCollected'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'collectionRate',
    label: t('accounting.collectionReports.branchPerformance.columns.collectionRate'),
    type: 'percent',
    sortable: true
  },
  {
    key: 'paymentCount',
    label: t('accounting.collectionReports.branchPerformance.columns.paymentCount'),
    sortable: true
  }
])
</script>
