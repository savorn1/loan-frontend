<template>
  <div>
    <UButton to="/reports" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      {{ t('admin.reports.title') }}
    </UButton>
    <PageHeader
      :title="t('accounting.loanPortfolioReports.byStatus.title')"
      :description="t('accounting.loanPortfolioReports.byStatus.description')"
    />

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center gap-3">
          <UInput
            v-model="search"
            icon="i-heroicons-magnifying-glass"
            size="sm"
            class="w-64"
            :placeholder="t('accounting.loanPortfolioReports.byStatus.searchPlaceholder')"
          />
          <USelectMenu
            v-model="statusFilter"
            :options="statusFilterOptions"
            option-attribute="label"
            value-attribute="value"
            class="w-44"
          />
        </div>
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
            icon="i-heroicons-banknotes"
            :title="t('common.noMatches')"
            :description="t('accounting.loanPortfolioReports.byStatus.emptyDescription')"
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
import type { LoanResponse, LoanStatus } from '~/features/loans/types'
import type { BranchResponse } from '~/features/branches/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()
const route = useRoute()

const {
  data: loansRaw,
  pending,
  error: fetchError
} = await useAsyncData('loan-portfolio-by-status', () =>
  api<PageResponse<LoanResponse>>('/loans', { query: { size: 1000 } })
)
const loans = computed(() => loansRaw.value?.content ?? [])

const { data: branches } = await useAsyncData('loan-portfolio-by-status-branches', () =>
  api<BranchResponse[]>('/branches')
)
const branchNameById = computed(() => new Map((branches.value ?? []).map((b) => [b.id, b.name])))

// Pre-filled when arriving from a status-specific tile (e.g. "Active Loans" on /reports).
const statusFilter = ref<LoanStatus | ''>((route.query.status as LoanStatus) || '')

const statusFilterOptions = computed(() => [
  { label: t('accounting.loanPortfolioReports.byStatus.statusFilterAll'), value: '' },
  { label: formatEnum('PENDING'), value: 'PENDING' },
  { label: formatEnum('APPROVED'), value: 'APPROVED' },
  { label: formatEnum('REJECTED'), value: 'REJECTED' },
  { label: formatEnum('ACTIVE'), value: 'ACTIVE' },
  { label: formatEnum('CLOSED'), value: 'CLOSED' }
])

const filtered = computed(() =>
  loans.value.filter((l) => !statusFilter.value || l.status === statusFilter.value)
)

const { search, page, pageSize, sort, total, rows } = useClientTable(filtered, {
  searchFields: ['id', 'customerName'],
  pageSize: 15
})

const columns = computed<ColumnDef<LoanResponse>[]>(() => [
  { key: 'id', label: t('accounting.loanPortfolioReports.byStatus.columns.id'), sortable: true },
  {
    key: 'customerName',
    label: t('accounting.loanPortfolioReports.byStatus.columns.customer'),
    sortable: true
  },
  {
    key: 'branchId',
    label: t('accounting.loanPortfolioReports.byStatus.columns.branch'),
    value: (row) =>
      row.branchId != null ? (branchNameById.value.get(row.branchId) ?? row.branchId) : '—'
  },
  {
    key: 'principal',
    label: t('accounting.loanPortfolioReports.byStatus.columns.principal'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'outstandingBalance',
    label: t('accounting.loanPortfolioReports.byStatus.columns.outstandingBalance'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'status',
    label: t('accounting.loanPortfolioReports.byStatus.columns.status'),
    type: 'status',
    sortable: true
  },
  {
    key: 'createdAt',
    label: t('accounting.loanPortfolioReports.byStatus.columns.created'),
    type: 'datetime',
    sortable: true
  }
])
</script>
