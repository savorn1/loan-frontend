<template>
  <div>
    <UButton to="/reports" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      {{ t('admin.reports.title') }}
    </UButton>
    <PageHeader
      :title="t('accounting.penaltyReports.collection.title')"
      :description="t('accounting.penaltyReports.collection.description')"
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
          >{{ t('accounting.penaltyReports.collection.totalCollected') }}:
          {{ formatCurrency(totalCollected) }}</span
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
          :placeholder="t('accounting.penaltyReports.collection.searchPlaceholder')"
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
            icon="i-heroicons-inbox-arrow-down"
            :title="
              hasFullRange
                ? t('accounting.penaltyReports.collection.emptyTitleNoActivity')
                : t('accounting.penaltyReports.collection.emptyTitlePick')
            "
            :description="
              hasFullRange
                ? t('accounting.penaltyReports.collection.emptyDescriptionNoActivity')
                : t('accounting.penaltyReports.collection.emptyDescriptionPick')
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
import type { LoanPenaltyResponse } from '~/features/loans/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

const {
  data: penaltiesRaw,
  pending,
  error: fetchError
} = await useAsyncData('penalty-collection', () =>
  api<PageResponse<LoanPenaltyResponse>>('/loans/penalties', { query: { size: 1000 } })
)
const penalties = computed(() => penaltiesRaw.value?.content ?? [])

const dateFrom = ref('')
const dateTo = ref('')
const hasFullRange = computed(() => !!dateFrom.value && !!dateTo.value)

const collectedInRange = computed(() => {
  if (!hasFullRange.value) return []
  return penalties.value.filter(
    (p): p is LoanPenaltyResponse & { paidAt: string } =>
      p.status === 'PAID' &&
      !!p.paidAt &&
      p.paidAt.slice(0, 10) >= dateFrom.value &&
      p.paidAt.slice(0, 10) <= dateTo.value
  )
})

const totalCollected = computed(() => collectedInRange.value.reduce((sum, p) => sum + p.amount, 0))

const { search, page, pageSize, sort, total, rows } = useClientTable(collectedInRange, {
  searchFields: ['loanId'],
  pageSize: 15
})

const columns = computed<ColumnDef<LoanPenaltyResponse>[]>(() => [
  {
    key: 'loanId',
    label: t('accounting.penaltyReports.collection.columns.loanId'),
    sortable: true
  },
  {
    key: 'amount',
    label: t('accounting.penaltyReports.collection.columns.amount'),
    type: 'currency',
    sortable: true
  },
  { key: 'reason', label: t('accounting.penaltyReports.collection.columns.reason') },
  {
    key: 'paidAt',
    label: t('accounting.penaltyReports.collection.columns.paidAt'),
    type: 'datetime',
    sortable: true
  }
])
</script>
