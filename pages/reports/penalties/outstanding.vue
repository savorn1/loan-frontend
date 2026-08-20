<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.penaltyReports.outstanding.title')"
      :description="t('accounting.penaltyReports.outstanding.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.penaltyReportsHeader') },
        { label: t('accounting.penaltyReports.outstanding.title') }
      ]"
    />

    <UCard v-if="total > 0" class="mb-6">
      <div class="flex justify-end text-sm font-semibold">
        <span
          >{{ t('accounting.penaltyReports.outstanding.totalOutstanding') }}:
          {{ formatCurrency(totalOutstanding) }}</span
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
          :placeholder="t('accounting.penaltyReports.outstanding.searchPlaceholder')"
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
            :title="t('accounting.penaltyReports.outstanding.emptyTitle')"
            :description="t('accounting.penaltyReports.outstanding.emptyDescription')"
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
} = await useAsyncData('penalty-outstanding', () =>
  api<PageResponse<LoanPenaltyResponse>>('/loans/penalties', { query: { size: 1000 } })
)
const penalties = computed(() => penaltiesRaw.value?.content ?? [])

const outstanding = computed(() => penalties.value.filter((p) => p.status === 'PENDING'))
const totalOutstanding = computed(() => outstanding.value.reduce((sum, p) => sum + p.amount, 0))

const { search, page, pageSize, sort, total, rows } = useClientTable(outstanding, {
  searchFields: ['loanId'],
  pageSize: 15
})

const columns = computed<ColumnDef<LoanPenaltyResponse>[]>(() => [
  {
    key: 'loanId',
    label: t('accounting.penaltyReports.outstanding.columns.loanId'),
    sortable: true
  },
  {
    key: 'amount',
    label: t('accounting.penaltyReports.outstanding.columns.amount'),
    type: 'currency',
    sortable: true
  },
  { key: 'reason', label: t('accounting.penaltyReports.outstanding.columns.reason') },
  {
    key: 'appliedDate',
    label: t('accounting.penaltyReports.outstanding.columns.appliedDate'),
    type: 'date',
    sortable: true
  }
])
</script>
