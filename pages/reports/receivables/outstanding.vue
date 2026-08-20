<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.receivablesReports.outstanding.title')"
      :description="t('accounting.receivablesReports.outstanding.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.receivablesReportsHeader') },
        { label: t('accounting.receivablesReports.outstanding.title') }
      ]"
    >
      <template #actions>
        <UButton
          to="/reports/loan-accounting/outstanding-balance"
          variant="soft"
          icon="i-heroicons-table-cells"
        >
          {{ t('accounting.receivablesReports.outstanding.viewDetail') }}
        </UButton>
      </template>
    </PageHeader>

    <UAlert
      v-if="fetchError"
      color="red"
      variant="subtle"
      class="mb-4"
      :title="apiErrorMessage(fetchError)"
    />

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <UCard>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('accounting.receivablesReports.outstanding.totalOutstanding') }}
        </div>
        <div class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
          {{ formatCurrency(parSummary?.totalOutstandingBalance ?? 0) }}
        </div>
      </UCard>
      <UCard>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('accounting.receivablesReports.outstanding.current') }}
        </div>
        <div class="text-2xl font-semibold text-teal-600 dark:text-teal-400 mt-1">
          {{ formatCurrency(currentBalance) }}
        </div>
      </UCard>
      <UCard>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('accounting.receivablesReports.outstanding.overdue') }}
        </div>
        <div class="text-2xl font-semibold text-red-500 mt-1">
          {{ formatCurrency(parSummary?.totalOverdueAmount ?? 0) }}
        </div>
      </UCard>
      <UCard>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('accounting.receivablesReports.outstanding.portfolioAtRisk') }}
        </div>
        <div class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
          {{ (parSummary?.portfolioAtRiskPercent ?? 0).toFixed(1) }}%
        </div>
      </UCard>
    </div>

    <UCard class="mt-6">
      <dl class="grid grid-cols-2 gap-y-3 text-sm">
        <dt class="text-gray-500">
          {{ t('accounting.receivablesReports.outstanding.activeLoans') }}
        </dt>
        <dd class="font-semibold text-right">{{ parSummary?.activeLoanCount ?? 0 }}</dd>
      </dl>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ParSummaryResponse } from '~/features/reports/types'

const { t } = useI18n()
const api = useApi()

const { data: parSummary, error: fetchError } = await useAsyncData(
  'outstanding-receivables-par-summary',
  () => api<ParSummaryResponse>('/payments/reports/par-summary')
)

const currentBalance = computed(() => {
  if (!parSummary.value) return 0
  return parSummary.value.totalOutstandingBalance - parSummary.value.totalOverdueAmount
})
</script>
