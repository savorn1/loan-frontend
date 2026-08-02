<template>
  <div>
    <UButton
      to="/reports"
      variant="link"
      icon="i-heroicons-arrow-left"
      size="xs"
      class="mb-1 px-0"
    >
      {{ t('admin.reports.title') }}
    </UButton>
    <PageHeader
      :title="t('accounting.writeoffRestructureReports.writeoffs.title')"
      :description="t('accounting.writeoffRestructureReports.writeoffs.description')"
    />

    <UCard class="mb-6">
      <UFormGroup :label="t('common.dateRangeFilter.from') + ' – ' + t('common.dateRangeFilter.to')" class="max-w-xs">
        <DateRangeFilter v-model:from="dateFrom" v-model:to="dateTo" />
      </UFormGroup>
    </UCard>

    <UCard v-if="total > 0" class="mb-6">
      <div class="flex justify-end text-sm font-semibold">
        <span>{{ t('accounting.writeoffRestructureReports.writeoffs.totalWriteoffs') }}: {{ formatCurrency(totalWriteoffs) }}</span>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-56"
          :placeholder="t('accounting.writeoffRestructureReports.writeoffs.searchPlaceholder')"
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
            icon="i-heroicons-trash"
            :title="
              hasFullRange
                ? t('accounting.writeoffRestructureReports.writeoffs.emptyTitleNoActivity')
                : t('accounting.writeoffRestructureReports.writeoffs.emptyTitlePick')
            "
            :description="
              hasFullRange
                ? t('accounting.writeoffRestructureReports.writeoffs.emptyDescriptionNoActivity')
                : t('accounting.writeoffRestructureReports.writeoffs.emptyDescriptionPick')
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
import type { LoanWriteoffResponse } from '~/features/loans/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

const {
  data: writeoffsRaw,
  pending,
  error: fetchError
} = await useAsyncData('loan-writeoffs', () => api<PageResponse<LoanWriteoffResponse>>('/loans/writeoffs', { query: { size: 1000 } }))
const writeoffs = computed(() => writeoffsRaw.value?.content ?? [])

const dateFrom = ref('')
const dateTo = ref('')
const hasFullRange = computed(() => !!dateFrom.value && !!dateTo.value)

const writeoffsInRange = computed(() => {
  if (!hasFullRange.value) return []
  return writeoffs.value.filter((w) => w.writeoffDate >= dateFrom.value && w.writeoffDate <= dateTo.value)
})

const totalWriteoffs = computed(() => writeoffsInRange.value.reduce((sum, w) => sum + w.amount, 0))

const { search, page, pageSize, sort, total, rows } = useClientTable(writeoffsInRange, {
  searchFields: ['loanId'],
  pageSize: 15
})

const columns = computed<ColumnDef<LoanWriteoffResponse>[]>(() => [
  { key: 'loanId', label: t('accounting.writeoffRestructureReports.writeoffs.columns.loanId'), sortable: true },
  { key: 'amount', label: t('accounting.writeoffRestructureReports.writeoffs.columns.amount'), type: 'currency', sortable: true },
  { key: 'reason', label: t('accounting.writeoffRestructureReports.writeoffs.columns.reason') },
  { key: 'writeoffDate', label: t('accounting.writeoffRestructureReports.writeoffs.columns.writeoffDate'), type: 'date', sortable: true },
  { key: 'status', label: t('accounting.writeoffRestructureReports.writeoffs.columns.status'), type: 'status', sortable: true }
])
</script>
