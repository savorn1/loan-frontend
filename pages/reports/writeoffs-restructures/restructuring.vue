<template>
  <div>
    <UButton to="/reports" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      {{ t('admin.reports.title') }}
    </UButton>
    <PageHeader
      :title="t('accounting.writeoffRestructureReports.restructuring.title')"
      :description="t('accounting.writeoffRestructureReports.restructuring.description')"
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
          class="w-56"
          :placeholder="t('accounting.writeoffRestructureReports.restructuring.searchPlaceholder')"
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
            icon="i-heroicons-arrow-path"
            :title="
              hasFullRange
                ? t('accounting.writeoffRestructureReports.restructuring.emptyTitleNoActivity')
                : t('accounting.writeoffRestructureReports.restructuring.emptyTitlePick')
            "
            :description="
              hasFullRange
                ? t(
                    'accounting.writeoffRestructureReports.restructuring.emptyDescriptionNoActivity'
                  )
                : t('accounting.writeoffRestructureReports.restructuring.emptyDescriptionPick')
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
import type { LoanRestructureResponse } from '~/features/loans/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

const {
  data: restructuresRaw,
  pending,
  error: fetchError
} = await useAsyncData('loan-restructuring', () =>
  api<PageResponse<LoanRestructureResponse>>('/loans/restructures', { query: { size: 1000 } })
)
const restructures = computed(() => restructuresRaw.value?.content ?? [])

const dateFrom = ref('')
const dateTo = ref('')
const hasFullRange = computed(() => !!dateFrom.value && !!dateTo.value)

const restructuresInRange = computed(() => {
  if (!hasFullRange.value) return []
  return restructures.value.filter(
    (r) => r.effectiveDate >= dateFrom.value && r.effectiveDate <= dateTo.value
  )
})

const { search, page, pageSize, sort, total, rows } = useClientTable(restructuresInRange, {
  searchFields: ['loanId'],
  pageSize: 15
})

const columns = computed<ColumnDef<LoanRestructureResponse>[]>(() => [
  {
    key: 'loanId',
    label: t('accounting.writeoffRestructureReports.restructuring.columns.loanId'),
    sortable: true
  },
  {
    key: 'newTermMonths',
    label: t('accounting.writeoffRestructureReports.restructuring.columns.newTermMonths'),
    sortable: true
  },
  {
    key: 'newInterestRate',
    label: t('accounting.writeoffRestructureReports.restructuring.columns.newInterestRate'),
    type: 'percent',
    sortable: true
  },
  { key: 'reason', label: t('accounting.writeoffRestructureReports.restructuring.columns.reason') },
  {
    key: 'effectiveDate',
    label: t('accounting.writeoffRestructureReports.restructuring.columns.effectiveDate'),
    type: 'date',
    sortable: true
  }
])
</script>
