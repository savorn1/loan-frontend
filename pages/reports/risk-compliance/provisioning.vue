<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.riskComplianceReports.provisioning.title')"
      :description="t('accounting.riskComplianceReports.provisioning.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.riskComplianceReportsHeader') },
        { label: t('accounting.riskComplianceReports.provisioning.title') }
      ]"
    />

    <UAlert
      v-if="fetchError"
      color="red"
      variant="subtle"
      class="mb-4"
      :title="apiErrorMessage(fetchError)"
    />

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      <UCard>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('accounting.riskComplianceReports.provisioning.totalOutstanding') }}
        </div>
        <div class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
          {{ formatCurrency(summary?.totalOutstandingBalance ?? 0) }}
        </div>
      </UCard>
      <UCard>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('accounting.riskComplianceReports.provisioning.totalProvision') }}
        </div>
        <div class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
          {{ formatCurrency(summary?.totalProvisionAmount ?? 0) }}
        </div>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <span class="font-semibold">{{
          t('accounting.riskComplianceReports.provisioning.stagesHeader')
        }}</span>
      </template>
      <DataTable :rows="stages" :columns="columns" :loading="pending" :exportable="false" />
      <p class="text-xs text-gray-500 mt-3">
        {{ t('accounting.riskComplianceReports.provisioning.note') }}
      </p>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ProvisioningStageRow, ProvisioningSummaryResponse } from '~/features/reports/types'
import type { ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

const {
  data: summary,
  pending,
  error: fetchError
} = await useAsyncData('risk-provisioning', () =>
  api<ProvisioningSummaryResponse>('/payments/reports/provisioning-summary')
)

const stages = computed(() => summary.value?.stages ?? [])

const columns = computed<ColumnDef<ProvisioningStageRow>[]>(() => [
  { key: 'label', label: t('accounting.riskComplianceReports.provisioning.columns.stage') },
  { key: 'loanCount', label: t('accounting.riskComplianceReports.provisioning.columns.loanCount') },
  {
    key: 'outstandingBalance',
    label: t('accounting.riskComplianceReports.provisioning.columns.outstandingBalance'),
    type: 'currency'
  },
  {
    key: 'provisionRatePercent',
    label: t('accounting.riskComplianceReports.provisioning.columns.provisionRate'),
    type: 'percent'
  },
  {
    key: 'provisionAmount',
    label: t('accounting.riskComplianceReports.provisioning.columns.provisionAmount'),
    type: 'currency'
  }
])
</script>
