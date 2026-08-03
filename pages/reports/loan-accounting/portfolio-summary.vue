<template>
  <div>
    <UButton to="/reports" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      {{ t('admin.reports.title') }}
    </UButton>
    <PageHeader
      :title="t('accounting.loanAccountingReports.portfolioSummary.title')"
      :description="t('accounting.loanAccountingReports.portfolioSummary.description')"
    />

    <UAlert
      v-if="fetchError"
      color="red"
      variant="subtle"
      class="mb-4"
      :title="apiErrorMessage(fetchError)"
    />

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <UCard>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('accounting.loanAccountingReports.portfolioSummary.activeLoans') }}
        </div>
        <div class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
          {{ portfolio?.activeLoanCount ?? 0 }}
        </div>
      </UCard>
      <UCard>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('accounting.loanAccountingReports.portfolioSummary.totalPrincipal') }}
        </div>
        <div class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
          {{ formatCurrency(portfolio?.totalPrincipal ?? 0) }}
        </div>
      </UCard>
      <UCard>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('accounting.loanAccountingReports.portfolioSummary.totalOutstanding') }}
        </div>
        <div class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
          {{ formatCurrency(portfolio?.totalOutstandingBalance ?? 0) }}
        </div>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <span class="font-semibold">{{
          t('accounting.loanAccountingReports.portfolioSummary.statusBreakdownHeader')
        }}</span>
      </template>
      <DataTable
        :rows="statusBreakdown ?? []"
        :columns="columns"
        :loading="pending"
        :exportable="false"
      />
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { LoanStatusBreakdown, PortfolioSummaryResponse } from '~/features/reports/types'
import type { ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

const [
  { data: portfolio, pending: p1, error: e1 },
  { data: statusBreakdown, pending: p2, error: e2 }
] = await Promise.all([
  useAsyncData('loan-accounting-portfolio-summary', () =>
    api<PortfolioSummaryResponse>('/loans/reports/portfolio-summary')
  ),
  useAsyncData('loan-accounting-status-breakdown', () =>
    api<LoanStatusBreakdown[]>('/loans/reports/status-breakdown')
  )
])

const pending = computed(() => p1.value || p2.value)
const fetchError = computed(() => e1.value || e2.value)

const columns = computed<ColumnDef<LoanStatusBreakdown>[]>(() => [
  {
    key: 'status',
    label: t('accounting.loanAccountingReports.portfolioSummary.columns.status'),
    type: 'status'
  },
  {
    key: 'loanCount',
    label: t('accounting.loanAccountingReports.portfolioSummary.columns.loanCount')
  },
  {
    key: 'totalPrincipal',
    label: t('accounting.loanAccountingReports.portfolioSummary.columns.totalPrincipal'),
    type: 'currency'
  }
])
</script>
