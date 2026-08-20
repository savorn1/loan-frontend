<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.riskComplianceReports.pricing.title')"
      :description="t('accounting.riskComplianceReports.pricing.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.riskComplianceReportsHeader') },
        { label: t('accounting.riskComplianceReports.pricing.title') }
      ]"
    />

    <UAlert
      v-if="fetchError"
      color="red"
      variant="subtle"
      class="mb-4"
      :title="apiErrorMessage(fetchError)"
    />

    <UCard class="mb-6">
      <template #header>
        <span class="font-semibold">{{
          t('accounting.riskComplianceReports.pricing.byRateHeader')
        }}</span>
      </template>
      <DataTable :rows="byRateBand" :columns="columns" :loading="pending" :exportable="false" />
    </UCard>

    <UCard>
      <template #header>
        <span class="font-semibold">{{
          t('accounting.riskComplianceReports.pricing.byTermHeader')
        }}</span>
      </template>
      <DataTable :rows="byTermBand" :columns="columns" :loading="pending" :exportable="false" />
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { PricingBandRow, PricingSummaryResponse } from '~/features/reports/types'
import type { ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

const {
  data: summary,
  pending,
  error: fetchError
} = await useAsyncData('risk-pricing-summary', () =>
  api<PricingSummaryResponse>('/loans/reports/pricing-summary')
)

const byRateBand = computed(() => summary.value?.byRateBand ?? [])
const byTermBand = computed(() => summary.value?.byTermBand ?? [])

const columns = computed<ColumnDef<PricingBandRow>[]>(() => [
  { key: 'band', label: t('accounting.riskComplianceReports.pricing.columns.band') },
  { key: 'loanCount', label: t('accounting.riskComplianceReports.pricing.columns.loanCount') },
  {
    key: 'totalPrincipal',
    label: t('accounting.riskComplianceReports.pricing.columns.totalPrincipal'),
    type: 'currency'
  },
  {
    key: 'avgInterestRate',
    label: t('accounting.riskComplianceReports.pricing.columns.avgInterestRate'),
    type: 'percent'
  }
])
</script>
