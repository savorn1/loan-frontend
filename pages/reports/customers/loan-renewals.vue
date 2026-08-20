<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.customerReports.loanRenewals.title')"
      :description="t('accounting.customerReports.loanRenewals.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.customerReportsHeader') },
        { label: t('accounting.customerReports.loanRenewals.title') }
      ]"
    />

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-full sm:w-64"
          :placeholder="t('accounting.customerReports.loanRenewals.searchPlaceholder')"
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
            icon="i-heroicons-arrow-path"
            :title="t('accounting.customerReports.loanRenewals.emptyTitle')"
            :description="t('accounting.customerReports.loanRenewals.emptyDescription')"
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

interface RenewalRow {
  customer: string
  previousLoanNo: string
  previousClosedAt: string
  newLoanNo: string
  newLoanDate: string
  gapDays: number
}

const { t } = useI18n()
const api = useApi()

const {
  data: loansRaw,
  pending,
  error: fetchError
} = await useAsyncData('customers-loan-renewals', () =>
  api<PageResponse<LoanResponse>>('/loans', { query: { size: 1000 } })
)
const loans = computed(() => loansRaw.value?.content ?? [])

function daysBetween(from: string, to: string) {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000)
}

// A "renewal" is a new loan taken out after a previous loan for the same
// customer was already closed — a returning borrower starting a fresh cycle,
// as opposed to a restructure/refinance of the same loan.
const renewals = computed<RenewalRow[]>(() => {
  const byCustomer = new Map<number, LoanResponse[]>()
  for (const loan of loans.value) {
    const list = byCustomer.get(loan.customerId) ?? []
    list.push(loan)
    byCustomer.set(loan.customerId, list)
  }

  const rows: RenewalRow[] = []
  for (const customerLoans of byCustomer.values()) {
    const sorted = [...customerLoans].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    let mostRecentClosed: LoanResponse | null = null
    for (const loan of sorted) {
      if (mostRecentClosed?.closedAt && loan.createdAt > mostRecentClosed.closedAt) {
        rows.push({
          customer: loan.customerName,
          previousLoanNo: mostRecentClosed.loanNo,
          previousClosedAt: mostRecentClosed.closedAt,
          newLoanNo: loan.loanNo,
          newLoanDate: loan.createdAt,
          gapDays: daysBetween(mostRecentClosed.closedAt, loan.createdAt)
        })
      }
      if (loan.status === 'CLOSED' && loan.closedAt) mostRecentClosed = loan
    }
  }
  return rows.sort((a, b) => b.newLoanDate.localeCompare(a.newLoanDate))
})

const { search, page, pageSize, sort, total, rows } = useClientTable(renewals, {
  searchFields: ['customer', 'newLoanNo', 'previousLoanNo'],
  pageSize: 15
})

const columns = computed<ColumnDef<RenewalRow>[]>(() => [
  {
    key: 'customer',
    label: t('accounting.customerReports.loanRenewals.columns.customer'),
    sortable: true
  },
  {
    key: 'previousLoanNo',
    label: t('accounting.customerReports.loanRenewals.columns.previousLoan')
  },
  {
    key: 'previousClosedAt',
    label: t('accounting.customerReports.loanRenewals.columns.previousClosedAt'),
    type: 'date',
    sortable: true
  },
  {
    key: 'newLoanNo',
    label: t('accounting.customerReports.loanRenewals.columns.newLoan')
  },
  {
    key: 'newLoanDate',
    label: t('accounting.customerReports.loanRenewals.columns.newLoanDate'),
    type: 'date',
    sortable: true
  },
  {
    key: 'gapDays',
    label: t('accounting.customerReports.loanRenewals.columns.gapDays'),
    sortable: true
  }
])
</script>
