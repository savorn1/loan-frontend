<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.writeoffRestructureReports.refinancing.title')"
      :description="t('accounting.writeoffRestructureReports.refinancing.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.writeoffRestructureReportsHeader') },
        { label: t('accounting.writeoffRestructureReports.refinancing.title') }
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

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-full sm:w-56"
          :placeholder="t('accounting.writeoffRestructureReports.refinancing.searchPlaceholder')"
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
            icon="i-heroicons-arrows-right-left"
            :title="
              hasFullRange
                ? t('accounting.writeoffRestructureReports.refinancing.emptyTitleNoActivity')
                : t('accounting.writeoffRestructureReports.refinancing.emptyTitlePick')
            "
            :description="
              hasFullRange
                ? t('accounting.writeoffRestructureReports.refinancing.emptyDescriptionNoActivity')
                : t('accounting.writeoffRestructureReports.refinancing.emptyDescriptionPick')
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
import type { LoanRefinanceResponse } from '~/features/loans/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

const {
  data: refinancesRaw,
  pending,
  error: fetchError
} = await useAsyncData('loan-refinancing', () =>
  api<PageResponse<LoanRefinanceResponse>>('/loans/refinances', { query: { size: 1000 } })
)
const refinances = computed(() => refinancesRaw.value?.content ?? [])

const dateFrom = ref('')
const dateTo = ref('')
const hasFullRange = computed(() => !!dateFrom.value && !!dateTo.value)

const refinancesInRange = computed(() => {
  if (!hasFullRange.value) return []
  return refinances.value.filter(
    (r) => r.effectiveDate >= dateFrom.value && r.effectiveDate <= dateTo.value
  )
})

const { search, page, pageSize, sort, total, rows } = useClientTable(refinancesInRange, {
  searchFields: ['loanId'],
  pageSize: 15
})

const columns = computed<ColumnDef<LoanRefinanceResponse>[]>(() => [
  {
    key: 'loanId',
    label: t('accounting.writeoffRestructureReports.refinancing.columns.loanId'),
    sortable: true
  },
  {
    key: 'newLoanId',
    label: t('accounting.writeoffRestructureReports.refinancing.columns.newLoanId'),
    type: 'link',
    href: (row) => `/loans/${row.newLoanId}`,
    sortable: true
  },
  { key: 'reason', label: t('accounting.writeoffRestructureReports.refinancing.columns.reason') },
  {
    key: 'effectiveDate',
    label: t('accounting.writeoffRestructureReports.refinancing.columns.effectiveDate'),
    type: 'date',
    sortable: true
  }
])
</script>
