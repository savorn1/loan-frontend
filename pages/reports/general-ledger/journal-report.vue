<template>
  <div>
    <UButton to="/reports" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      {{ t('admin.reports.backToReports') }}
    </UButton>
    <PageHeader
      :title="t('accounting.generalLedgerReports.journalReport.title')"
      :description="t('accounting.generalLedgerReports.journalReport.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.generalLedgerReportsHeader') },
        { label: t('accounting.generalLedgerReports.journalReport.title') }
      ]"
    />

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center gap-3">
          <DateRangeFilter v-model:from="dateFrom" v-model:to="dateTo" />
          <USelectMenu
            v-model="branchFilter"
            :options="branchFilterOptions"
            option-attribute="label"
            value-attribute="value"
            class="w-full sm:w-44"
          />
          <USelectMenu
            v-model="statusFilter"
            :options="statusFilterOptions"
            option-attribute="label"
            value-attribute="value"
            class="w-full sm:w-40"
          />
          <UButton
            v-if="hasFilters"
            variant="ghost"
            color="gray"
            icon="i-heroicons-x-mark"
            @click="clearFilters"
          >
            {{ t('common.clearFilters') }}
          </UButton>
        </div>
      </template>

      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable
        v-model:sort="sort"
        :rows="rows"
        :columns="columns"
        :loading="pending"
        @select="(row: JournalEntryResponse) => router.push(`/journal-entries/${row.id}`)"
      >
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-magnifying-glass"
            :title="t('common.noMatches')"
            :description="t('accounting.journalEntries.emptyDescription')"
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
import type { JournalEntryResponse, JournalEntryStatus } from '~/features/accounting/types'
import type { BranchResponse } from '~/features/branches/types'
import type { ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()
const router = useRouter()

const {
  data: entries,
  pending,
  error: fetchError
} = await useAsyncData('journal-report-entries', () =>
  api<JournalEntryResponse[]>('/journal-entries')
)
const { data: branches } = await useAsyncData('journal-report-branches', () =>
  api<BranchResponse[]>('/branches')
)

const branchNameById = computed(() => new Map((branches.value ?? []).map((b) => [b.id, b.name])))
const branchFilterOptions = computed(() => [
  { label: t('accounting.generalLedgerReports.journalReport.branchFilterAll'), value: '' },
  ...(branches.value ?? []).map((b) => ({ label: b.name, value: b.id }))
])
const branchFilter = ref<number | ''>('')

const statusFilterOptions = computed(() => [
  { label: t('accounting.generalLedgerReports.journalReport.statusFilterAll'), value: '' },
  { label: formatEnum('DRAFT'), value: 'DRAFT' },
  { label: formatEnum('POSTED'), value: 'POSTED' },
  { label: formatEnum('REVERSED'), value: 'REVERSED' }
])
const statusFilter = ref<JournalEntryStatus | ''>('')

const { from: dateFrom, to: dateTo, inRange } = useDateRangeFilter()
const filtered = computed(() =>
  (entries.value ?? []).filter(
    (e) =>
      inRange(e.transactionDate) &&
      (!branchFilter.value || e.branchId === branchFilter.value) &&
      (!statusFilter.value || e.status === statusFilter.value)
  )
)
const hasFilters = computed(
  () => !!dateFrom.value || !!dateTo.value || !!branchFilter.value || !!statusFilter.value
)

function clearFilters() {
  dateFrom.value = ''
  dateTo.value = ''
  branchFilter.value = ''
  statusFilter.value = ''
}

const { page, pageSize, sort, total, rows } = useClientTable(filtered, { pageSize: 15 })

const columns = computed<ColumnDef<JournalEntryResponse>[]>(() => [
  { key: 'entryNo', label: t('accounting.journalEntries.columns.entryNo'), sortable: true },
  {
    key: 'transactionType',
    label: t('accounting.journalEntries.columns.type'),
    type: 'enum',
    sortable: true
  },
  {
    key: 'transactionDate',
    label: t('accounting.journalEntries.columns.date'),
    type: 'date',
    sortable: true
  },
  {
    key: 'branchId',
    label: t('accounting.journalEntries.columns.branch'),
    value: (row) => (row.branchId ? (branchNameById.value.get(row.branchId) ?? row.branchId) : '—')
  },
  { key: 'financialPeriodName', label: t('accounting.journalEntries.columns.period') },
  {
    key: 'status',
    label: t('accounting.journalEntries.columns.status'),
    type: 'status',
    sortable: true
  }
])
</script>
