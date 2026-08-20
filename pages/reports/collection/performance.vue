<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.collectionReports.performance.title')"
      :description="t('accounting.collectionReports.performance.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.collectionReportsHeader') },
        { label: t('accounting.collectionReports.performance.title') }
      ]"
    />

    <UCard class="mb-6">
      <UFormGroup
        :label="t('common.dateRangeFilter.from') + ' – ' + t('common.dateRangeFilter.to')"
        class="max-w-xs"
      >
        <DateRangeFilter v-model:from="dateFrom" v-model:to="dateTo" />
      </UFormGroup>
    </UCard>

    <UCard v-if="hasFullRange" class="mb-6">
      <dl class="grid grid-cols-3 gap-y-3 text-sm">
        <dt class="text-gray-500">{{ t('accounting.collectionReports.performance.totalDue') }}</dt>
        <dd class="font-semibold col-span-2 text-right">{{ formatCurrency(totalDue) }}</dd>
        <dt class="text-gray-500">
          {{ t('accounting.collectionReports.performance.totalCollected') }}
        </dt>
        <dd class="font-semibold col-span-2 text-right">{{ formatCurrency(totalCollected) }}</dd>
        <dt class="text-gray-500">
          {{ t('accounting.collectionReports.performance.collectionRate') }}
        </dt>
        <dd class="font-semibold col-span-2 text-right">{{ collectionRate.toFixed(1) }}%</dd>
      </dl>
    </UCard>

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-full sm:w-56"
          :placeholder="t('accounting.collectionReports.performance.searchPlaceholder')"
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
            icon="i-heroicons-chart-bar"
            :title="
              hasFullRange
                ? t('accounting.collectionReports.performance.emptyTitleNoActivity')
                : t('accounting.collectionReports.performance.emptyTitlePick')
            "
            :description="
              hasFullRange
                ? t('accounting.collectionReports.performance.emptyDescriptionNoActivity')
                : t('accounting.collectionReports.performance.emptyDescriptionPick')
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
import type { PaymentResponse } from '~/features/payments/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

const {
  data: paymentsRaw,
  pending,
  error: fetchError
} = await useAsyncData('collection-performance', () =>
  api<PageResponse<PaymentResponse>>('/payments', { query: { size: 1000 } })
)
const payments = computed(() => paymentsRaw.value?.content ?? [])

const dateFrom = ref('')
const dateTo = ref('')
const hasFullRange = computed(() => !!dateFrom.value && !!dateTo.value)

// Every installment that fell due in the selected window — collected or not —
// so the rate reflects how much of what was owed actually got paid.
const dueInRange = computed<PaymentResponse[]>(() => {
  if (!hasFullRange.value) return []
  return payments.value.filter((p) => p.dueDate >= dateFrom.value && p.dueDate <= dateTo.value)
})

const totalDue = computed(() => dueInRange.value.reduce((sum, p) => sum + p.amount, 0))
const totalCollected = computed(() =>
  dueInRange.value.filter((p) => p.status === 'PAID').reduce((sum, p) => sum + p.amount, 0)
)
const collectionRate = computed(() =>
  totalDue.value > 0 ? (totalCollected.value / totalDue.value) * 100 : 0
)

const { search, page, pageSize, sort, total, rows } = useClientTable(dueInRange, {
  searchFields: ['loanId'],
  pageSize: 15
})

const columns = computed<ColumnDef<PaymentResponse>[]>(() => [
  {
    key: 'loanId',
    label: t('accounting.collectionReports.performance.columns.loanId'),
    sortable: true
  },
  {
    key: 'dueDate',
    label: t('accounting.collectionReports.performance.columns.dueDate'),
    type: 'date',
    sortable: true
  },
  {
    key: 'amount',
    label: t('accounting.collectionReports.performance.columns.amount'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'status',
    label: t('accounting.collectionReports.performance.columns.status'),
    type: 'status',
    sortable: true
  },
  {
    key: 'paidAt',
    label: t('accounting.collectionReports.performance.columns.paidAt'),
    type: 'date',
    sortable: true
  }
])
</script>
