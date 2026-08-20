<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.operationalPerformanceReports.statusAuditTrail.title')"
      :description="t('accounting.operationalPerformanceReports.statusAuditTrail.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.operationalPerformanceReportsHeader') },
        { label: t('accounting.operationalPerformanceReports.statusAuditTrail.title') }
      ]"
    />

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center gap-3">
          <UFormGroup
            class="w-full sm:w-auto"
            :label="t('accounting.operationalPerformanceReports.statusAuditTrail.dateFrom')"
          >
            <UInput v-model="dateFrom" type="date" size="sm" class="w-full sm:w-40" />
          </UFormGroup>
          <UFormGroup
            class="w-full sm:w-auto"
            :label="t('accounting.operationalPerformanceReports.statusAuditTrail.dateTo')"
          >
            <UInput v-model="dateTo" type="date" size="sm" class="w-full sm:w-40" />
          </UFormGroup>
          <UFormGroup
            class="w-full sm:w-auto"
            :label="t('accounting.operationalPerformanceReports.statusAuditTrail.status')"
          >
            <USelectMenu
              v-model="status"
              :options="statusOptions"
              option-attribute="label"
              value-attribute="value"
              size="sm"
              class="w-full sm:w-40"
            />
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
        export-filename="status-audit-trail.csv"
      >
        <template #fromStatus-data="{ row }">
          <StatusBadge v-if="row.fromStatus" :status="row.fromStatus" />
          <span v-else class="text-gray-400">—</span>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-clock"
            :title="t('accounting.operationalPerformanceReports.statusAuditTrail.emptyTitle')"
            :description="
              t('accounting.operationalPerformanceReports.statusAuditTrail.emptyDescription')
            "
          />
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { LoanStatus } from '~/features/loans/types'
import type { StatusAuditEntryResponse } from '~/features/reports/types'
import type { ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

const dateFrom = ref('')
const dateTo = ref('')
const status = ref<LoanStatus | ''>('')
const statusOptions = [
  { label: t('accounting.operationalPerformanceReports.statusAuditTrail.statusAll'), value: '' },
  { label: t('common.status.PENDING'), value: 'PENDING' },
  { label: t('common.status.APPROVED'), value: 'APPROVED' },
  { label: t('common.status.REJECTED'), value: 'REJECTED' },
  { label: t('common.status.ACTIVE'), value: 'ACTIVE' },
  { label: t('common.status.CLOSED'), value: 'CLOSED' }
]

const {
  data: entries,
  pending,
  error: fetchError
} = await useAsyncData(
  'operational-status-audit-trail',
  () =>
    api<StatusAuditEntryResponse[]>('/loans/reports/status-audit-trail', {
      query: {
        dateFrom: dateFrom.value || undefined,
        dateTo: dateTo.value || undefined,
        status: status.value || undefined,
        limit: 200
      }
    }),
  { watch: [dateFrom, dateTo, status] }
)

const { page, pageSize, total, rows } = useClientTable(entries, { pageSize: 20 })

const columns = computed<ColumnDef<StatusAuditEntryResponse>[]>(() => [
  {
    key: 'loanNo',
    label: t('accounting.operationalPerformanceReports.statusAuditTrail.columns.loanNo')
  },
  {
    key: 'fromStatus',
    label: t('accounting.operationalPerformanceReports.statusAuditTrail.columns.fromStatus'),
    type: 'status'
  },
  {
    key: 'toStatus',
    label: t('accounting.operationalPerformanceReports.statusAuditTrail.columns.toStatus'),
    type: 'status'
  },
  {
    key: 'note',
    label: t('accounting.operationalPerformanceReports.statusAuditTrail.columns.note')
  },
  {
    key: 'changedBy',
    label: t('accounting.operationalPerformanceReports.statusAuditTrail.columns.changedBy')
  },
  {
    key: 'changedAt',
    label: t('accounting.operationalPerformanceReports.statusAuditTrail.columns.changedAt'),
    type: 'datetime'
  }
])
</script>
