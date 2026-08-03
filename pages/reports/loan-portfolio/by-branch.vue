<template>
  <div>
    <UButton to="/reports" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      {{ t('admin.reports.title') }}
    </UButton>
    <PageHeader
      :title="t('accounting.loanPortfolioReports.byBranch.title')"
      :description="t('accounting.loanPortfolioReports.byBranch.description')"
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
            icon="i-heroicons-building-office-2"
            :title="t('accounting.loanPortfolioReports.byBranch.emptyTitle')"
            :description="t('accounting.loanPortfolioReports.byBranch.emptyDescription')"
          />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { LoanResponse } from '~/features/loans/types'
import type { BranchResponse } from '~/features/branches/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

interface BranchLoanRow {
  branch: string
  loanCount: number
  totalPrincipal: number
  totalOutstanding: number
}

const { t } = useI18n()
const api = useApi()

const {
  data: loansRaw,
  pending,
  error: fetchError
} = await useAsyncData('loan-portfolio-by-branch', () =>
  api<PageResponse<LoanResponse>>('/loans', { query: { size: 1000 } })
)
const loans = computed(() => loansRaw.value?.content ?? [])

const { data: branches } = await useAsyncData('loan-portfolio-by-branch-branches', () =>
  api<BranchResponse[]>('/branches')
)

const rows = computed<BranchLoanRow[]>(() => {
  const branchNameById = new Map((branches.value ?? []).map((b) => [b.id, b.name]))
  const byBranch = new Map<string, BranchLoanRow>()
  for (const loan of loans.value) {
    const branch =
      loan.branchId != null ? (branchNameById.get(loan.branchId) ?? String(loan.branchId)) : '—'
    const existing = byBranch.get(branch) ?? {
      branch,
      loanCount: 0,
      totalPrincipal: 0,
      totalOutstanding: 0
    }
    existing.loanCount += 1
    existing.totalPrincipal += loan.principal
    existing.totalOutstanding += loan.outstandingBalance ?? 0
    byBranch.set(branch, existing)
  }
  return [...byBranch.values()]
})

const columns = computed<ColumnDef<BranchLoanRow>[]>(() => [
  {
    key: 'branch',
    label: t('accounting.loanPortfolioReports.byBranch.columns.branch'),
    sortable: true
  },
  {
    key: 'loanCount',
    label: t('accounting.loanPortfolioReports.byBranch.columns.loanCount'),
    sortable: true
  },
  {
    key: 'totalPrincipal',
    label: t('accounting.loanPortfolioReports.byBranch.columns.totalPrincipal'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'totalOutstanding',
    label: t('accounting.loanPortfolioReports.byBranch.columns.totalOutstanding'),
    type: 'currency',
    sortable: true
  }
])
</script>
