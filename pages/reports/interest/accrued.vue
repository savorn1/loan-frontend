<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.interestReports.accrued.title')"
      :description="t('accounting.interestReports.accrued.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.interestReportsHeader') },
        { label: t('accounting.interestReports.accrued.title') }
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

    <UCard v-if="total > 0" class="mb-6">
      <div class="flex justify-end text-sm font-semibold">
        <span
          >{{ t('accounting.interestReports.accrued.totalAccrued') }}:
          {{ formatCurrency(totalAccrued) }}</span
        >
      </div>
    </UCard>

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-full sm:w-56"
          :placeholder="t('accounting.interestReports.accrued.searchPlaceholder')"
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
                ? t('accounting.interestReports.accrued.emptyTitleNoActivity')
                : t('accounting.interestReports.accrued.emptyTitlePick')
            "
            :description="
              hasFullRange
                ? t('accounting.interestReports.accrued.emptyDescriptionNoActivity')
                : t('accounting.interestReports.accrued.emptyDescriptionPick')
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
import type { LoanInterestResponse } from '~/features/loans/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

const {
  data: accrualsRaw,
  pending,
  error: fetchError
} = await useAsyncData('interest-accrued', () =>
  api<PageResponse<LoanInterestResponse>>('/loans/interest', { query: { size: 1000 } })
)
const accruals = computed(() => accrualsRaw.value?.content ?? [])

const dateFrom = ref('')
const dateTo = ref('')
const hasFullRange = computed(() => !!dateFrom.value && !!dateTo.value)

const accruedInRange = computed(() => {
  if (!hasFullRange.value) return []
  return accruals.value.filter(
    (a) => a.accruedAt.slice(0, 10) >= dateFrom.value && a.accruedAt.slice(0, 10) <= dateTo.value
  )
})

const totalAccrued = computed(() => accruedInRange.value.reduce((sum, a) => sum + a.amount, 0))

const { search, page, pageSize, sort, total, rows } = useClientTable(accruedInRange, {
  searchFields: ['loanId'],
  pageSize: 15
})

const columns = computed<ColumnDef<LoanInterestResponse>[]>(() => [
  { key: 'loanId', label: t('accounting.interestReports.accrued.columns.loanId'), sortable: true },
  {
    key: 'periodStart',
    label: t('accounting.interestReports.accrued.columns.periodStart'),
    type: 'date',
    sortable: true
  },
  {
    key: 'periodEnd',
    label: t('accounting.interestReports.accrued.columns.periodEnd'),
    type: 'date',
    sortable: true
  },
  {
    key: 'rate',
    label: t('accounting.interestReports.accrued.columns.rate'),
    type: 'percent',
    sortable: true
  },
  {
    key: 'amount',
    label: t('accounting.interestReports.accrued.columns.amount'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'accruedAt',
    label: t('accounting.interestReports.accrued.columns.accruedAt'),
    type: 'datetime',
    sortable: true
  }
])
</script>
