<template>
  <div>
    <UButton to="/reports" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      {{ t('admin.reports.backToReports') }}
    </UButton>
    <PageHeader
      :title="t('accounting.operationalPerformanceReports.approvalFunnel.title')"
      :description="t('accounting.operationalPerformanceReports.approvalFunnel.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.operationalPerformanceReportsHeader') },
        { label: t('accounting.operationalPerformanceReports.approvalFunnel.title') }
      ]"
    />

    <UAlert
      v-if="fetchError"
      color="red"
      variant="subtle"
      class="mb-4"
      :title="apiErrorMessage(fetchError)"
    />

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <UCard>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('accounting.operationalPerformanceReports.approvalFunnel.totalSubmitted') }}
        </div>
        <div class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
          {{ summary?.totalSubmitted ?? 0 }}
        </div>
      </UCard>
      <UCard>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('accounting.operationalPerformanceReports.approvalFunnel.totalApproved') }}
        </div>
        <div class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
          {{ summary?.totalApproved ?? 0 }}
        </div>
      </UCard>
      <UCard>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('accounting.operationalPerformanceReports.approvalFunnel.totalRejected') }}
        </div>
        <div class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
          {{ summary?.totalRejected ?? 0 }}
        </div>
      </UCard>
      <UCard>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('accounting.operationalPerformanceReports.approvalFunnel.approvalRate') }}
        </div>
        <div class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
          {{ (summary?.approvalRatePercent ?? 0).toFixed(1) }}%
        </div>
      </UCard>
      <UCard>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('accounting.operationalPerformanceReports.approvalFunnel.avgDecisionDays') }}
        </div>
        <div class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
          {{ summary?.avgDecisionDays ?? '—' }}
        </div>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="font-semibold">{{
            t('accounting.operationalPerformanceReports.approvalFunnel.breakdownHeader')
          }}</span>
          <USelectMenu
            v-model="months"
            :options="monthsOptions"
            option-attribute="label"
            value-attribute="value"
            size="sm"
            class="w-32"
          />
        </div>
      </template>
      <DataTable :rows="breakdown" :columns="columns" :loading="pending" :exportable="false" />
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ApplicationStatusCount, ApprovalFunnelResponse } from '~/features/reports/types'
import type { ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

const months = ref(6)
const monthsOptions = [
  { label: t('accounting.operationalPerformanceReports.approvalFunnel.months3'), value: 3 },
  { label: t('accounting.operationalPerformanceReports.approvalFunnel.months6'), value: 6 },
  { label: t('accounting.operationalPerformanceReports.approvalFunnel.months12'), value: 12 }
]

const {
  data: summary,
  pending,
  error: fetchError
} = await useAsyncData(
  'operational-approval-funnel',
  () =>
    api<ApprovalFunnelResponse>('/loans/reports/approval-funnel', {
      query: { months: months.value }
    }),
  { watch: [months] }
)

const breakdown = computed(() => summary.value?.statusBreakdown ?? [])

const columns = computed<ColumnDef<ApplicationStatusCount>[]>(() => [
  {
    key: 'status',
    label: t('accounting.operationalPerformanceReports.approvalFunnel.columns.status'),
    type: 'status'
  },
  {
    key: 'count',
    label: t('accounting.operationalPerformanceReports.approvalFunnel.columns.count')
  }
])
</script>
