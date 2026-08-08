<template>
  <div>
    <PageHeader
      :title="t('accounting.receivablesReports.aging.title')"
      :description="t('accounting.receivablesReports.aging.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.receivablesReportsHeader') },
        { label: t('accounting.receivablesReports.aging.title') }
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
          t('accounting.receivablesReports.aging.bucketsHeader')
        }}</span>
      </template>
      <DataTable
        :rows="bucketRows"
        :columns="bucketColumns"
        :loading="pending"
        :exportable="false"
      />
    </UCard>

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="font-semibold">{{
            t('accounting.receivablesReports.aging.detailHeader')
          }}</span>
          <div class="flex flex-wrap items-center gap-3">
            <UInput
              v-model="search"
              icon="i-heroicons-magnifying-glass"
              size="sm"
              class="w-56"
              :placeholder="t('accounting.receivablesReports.aging.searchPlaceholder')"
            />
            <USelectMenu
              v-model="bucketFilter"
              :options="bucketFilterOptions"
              option-attribute="label"
              value-attribute="value"
              size="sm"
              class="w-40"
            />
          </div>
        </div>
      </template>

      <DataTable
        v-model:sort="sort"
        :rows="rows"
        :columns="detailColumns"
        :loading="pending"
        @select="
          (row: CollectionWorkqueueItemResponse) => router.push(`/collections/${row.loanId}`)
        "
      >
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-clock"
            :title="t('accounting.receivablesReports.aging.emptyTitle')"
            :description="t('accounting.receivablesReports.aging.emptyDescription')"
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
import type {
  CollectionBucket,
  CollectionWorkqueueItemResponse
} from '~/features/collections/types'
import type { ParBucketSummary, ParSummaryResponse } from '~/features/reports/types'
import type { ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()
const router = useRouter()
const route = useRoute()

const [{ data: parSummary, pending: p1, error: e1 }, { data: workqueue, pending: p2, error: e2 }] =
  await Promise.all([
    useAsyncData('receivables-aging-par-summary', () =>
      api<ParSummaryResponse>('/payments/reports/par-summary')
    ),
    useAsyncData('receivables-aging-workqueue', () =>
      api<CollectionWorkqueueItemResponse[]>('/payments/collections')
    )
  ])

const pending = computed(() => p1.value || p2.value)
const fetchError = computed(() => e1.value || e2.value)

const BUCKET_META: Record<CollectionBucket, { labelKey: string; color: string }> = {
  DPD_1_30: { labelKey: 'admin.reports.buckets.dpd1_30', color: 'orange' },
  DPD_31_60: { labelKey: 'admin.reports.buckets.dpd31_60', color: 'orange' },
  DPD_61_90: { labelKey: 'admin.reports.buckets.dpd61_90', color: 'red' },
  DPD_90_PLUS: { labelKey: 'admin.reports.buckets.dpd90plus', color: 'red' }
}
function bucketLabel(bucket: CollectionBucket) {
  return t(BUCKET_META[bucket].labelKey)
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function bucketColor(bucket: CollectionBucket): any {
  return BUCKET_META[bucket].color
}

const bucketRows = computed(() => parSummary.value?.buckets ?? [])

const bucketColumns = computed<ColumnDef<ParBucketSummary>[]>(() => [
  {
    key: 'bucket',
    label: t('accounting.receivablesReports.aging.bucketColumns.bucket'),
    type: 'badge',
    value: (row) => bucketLabel(row.bucket),
    color: (row) => bucketColor(row.bucket)
  },
  { key: 'loanCount', label: t('accounting.receivablesReports.aging.bucketColumns.loanCount') },
  {
    key: 'overdueAmount',
    label: t('accounting.receivablesReports.aging.bucketColumns.overdueAmount'),
    type: 'currency'
  }
])

const bucketFilterOptions = computed(() => [
  { label: t('accounting.receivablesReports.aging.bucketFilterAll'), value: '' },
  { label: bucketLabel('DPD_1_30'), value: 'DPD_1_30' },
  { label: bucketLabel('DPD_31_60'), value: 'DPD_31_60' },
  { label: bucketLabel('DPD_61_90'), value: 'DPD_61_90' },
  { label: bucketLabel('DPD_90_PLUS'), value: 'DPD_90_PLUS' }
])
// Pre-filled when arriving from a bucket-specific tile (e.g. "Delinquent Loans" on /reports).
const bucketFilter = ref<CollectionBucket | ''>((route.query.bucket as CollectionBucket) || '')

const filtered = computed(() =>
  (workqueue.value ?? []).filter(
    (item) => !bucketFilter.value || item.bucket === bucketFilter.value
  )
)

const { search, page, pageSize, sort, total, rows } = useClientTable(filtered, {
  searchFields: ['customerName'],
  pageSize: 15
})

const detailColumns = computed<ColumnDef<CollectionWorkqueueItemResponse>[]>(() => [
  { key: 'loanId', label: t('accounting.receivablesReports.aging.columns.loanId'), sortable: true },
  {
    key: 'customerName',
    label: t('accounting.receivablesReports.aging.columns.customer'),
    sortable: true
  },
  {
    key: 'principal',
    label: t('accounting.receivablesReports.aging.columns.principal'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'outstandingBalance',
    label: t('accounting.receivablesReports.aging.columns.outstandingBalance'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'totalOverdueAmount',
    label: t('accounting.receivablesReports.aging.columns.overdueAmount'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'oldestDueDate',
    label: t('accounting.receivablesReports.aging.columns.oldestDueDate'),
    type: 'date',
    sortable: true
  },
  {
    key: 'maxDpd',
    label: t('accounting.receivablesReports.aging.columns.daysPastDue'),
    sortable: true
  },
  {
    key: 'bucket',
    label: t('accounting.receivablesReports.aging.columns.bucket'),
    type: 'badge',
    value: (row) => bucketLabel(row.bucket),
    color: (row) => bucketColor(row.bucket)
  }
])
</script>
