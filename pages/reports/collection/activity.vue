<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.collectionReports.activity.title')"
      :description="t('accounting.collectionReports.activity.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.collectionReportsHeader') },
        { label: t('accounting.collectionReports.activity.title') }
      ]"
    />

    <UCard v-if="outcomeBreakdown.length > 0" class="mb-6">
      <template #header>
        <span class="font-semibold">{{
          t('accounting.collectionReports.activity.outcomeBreakdownHeader')
        }}</span>
      </template>
      <DataTable :rows="outcomeBreakdown" :columns="breakdownColumns" :exportable="false" />
    </UCard>

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-full sm:w-64"
          :placeholder="t('accounting.collectionReports.activity.searchPlaceholder')"
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
            icon="i-heroicons-phone"
            :title="t('accounting.collectionReports.activity.emptyTitle')"
            :description="t('accounting.collectionReports.activity.emptyDescription')"
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
  CollectionActivityResponse
} from '~/features/collections/types'
import type { ColumnDef } from '~/shared/types'

interface ActivityRow {
  loanId: number
  customer: string
  authorName: string
  contactMethod: string
  outcome: string
  note: string
  createdAt: string
}

interface OutcomeRow {
  outcome: string
  count: number
}

const { t } = useI18n()
const api = useApi()

const {
  data: workqueue,
  pending: p1,
  error: e1
} = await useAsyncData('collection-activity-workqueue', () =>
  api<CollectionWorkqueueItemResponse[]>('/payments/collections/live')
)
const cases = computed(() => workqueue.value ?? [])

// No portfolio-wide activity log endpoint exists — only per-loan
// (/payments/collections/{loanId}/activities) — so fetch one call per loan
// currently in the collections workqueue (not the full loan book).
const {
  data: activitiesByCase,
  pending: p2,
  error: e2
} = await useAsyncData(
  'collection-activity-items',
  () =>
    Promise.all(
      cases.value.map((c) =>
        api<CollectionActivityResponse[]>(`/payments/collections/${c.loanId}/activities`)
      )
    ),
  { watch: [cases] }
)

const pending = computed(() => p1.value || p2.value)
const fetchError = computed(() => e1.value || e2.value)

const rows = computed<ActivityRow[]>(() => {
  const result: ActivityRow[] = []
  cases.value.forEach((c, i) => {
    for (const a of activitiesByCase.value?.[i] ?? []) {
      result.push({
        loanId: c.loanId,
        customer: c.customerName ?? '—',
        authorName: a.authorName,
        contactMethod: a.contactMethod,
        outcome: a.outcome,
        note: a.note,
        createdAt: a.createdAt
      })
    }
  })
  return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
})

const outcomeBreakdown = computed<OutcomeRow[]>(() => {
  const byOutcome = new Map<string, number>()
  for (const r of rows.value) {
    byOutcome.set(r.outcome, (byOutcome.get(r.outcome) ?? 0) + 1)
  }
  return [...byOutcome.entries()]
    .map(([outcome, count]) => ({ outcome, count }))
    .sort((a, b) => b.count - a.count)
})

const {
  search,
  page,
  pageSize,
  sort,
  total,
  rows: pagedRows
} = useClientTable(rows, {
  searchFields: ['customer', 'authorName', 'note'],
  pageSize: 15
})

const columns = computed<ColumnDef<ActivityRow>[]>(() => [
  { key: 'loanId', label: t('accounting.collectionReports.activity.columns.loan') },
  {
    key: 'customer',
    label: t('accounting.collectionReports.activity.columns.customer'),
    sortable: true
  },
  {
    key: 'contactMethod',
    label: t('accounting.collectionReports.activity.columns.contactMethod'),
    type: 'enum',
    sortable: true
  },
  {
    key: 'outcome',
    label: t('accounting.collectionReports.activity.columns.outcome'),
    type: 'enum',
    sortable: true
  },
  { key: 'note', label: t('accounting.collectionReports.activity.columns.note') },
  {
    key: 'authorName',
    label: t('accounting.collectionReports.activity.columns.author')
  },
  {
    key: 'createdAt',
    label: t('accounting.collectionReports.activity.columns.createdAt'),
    type: 'datetime',
    sortable: true
  }
])

const breakdownColumns = computed<ColumnDef<OutcomeRow>[]>(() => [
  {
    key: 'outcome',
    label: t('accounting.collectionReports.activity.columns.outcome'),
    type: 'enum'
  },
  { key: 'count', label: t('accounting.collectionReports.activity.columns.count') }
])
</script>
