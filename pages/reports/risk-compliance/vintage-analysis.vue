<template>
  <div>
    <UButton to="/reports" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      {{ t('admin.reports.backToReports') }}
    </UButton>
    <PageHeader
      :title="t('accounting.riskComplianceReports.vintageAnalysis.title')"
      :description="t('accounting.riskComplianceReports.vintageAnalysis.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.riskComplianceReportsHeader') },
        { label: t('accounting.riskComplianceReports.vintageAnalysis.title') }
      ]"
    />

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="font-semibold">{{
            t('accounting.riskComplianceReports.vintageAnalysis.cohortsHeader')
          }}</span>
          <USelectMenu
            v-model="months"
            :options="monthsOptions"
            option-attribute="label"
            value-attribute="value"
            size="sm"
            class="w-40"
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

      <DataTable :rows="cohorts" :columns="columns" :loading="pending" :exportable="false">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-calendar-days"
            :title="t('accounting.riskComplianceReports.vintageAnalysis.emptyTitle')"
            :description="t('accounting.riskComplianceReports.vintageAnalysis.emptyDescription')"
          />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { VintageCohortResponse } from '~/features/reports/types'
import type { ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

const months = ref(12)
const monthsOptions = [
  { label: t('accounting.riskComplianceReports.vintageAnalysis.months6'), value: 6 },
  { label: t('accounting.riskComplianceReports.vintageAnalysis.months12'), value: 12 },
  { label: t('accounting.riskComplianceReports.vintageAnalysis.months24'), value: 24 },
  { label: t('accounting.riskComplianceReports.vintageAnalysis.months36'), value: 36 }
]

const {
  data: cohorts,
  pending,
  error: fetchError
} = await useAsyncData(
  'risk-vintage-analysis',
  () =>
    api<VintageCohortResponse[]>('/loans/reports/vintage-analysis', {
      query: { months: months.value }
    }),
  { watch: [months], default: () => [] }
)

const columns = computed<ColumnDef<VintageCohortResponse>[]>(() => [
  {
    key: 'cohortMonth',
    label: t('accounting.riskComplianceReports.vintageAnalysis.columns.cohortMonth')
  },
  {
    key: 'loanCount',
    label: t('accounting.riskComplianceReports.vintageAnalysis.columns.loanCount')
  },
  {
    key: 'totalPrincipal',
    label: t('accounting.riskComplianceReports.vintageAnalysis.columns.totalPrincipal'),
    type: 'currency'
  },
  {
    key: 'activeCount',
    label: t('accounting.riskComplianceReports.vintageAnalysis.columns.activeCount')
  },
  {
    key: 'activePrincipal',
    label: t('accounting.riskComplianceReports.vintageAnalysis.columns.activePrincipal'),
    type: 'currency'
  },
  {
    key: 'closedCount',
    label: t('accounting.riskComplianceReports.vintageAnalysis.columns.closedCount')
  },
  {
    key: 'closedPrincipal',
    label: t('accounting.riskComplianceReports.vintageAnalysis.columns.closedPrincipal'),
    type: 'currency'
  }
])
</script>
