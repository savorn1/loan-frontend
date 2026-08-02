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
      :title="t('accounting.penaltyReports.charges.title')"
      :description="t('accounting.penaltyReports.charges.description')"
    />

    <UCard class="mb-6">
      <UFormGroup :label="t('common.dateRangeFilter.from') + ' – ' + t('common.dateRangeFilter.to')" class="max-w-xs">
        <DateRangeFilter v-model:from="dateFrom" v-model:to="dateTo" />
      </UFormGroup>
    </UCard>

    <UCard v-if="total > 0" class="mb-6">
      <div class="flex justify-end text-sm font-semibold">
        <span>{{ t('accounting.penaltyReports.charges.totalCharged') }}: {{ formatCurrency(totalCharged) }}</span>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-56"
          :placeholder="t('accounting.penaltyReports.charges.searchPlaceholder')"
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
            icon="i-heroicons-exclamation-triangle"
            :title="
              hasFullRange
                ? t('accounting.penaltyReports.charges.emptyTitleNoActivity')
                : t('accounting.penaltyReports.charges.emptyTitlePick')
            "
            :description="
              hasFullRange
                ? t('accounting.penaltyReports.charges.emptyDescriptionNoActivity')
                : t('accounting.penaltyReports.charges.emptyDescriptionPick')
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
} = await useAsyncData('penalty-charges', () => api<PageResponse<LoanPenaltyResponse>>('/loans/penalties', { query: { size: 1000 } }))
const penalties = computed(() => penaltiesRaw.value?.content ?? [])

const dateFrom = ref('')
const dateTo = ref('')
const hasFullRange = computed(() => !!dateFrom.value && !!dateTo.value)

const chargedInRange = computed(() => {
  if (!hasFullRange.value) return []
  return penalties.value.filter((p) => p.appliedDate >= dateFrom.value && p.appliedDate <= dateTo.value)
})

const totalCharged = computed(() => chargedInRange.value.reduce((sum, p) => sum + p.amount, 0))

const { search, page, pageSize, sort, total, rows } = useClientTable(chargedInRange, {
  searchFields: ['loanId'],
  pageSize: 15
})

const columns = computed<ColumnDef<LoanPenaltyResponse>[]>(() => [
  { key: 'loanId', label: t('accounting.penaltyReports.charges.columns.loanId'), sortable: true },
  { key: 'amount', label: t('accounting.penaltyReports.charges.columns.amount'), type: 'currency', sortable: true },
  { key: 'reason', label: t('accounting.penaltyReports.charges.columns.reason') },
  { key: 'appliedDate', label: t('accounting.penaltyReports.charges.columns.appliedDate'), type: 'date', sortable: true },
  { key: 'status', label: t('accounting.penaltyReports.charges.columns.status'), type: 'status', sortable: true }
])
</script>
