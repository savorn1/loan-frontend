<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.customerReports.repeatBorrowers.title')"
      :description="t('accounting.customerReports.repeatBorrowers.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.customerReportsHeader') },
        { label: t('accounting.customerReports.repeatBorrowers.title') }
      ]"
    />

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-full sm:w-64"
          :placeholder="t('accounting.customerReports.repeatBorrowers.searchPlaceholder')"
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
            :title="t('accounting.customerReports.repeatBorrowers.emptyTitle')"
            :description="t('accounting.customerReports.repeatBorrowers.emptyDescription')"
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

interface RepeatBorrowerRow {
  customerId: number
  customer: string
  loanCount: number
  totalPrincipal: number
  totalOutstanding: number
  firstLoanDate: string
  latestLoanDate: string
}

const { t } = useI18n()
const api = useApi()

const {
  data: loansRaw,
  pending,
  error: fetchError
} = await useAsyncData('customers-repeat-borrowers', () =>
  api<PageResponse<LoanResponse>>('/loans', { query: { size: 1000 } })
)
const loans = computed(() => loansRaw.value?.content ?? [])

// Customers with 2+ loans — the same aggregation as "Loans by Customer", filtered
// down to actual repeat business rather than every borrower.
const repeatBorrowers = computed<RepeatBorrowerRow[]>(() => {
  const byCustomer = new Map<number, RepeatBorrowerRow>()
  for (const loan of loans.value) {
    const existing = byCustomer.get(loan.customerId) ?? {
      customerId: loan.customerId,
      customer: loan.customerName,
      loanCount: 0,
      totalPrincipal: 0,
      totalOutstanding: 0,
      firstLoanDate: loan.createdAt,
      latestLoanDate: loan.createdAt
    }
    existing.loanCount += 1
    existing.totalPrincipal += loan.principal
    existing.totalOutstanding += loan.outstandingBalance ?? 0
    if (loan.createdAt < existing.firstLoanDate) existing.firstLoanDate = loan.createdAt
    if (loan.createdAt > existing.latestLoanDate) existing.latestLoanDate = loan.createdAt
    byCustomer.set(loan.customerId, existing)
  }
  return [...byCustomer.values()]
    .filter((row) => row.loanCount >= 2)
    .sort((a, b) => b.loanCount - a.loanCount)
})

const { search, page, pageSize, sort, total, rows } = useClientTable(repeatBorrowers, {
  searchFields: ['customer'],
  pageSize: 15
})

const columns = computed<ColumnDef<RepeatBorrowerRow>[]>(() => [
  {
    key: 'customer',
    label: t('accounting.customerReports.repeatBorrowers.columns.customer'),
    sortable: true
  },
  {
    key: 'loanCount',
    label: t('accounting.customerReports.repeatBorrowers.columns.loanCount'),
    sortable: true
  },
  {
    key: 'totalPrincipal',
    label: t('accounting.customerReports.repeatBorrowers.columns.totalPrincipal'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'totalOutstanding',
    label: t('accounting.customerReports.repeatBorrowers.columns.totalOutstanding'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'firstLoanDate',
    label: t('accounting.customerReports.repeatBorrowers.columns.firstLoanDate'),
    type: 'date',
    sortable: true
  },
  {
    key: 'latestLoanDate',
    label: t('accounting.customerReports.repeatBorrowers.columns.latestLoanDate'),
    type: 'date',
    sortable: true
  }
])
</script>
