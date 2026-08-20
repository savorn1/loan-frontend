<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.loanPortfolioReports.byPurpose.title')"
      :description="t('accounting.loanPortfolioReports.byPurpose.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.loanPortfolioReportsHeader') },
        { label: t('accounting.loanPortfolioReports.byPurpose.title') }
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
            icon="i-heroicons-tag"
            :title="t('accounting.loanPortfolioReports.byPurpose.emptyTitle')"
            :description="t('accounting.loanPortfolioReports.byPurpose.emptyDescription')"
          />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { LoanResponse } from '~/features/loans/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

interface PurposeRow {
  purpose: string
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
} = await useAsyncData('loan-portfolio-by-purpose', () =>
  api<PageResponse<LoanResponse>>('/loans', { query: { size: 1000 } })
)
const loans = computed(() => loansRaw.value?.content ?? [])

const rows = computed<PurposeRow[]>(() => {
  const byPurpose = new Map<string, PurposeRow>()
  for (const loan of loans.value) {
    const purpose = loan.purpose?.trim() || '—'
    const existing = byPurpose.get(purpose) ?? {
      purpose,
      loanCount: 0,
      totalPrincipal: 0,
      totalOutstanding: 0
    }
    existing.loanCount += 1
    existing.totalPrincipal += loan.principal
    existing.totalOutstanding += loan.outstandingBalance ?? 0
    byPurpose.set(purpose, existing)
  }
  return [...byPurpose.values()].sort((a, b) => b.loanCount - a.loanCount)
})

const columns = computed<ColumnDef<PurposeRow>[]>(() => [
  {
    key: 'purpose',
    label: t('accounting.loanPortfolioReports.byPurpose.columns.purpose'),
    sortable: true
  },
  {
    key: 'loanCount',
    label: t('accounting.loanPortfolioReports.byPurpose.columns.loanCount'),
    sortable: true
  },
  {
    key: 'totalPrincipal',
    label: t('accounting.loanPortfolioReports.byPurpose.columns.totalPrincipal'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'totalOutstanding',
    label: t('accounting.loanPortfolioReports.byPurpose.columns.totalOutstanding'),
    type: 'currency',
    sortable: true
  }
])
</script>
