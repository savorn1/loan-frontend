<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.operationalPerformanceReports.disbursementTurnaround.title')"
      :description="
        t('accounting.operationalPerformanceReports.disbursementTurnaround.description')
      "
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.operationalPerformanceReportsHeader') },
        { label: t('accounting.operationalPerformanceReports.disbursementTurnaround.title') }
      ]"
    />

    <UCard v-if="rows.length > 0" class="mb-6">
      <dl class="grid grid-cols-2 gap-y-3 text-sm">
        <dt class="text-gray-500">
          {{ t('accounting.operationalPerformanceReports.disbursementTurnaround.loanCount') }}
        </dt>
        <dd class="font-semibold text-right">{{ rows.length }}</dd>
        <dt class="text-gray-500">
          {{
            t('accounting.operationalPerformanceReports.disbursementTurnaround.avgTurnaroundDays')
          }}
        </dt>
        <dd class="font-semibold text-right">{{ avgTurnaroundDays.toFixed(1) }}</dd>
      </dl>
    </UCard>

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-full sm:w-64"
          :placeholder="
            t('accounting.operationalPerformanceReports.disbursementTurnaround.searchPlaceholder')
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

      <DataTable v-model:sort="sort" :rows="pagedRows" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-clock"
            :title="t('accounting.operationalPerformanceReports.disbursementTurnaround.emptyTitle')"
            :description="
              t('accounting.operationalPerformanceReports.disbursementTurnaround.emptyDescription')
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
import type { LoanResponse } from '~/features/loans/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

interface TurnaroundRow {
  loanNo: string
  customer: string
  approvedAt: string
  disbursedAt: string
  turnaroundDays: number
}

const { t } = useI18n()
const api = useApi()

const {
  data: loansRaw,
  pending,
  error: fetchError
} = await useAsyncData('disbursement-turnaround-loans', () =>
  api<PageResponse<LoanResponse>>('/loans', { query: { size: 1000 } })
)
const loans = computed(() => loansRaw.value?.content ?? [])

function daysBetween(from: string, to: string) {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000)
}

const rows = computed<TurnaroundRow[]>(() =>
  loans.value
    .filter((l): l is LoanResponse & { approvedAt: string; disbursedAt: string } =>
      Boolean(l.approvedAt && l.disbursedAt)
    )
    .map((l) => ({
      loanNo: l.loanNo,
      customer: l.customerName,
      approvedAt: l.approvedAt,
      disbursedAt: l.disbursedAt,
      turnaroundDays: daysBetween(l.approvedAt, l.disbursedAt)
    }))
)

const avgTurnaroundDays = computed(() =>
  rows.value.length > 0
    ? rows.value.reduce((sum, r) => sum + r.turnaroundDays, 0) / rows.value.length
    : 0
)

const {
  search,
  page,
  pageSize,
  sort,
  total,
  rows: pagedRows
} = useClientTable(rows, {
  searchFields: ['loanNo', 'customer'],
  pageSize: 15
})

const columns = computed<ColumnDef<TurnaroundRow>[]>(() => [
  {
    key: 'loanNo',
    label: t('accounting.operationalPerformanceReports.disbursementTurnaround.columns.loan'),
    sortable: true
  },
  {
    key: 'customer',
    label: t('accounting.operationalPerformanceReports.disbursementTurnaround.columns.customer'),
    sortable: true
  },
  {
    key: 'approvedAt',
    label: t('accounting.operationalPerformanceReports.disbursementTurnaround.columns.approvedAt'),
    type: 'date',
    sortable: true
  },
  {
    key: 'disbursedAt',
    label: t('accounting.operationalPerformanceReports.disbursementTurnaround.columns.disbursedAt'),
    type: 'date',
    sortable: true
  },
  {
    key: 'turnaroundDays',
    label: t(
      'accounting.operationalPerformanceReports.disbursementTurnaround.columns.turnaroundDays'
    ),
    sortable: true
  }
])
</script>
