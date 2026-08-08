<template>
  <div>
    <PageHeader
      :title="t('accounting.loanAccountingReports.outstandingBalance.title')"
      :description="t('accounting.loanAccountingReports.outstandingBalance.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.loanAccountingReportsHeader') },
        { label: t('accounting.loanAccountingReports.outstandingBalance.title') }
      ]"
    />

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-64"
          :placeholder="t('accounting.loanAccountingReports.outstandingBalance.searchPlaceholder')"
        />
      </template>

      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable
        v-model:sort="sort"
        :rows="rows"
        :columns="columns"
        :loading="pending"
        numbered
        :row-number-start="(page - 1) * pageSize"
      >
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-banknotes"
            :title="t('common.noMatches')"
            :description="t('accounting.loanAccountingReports.outstandingBalance.emptyDescription')"
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

const { t } = useI18n()
const api = useApi()

const {
  data: loansRaw,
  pending,
  error: fetchError
} = await useAsyncData('loan-accounting-outstanding-balance', () =>
  api<PageResponse<LoanResponse>>('/loans', { query: { size: 1000 } })
)
const loans = computed(() => loansRaw.value?.content ?? [])

const { data: branches } = await useAsyncData('loan-accounting-outstanding-balance-branches', () =>
  api<BranchResponse[]>('/branches')
)
const branchNameById = computed(() => new Map((branches.value ?? []).map((b) => [b.id, b.name])))

const { search, page, pageSize, sort, total, rows } = useClientTable(loans, {
  searchFields: ['id', 'customerName'],
  pageSize: 15
})

const columns = computed<ColumnDef<LoanResponse>[]>(() => [
  {
    key: 'customerName',
    label: t('accounting.loanAccountingReports.outstandingBalance.columns.customer'),
    sortable: true
  },
  {
    key: 'branchId',
    label: t('accounting.loanAccountingReports.outstandingBalance.columns.branch'),
    value: (row) =>
      row.branchId != null ? (branchNameById.value.get(row.branchId) ?? row.branchId) : '—'
  },
  {
    key: 'principal',
    label: t('accounting.loanAccountingReports.outstandingBalance.columns.principal'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'outstandingBalance',
    label: t('accounting.loanAccountingReports.outstandingBalance.columns.outstandingBalance'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'status',
    label: t('accounting.loanAccountingReports.outstandingBalance.columns.status'),
    type: 'status',
    sortable: true
  }
])
</script>
