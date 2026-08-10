<template>
  <div>
    <UButton to="/reports" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      {{ t('admin.reports.backToReports') }}
    </UButton>
    <PageHeader
      :title="t('accounting.operationalPerformanceReports.dataQuality.title')"
      :description="t('accounting.operationalPerformanceReports.dataQuality.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.operationalPerformanceReportsHeader') },
        { label: t('accounting.operationalPerformanceReports.dataQuality.title') }
      ]"
    />

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="font-semibold">{{
            t('accounting.operationalPerformanceReports.dataQuality.tableHeader', {
              count: rows.length
            })
          }}</span>
          <UFormGroup :label="t('accounting.operationalPerformanceReports.dataQuality.staleDays')">
            <UInput v-model.number="staleDays" type="number" size="sm" class="w-28" />
          </UFormGroup>
        </div>
      </template>

      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable
        :rows="rows"
        :columns="columns"
        :loading="pending"
        export-filename="data-quality-exceptions.csv"
      >
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-check-circle"
            :title="t('accounting.operationalPerformanceReports.dataQuality.emptyTitle')"
            :description="
              t('accounting.operationalPerformanceReports.dataQuality.emptyDescription')
            "
          />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { DataQualityExceptionRow } from '~/features/reports/types'
import type { ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

const staleDays = ref(30)

const {
  data: exceptions,
  pending,
  error: fetchError
} = await useAsyncData(
  'operational-data-quality',
  () =>
    api<DataQualityExceptionRow[]>('/loans/reports/data-quality-exceptions', {
      query: { staleDays: staleDays.value }
    }),
  { watch: [staleDays] }
)

const rows = computed(() => exceptions.value ?? [])

const ENTITY_TYPE_META: Record<string, { color: string }> = {
  LOAN: { color: 'blue' },
  APPLICATION: { color: 'purple' }
}

const columns = computed<ColumnDef<DataQualityExceptionRow>[]>(() => [
  {
    key: 'entityType',
    label: t('accounting.operationalPerformanceReports.dataQuality.columns.entityType'),
    type: 'badge',
    color: (row) => ENTITY_TYPE_META[row.entityType]?.color ?? 'gray'
  },
  {
    key: 'identifier',
    label: t('accounting.operationalPerformanceReports.dataQuality.columns.identifier')
  },
  {
    key: 'issueType',
    label: t('accounting.operationalPerformanceReports.dataQuality.columns.issueType'),
    type: 'badge',
    color: 'orange'
  },
  {
    key: 'description',
    label: t('accounting.operationalPerformanceReports.dataQuality.columns.description')
  },
  {
    key: 'recordCreatedAt',
    label: t('accounting.operationalPerformanceReports.dataQuality.columns.recordCreatedAt'),
    type: 'datetime'
  }
])
</script>
