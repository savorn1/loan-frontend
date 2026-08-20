<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.collectionReports.promises.title')"
      :description="t('accounting.collectionReports.promises.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.collectionReportsHeader') },
        { label: t('accounting.collectionReports.promises.title') }
      ]"
    />

    <UCard v-if="rows.length > 0" class="mb-6">
      <dl class="grid grid-cols-2 sm:grid-cols-4 gap-y-3 text-sm">
        <dt class="text-gray-500">
          {{ t('accounting.collectionReports.promises.totalPromised') }}
        </dt>
        <dd class="font-semibold">{{ formatCurrency(totalPromised) }}</dd>
        <dt class="text-gray-500">{{ t('accounting.collectionReports.promises.keptCount') }}</dt>
        <dd class="font-semibold">{{ keptCount }}</dd>
        <dt class="text-gray-500">{{ t('accounting.collectionReports.promises.brokenCount') }}</dt>
        <dd class="font-semibold">{{ brokenCount }}</dd>
        <dt class="text-gray-500">{{ t('accounting.collectionReports.promises.keptRate') }}</dt>
        <dd class="font-semibold">{{ keptRate.toFixed(1) }}%</dd>
      </dl>
    </UCard>

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-full sm:w-64"
          :placeholder="t('accounting.collectionReports.promises.searchPlaceholder')"
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
            icon="i-heroicons-hand-raised"
            :title="t('accounting.collectionReports.promises.emptyTitle')"
            :description="t('accounting.collectionReports.promises.emptyDescription')"
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
  CollectionWorkqueueItemResponse,
  CollectionPromiseResponse
} from '~/features/collections/types'
import type { ColumnDef } from '~/shared/types'

interface PromiseRow {
  loanId: number
  customer: string
  promisedAmount: number
  promisedDate: string
  status: string
  amountPaid: number
  createdByName: string
}

const { t } = useI18n()
const api = useApi()

const {
  data: workqueue,
  pending: p1,
  error: e1
} = await useAsyncData('collection-promises-workqueue', () =>
  api<CollectionWorkqueueItemResponse[]>('/payments/collections/live')
)
const cases = computed(() => workqueue.value ?? [])

// No portfolio-wide promises endpoint exists — only per-loan
// (/payments/collections/{loanId}/promises) — so fetch one call per loan
// currently in the collections workqueue (not the full loan book).
const {
  data: promisesByCase,
  pending: p2,
  error: e2
} = await useAsyncData(
  'collection-promises-items',
  () =>
    Promise.all(
      cases.value.map((c) =>
        api<CollectionPromiseResponse[]>(`/payments/collections/${c.loanId}/promises`)
      )
    ),
  { watch: [cases] }
)

const pending = computed(() => p1.value || p2.value)
const fetchError = computed(() => e1.value || e2.value)

const rows = computed<PromiseRow[]>(() => {
  const result: PromiseRow[] = []
  cases.value.forEach((c, i) => {
    for (const p of promisesByCase.value?.[i] ?? []) {
      result.push({
        loanId: c.loanId,
        customer: c.customerName ?? '—',
        promisedAmount: p.promisedAmount,
        promisedDate: p.promisedDate,
        status: p.status,
        amountPaid: p.amountPaid ?? 0,
        createdByName: p.createdByName
      })
    }
  })
  return result.sort((a, b) => b.promisedDate.localeCompare(a.promisedDate))
})

const totalPromised = computed(() => rows.value.reduce((sum, r) => sum + r.promisedAmount, 0))
const keptCount = computed(() => rows.value.filter((r) => r.status === 'KEPT').length)
const brokenCount = computed(() => rows.value.filter((r) => r.status === 'BROKEN').length)
const settledCount = computed(() => keptCount.value + brokenCount.value)
const keptRate = computed(() =>
  settledCount.value > 0 ? (keptCount.value / settledCount.value) * 100 : 0
)

const {
  search,
  page,
  pageSize,
  sort,
  total,
  rows: pagedRows
} = useClientTable(rows, {
  searchFields: ['customer'],
  pageSize: 15
})

const columns = computed<ColumnDef<PromiseRow>[]>(() => [
  { key: 'loanId', label: t('accounting.collectionReports.promises.columns.loan') },
  {
    key: 'customer',
    label: t('accounting.collectionReports.promises.columns.customer'),
    sortable: true
  },
  {
    key: 'promisedAmount',
    label: t('accounting.collectionReports.promises.columns.promisedAmount'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'promisedDate',
    label: t('accounting.collectionReports.promises.columns.promisedDate'),
    type: 'date',
    sortable: true
  },
  {
    key: 'status',
    label: t('accounting.collectionReports.promises.columns.status'),
    type: 'badge',
    color: (row) => (row.status === 'KEPT' ? 'teal' : row.status === 'BROKEN' ? 'red' : 'gray'),
    sortable: true
  },
  {
    key: 'amountPaid',
    label: t('accounting.collectionReports.promises.columns.amountPaid'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'createdByName',
    label: t('accounting.collectionReports.promises.columns.createdBy')
  }
])
</script>
