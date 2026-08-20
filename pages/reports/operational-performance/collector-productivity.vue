<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.operationalPerformanceReports.collectorProductivity.title')"
      :description="t('accounting.operationalPerformanceReports.collectorProductivity.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.operationalPerformanceReportsHeader') },
        { label: t('accounting.operationalPerformanceReports.collectorProductivity.title') }
      ]"
    />

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="font-semibold">{{
            t('accounting.operationalPerformanceReports.collectorProductivity.tableHeader')
          }}</span>
          <USelectMenu
            v-model="months"
            :options="monthsOptions"
            option-attribute="label"
            value-attribute="value"
            size="sm"
            class="w-full sm:w-32"
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

      <DataTable :rows="rows" :columns="columns" :loading="pending" :exportable="false">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-user-group"
            :title="t('accounting.operationalPerformanceReports.collectorProductivity.emptyTitle')"
            :description="
              t('accounting.operationalPerformanceReports.collectorProductivity.emptyDescription')
            "
          />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { CollectorProductivityRow } from '~/features/reports/types'
import type { ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

const months = ref(3)
const monthsOptions = [
  { label: t('accounting.operationalPerformanceReports.collectorProductivity.months1'), value: 1 },
  { label: t('accounting.operationalPerformanceReports.collectorProductivity.months3'), value: 3 },
  { label: t('accounting.operationalPerformanceReports.collectorProductivity.months6'), value: 6 },
  { label: t('accounting.operationalPerformanceReports.collectorProductivity.months12'), value: 12 }
]

const {
  data: rows,
  pending,
  error: fetchError
} = await useAsyncData(
  'operational-collector-productivity',
  () =>
    api<CollectorProductivityRow[]>('/payments/reports/collector-productivity', {
      query: { months: months.value }
    }),
  { watch: [months], default: () => [] }
)

const columns = computed<ColumnDef<CollectorProductivityRow>[]>(() => [
  {
    key: 'assignedToUserId',
    label: t('accounting.operationalPerformanceReports.collectorProductivity.columns.collector'),
    value: (row) =>
      t('accounting.operationalPerformanceReports.collectorProductivity.collectorLabel', {
        id: row.assignedToUserId
      })
  },
  {
    key: 'caseCount',
    label: t('accounting.operationalPerformanceReports.collectorProductivity.columns.caseCount')
  },
  {
    key: 'openCaseCount',
    label: t('accounting.operationalPerformanceReports.collectorProductivity.columns.openCaseCount')
  },
  {
    key: 'resolvedCaseCount',
    label: t(
      'accounting.operationalPerformanceReports.collectorProductivity.columns.resolvedCaseCount'
    )
  },
  {
    key: 'paymentCount',
    label: t('accounting.operationalPerformanceReports.collectorProductivity.columns.paymentCount')
  },
  {
    key: 'totalCollected',
    label: t(
      'accounting.operationalPerformanceReports.collectorProductivity.columns.totalCollected'
    ),
    type: 'currency'
  }
])
</script>
