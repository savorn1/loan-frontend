<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.operationalPerformanceReports.rejectionReasons.title')"
      :description="t('accounting.operationalPerformanceReports.rejectionReasons.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.operationalPerformanceReportsHeader') },
        { label: t('accounting.operationalPerformanceReports.rejectionReasons.title') }
      ]"
    />

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-full sm:w-64"
          :placeholder="
            t('accounting.operationalPerformanceReports.rejectionReasons.searchPlaceholder')
          "
        />
      </template>

      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable v-model:sort="sort" :rows="rows" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-x-circle"
            :title="t('accounting.operationalPerformanceReports.rejectionReasons.emptyTitle')"
            :description="
              t('accounting.operationalPerformanceReports.rejectionReasons.emptyDescription')
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
import type { ApplicationResponse } from '~/features/loans/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

interface RejectionRow {
  applicationNo: string
  customer: string
  requestedAmount: number
  rejectedBy: string
  reason: string
  decidedAt: string
}

const { t } = useI18n()
const api = useApi()

const {
  data: applicationsRaw,
  pending,
  error: fetchError
} = await useAsyncData('rejection-reasons-applications', () =>
  api<PageResponse<ApplicationResponse>>('/loans/applications', { query: { size: 1000 } })
)

const rejections = computed<RejectionRow[]>(() => {
  const applications = applicationsRaw.value?.content ?? []
  const result: RejectionRow[] = []
  for (const app of applications) {
    if (app.status !== 'REJECTED') continue
    const decision = [...app.approvals]
      .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt))
      .find((a) => a.decision === 'REJECTED')
    result.push({
      applicationNo: app.applicationNo,
      customer: app.customerName,
      requestedAmount: app.requestedAmount,
      rejectedBy: decision?.approverName ?? '—',
      reason: decision?.comments ?? '—',
      decidedAt: decision?.decidedAt ?? app.decidedAt ?? app.updatedAt
    })
  }
  return result.sort((a, b) => b.decidedAt.localeCompare(a.decidedAt))
})

const { search, page, pageSize, sort, total, rows } = useClientTable(rejections, {
  searchFields: ['applicationNo', 'customer', 'reason'],
  pageSize: 15
})

const columns = computed<ColumnDef<RejectionRow>[]>(() => [
  {
    key: 'applicationNo',
    label: t('accounting.operationalPerformanceReports.rejectionReasons.columns.application'),
    sortable: true
  },
  {
    key: 'customer',
    label: t('accounting.operationalPerformanceReports.rejectionReasons.columns.customer'),
    sortable: true
  },
  {
    key: 'requestedAmount',
    label: t('accounting.operationalPerformanceReports.rejectionReasons.columns.requestedAmount'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'rejectedBy',
    label: t('accounting.operationalPerformanceReports.rejectionReasons.columns.rejectedBy')
  },
  {
    key: 'reason',
    label: t('accounting.operationalPerformanceReports.rejectionReasons.columns.reason')
  },
  {
    key: 'decidedAt',
    label: t('accounting.operationalPerformanceReports.rejectionReasons.columns.decidedAt'),
    type: 'date',
    sortable: true
  }
])
</script>
