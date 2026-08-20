<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.loanPortfolioReports.approachingMaturity.title')"
      :description="t('accounting.loanPortfolioReports.approachingMaturity.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.loanPortfolioReportsHeader') },
        { label: t('accounting.loanPortfolioReports.approachingMaturity.title') }
      ]"
    />

    <UCard class="mb-6">
      <UFormGroup class="max-w-xs">
        <USelectMenu
          v-model="range"
          :options="rangeOptions"
          option-attribute="label"
          value-attribute="value"
        />
      </UFormGroup>
    </UCard>

    <UCard v-if="total > 0" class="mb-6">
      <div class="flex justify-end text-sm font-semibold">
        <span
          >{{ t('accounting.loanPortfolioReports.approachingMaturity.totalOutstanding') }}:
          {{ formatCurrency(totalOutstanding) }}</span
        >
      </div>
    </UCard>

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-full sm:w-64"
          :placeholder="t('accounting.loanPortfolioReports.approachingMaturity.searchPlaceholder')"
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
            icon="i-heroicons-calendar-days"
            :title="t('accounting.loanPortfolioReports.approachingMaturity.emptyTitle')"
            :description="t('accounting.loanPortfolioReports.approachingMaturity.emptyDescription')"
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
import type { BranchResponse } from '~/features/branches/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

type MaturityRange = '30' | '60' | '90' | 'all'

const { t } = useI18n()
const api = useApi()

const {
  data: loansRaw,
  pending,
  error: fetchError
} = await useAsyncData('loan-portfolio-approaching-maturity', () =>
  api<PageResponse<LoanResponse>>('/loans', { query: { size: 1000 } })
)
const loans = computed(() => loansRaw.value?.content ?? [])

const { data: branches } = await useAsyncData('loan-portfolio-approaching-maturity-branches', () =>
  api<BranchResponse[]>('/branches')
)
const branchNameById = computed(() => new Map((branches.value ?? []).map((b) => [b.id, b.name])))

function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const todayIso = toIsoDate(new Date())

const range = ref<MaturityRange>('30')

const rangeOptions = computed(() => [
  { label: t('accounting.loanPortfolioReports.approachingMaturity.range30'), value: '30' },
  { label: t('accounting.loanPortfolioReports.approachingMaturity.range60'), value: '60' },
  { label: t('accounting.loanPortfolioReports.approachingMaturity.range90'), value: '90' },
  { label: t('accounting.loanPortfolioReports.approachingMaturity.rangeAll'), value: 'all' }
])

// End of the selected window — null for "all" (any future maturity date).
const windowEnd = computed(() => {
  if (range.value === 'all') return null
  const d = new Date()
  d.setDate(d.getDate() + Number(range.value))
  return toIsoDate(d)
})

// Only ACTIVE loans still have a maturity date ahead of them worth surfacing.
const approachingMaturity = computed(() =>
  loans.value.filter(
    (l) =>
      l.status === 'ACTIVE' &&
      !!l.maturityDate &&
      l.maturityDate >= todayIso &&
      (windowEnd.value === null || l.maturityDate <= windowEnd.value)
  )
)

const totalOutstanding = computed(() =>
  approachingMaturity.value.reduce((sum, l) => sum + (l.outstandingBalance ?? 0), 0)
)

const { search, page, pageSize, sort, total, rows } = useClientTable(approachingMaturity, {
  searchFields: ['loanNo', 'customerName'],
  pageSize: 15
})

function daysRemaining(maturityDate: string) {
  return Math.round((new Date(maturityDate).getTime() - new Date(todayIso).getTime()) / 86400000)
}

const columns = computed<ColumnDef<LoanResponse>[]>(() => [
  {
    key: 'loanNo',
    label: t('accounting.loanPortfolioReports.approachingMaturity.columns.loan'),
    sortable: true
  },
  {
    key: 'customerName',
    label: t('accounting.loanPortfolioReports.approachingMaturity.columns.customer'),
    sortable: true
  },
  {
    key: 'branchId',
    label: t('accounting.loanPortfolioReports.approachingMaturity.columns.branch'),
    value: (row) =>
      row.branchId != null ? (branchNameById.value.get(row.branchId) ?? row.branchId) : '—'
  },
  {
    key: 'outstandingBalance',
    label: t('accounting.loanPortfolioReports.approachingMaturity.columns.outstandingBalance'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'maturityDate',
    label: t('accounting.loanPortfolioReports.approachingMaturity.columns.maturityDate'),
    type: 'date',
    sortable: true
  },
  {
    key: 'daysRemaining',
    label: t('accounting.loanPortfolioReports.approachingMaturity.columns.daysRemaining'),
    value: (row) => (row.maturityDate ? daysRemaining(row.maturityDate) : '—')
  }
])
</script>
