<template>
  <div>
    <PageHeader
      :title="t('accounting.overdueReports.collectionDue.title')"
      :description="t('accounting.overdueReports.collectionDue.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.overdueReportsHeader') },
        { label: t('accounting.overdueReports.collectionDue.title') }
      ]"
    />

    <UCard class="mb-6">
      <UFormGroup class="max-w-xs">
        <USelectMenu
          v-model="range"
          :options="rangeOptions"
          option-attribute="label"
          value-attribute="value"
        />
      </UFormGroup>
    </UCard>

    <UCard v-if="total > 0" class="mb-6">
      <div class="flex justify-end text-sm font-semibold">
        <span
          >{{ t('accounting.overdueReports.collectionDue.totalDue') }}:
          {{ formatCurrency(totalDue) }}</span
        >
      </div>
    </UCard>

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-56"
          :placeholder="t('accounting.overdueReports.collectionDue.searchPlaceholder')"
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
            icon="i-heroicons-calendar-days"
            :title="t('accounting.overdueReports.collectionDue.emptyTitle')"
            :description="t('accounting.overdueReports.collectionDue.emptyDescription')"
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
import type { PaymentResponse } from '~/features/payments/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

type DueRange = 'today' | 'tomorrow' | 'week' | 'month' | 'upcoming'

const { t } = useI18n()
const api = useApi()
const route = useRoute()

const {
  data: paymentsRaw,
  pending,
  error: fetchError
} = await useAsyncData('collection-due', () =>
  api<PageResponse<PaymentResponse>>('/payments', { query: { size: 1000 } })
)
const payments = computed(() => paymentsRaw.value?.content ?? [])

function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const todayIso = toIsoDate(new Date())

const rangeOptions = computed(() => [
  { label: t('accounting.overdueReports.collectionDue.rangeToday'), value: 'today' },
  { label: t('accounting.overdueReports.collectionDue.rangeTomorrow'), value: 'tomorrow' },
  { label: t('accounting.overdueReports.collectionDue.rangeWeek'), value: 'week' },
  { label: t('accounting.overdueReports.collectionDue.rangeMonth'), value: 'month' },
  { label: t('accounting.overdueReports.collectionDue.rangeUpcoming'), value: 'upcoming' }
])

// Pre-filled when arriving from a range-specific tile (e.g. "Installments Due Tomorrow" on /reports).
const range = ref<DueRange>((route.query.range as DueRange) || 'today')

// [start, end] window for the selected range — end is null for "upcoming" (unbounded).
const rangeWindow = computed<{ start: string; end: string | null }>(() => {
  const now = new Date()
  if (range.value === 'today') return { start: todayIso, end: todayIso }
  if (range.value === 'tomorrow') {
    const d = toIsoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))
    return { start: d, end: d }
  }
  if (range.value === 'week') {
    return {
      start: todayIso,
      end: toIsoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6))
    }
  }
  if (range.value === 'month') {
    return { start: todayIso, end: toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)) }
  }
  return { start: todayIso, end: null }
})

const dueInRange = computed(() =>
  payments.value.filter(
    (p) =>
      p.status === 'PENDING' &&
      p.dueDate >= rangeWindow.value.start &&
      (rangeWindow.value.end === null || p.dueDate <= rangeWindow.value.end)
  )
)

const totalDue = computed(() => dueInRange.value.reduce((sum, p) => sum + p.amount, 0))

const { search, page, pageSize, sort, total, rows } = useClientTable(dueInRange, {
  searchFields: ['loanId'],
  pageSize: 15
})

const columns = computed<ColumnDef<PaymentResponse>[]>(() => [
  {
    key: 'loanId',
    label: t('accounting.overdueReports.collectionDue.columns.loanId'),
    sortable: true
  },
  {
    key: 'installmentNumber',
    label: t('accounting.overdueReports.collectionDue.columns.installmentNumber'),
    sortable: true
  },
  {
    key: 'dueDate',
    label: t('accounting.overdueReports.collectionDue.columns.dueDate'),
    type: 'date',
    sortable: true
  },
  {
    key: 'amount',
    label: t('accounting.overdueReports.collectionDue.columns.amount'),
    type: 'currency',
    sortable: true
  }
])
</script>
