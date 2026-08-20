<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.cashReports.dailySummary.title')"
      :description="t('accounting.cashReports.dailySummary.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.cashReportsHeader') },
        { label: t('accounting.cashReports.dailySummary.title') }
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

    <UAlert
      v-if="glAccounts && !account"
      color="red"
      variant="subtle"
      class="mb-4"
      :title="t('accounting.cashReports.dailySummary.accountNotFound')"
    />

    <UCard>
      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable :rows="dailyRows" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-calendar-days"
            :title="
              hasFullRange
                ? t('accounting.cashReports.dailySummary.emptyTitleNoActivity')
                : t('accounting.cashReports.dailySummary.emptyTitlePick')
            "
            :description="
              hasFullRange
                ? t('accounting.cashReports.dailySummary.emptyDescriptionNoActivity')
                : t('accounting.cashReports.dailySummary.emptyDescriptionPick')
            "
          />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { DateRangeLedgerResponse, GlAccountResponse } from '~/features/accounting/types'
import type { ColumnDef } from '~/shared/types'

interface DailySummaryRow {
  date: string
  receipts: number
  payments: number
  netChange: number
  closingBalance: number
}

const { t } = useI18n()
const api = useApi()

const { data: glAccounts } = await useAsyncData('cash-daily-summary-gl-accounts', () =>
  api<GlAccountResponse[]>('/gl-accounts')
)
const account = computed(() => (glAccounts.value ?? []).find((a) => a.accountNo === '1010'))

const dateFrom = ref('')
const dateTo = ref('')
const hasFullRange = computed(() => !!dateFrom.value && !!dateTo.value)

const {
  data: ledger,
  pending,
  error: fetchError
} = await useAsyncData(
  'cash-daily-summary-ledger',
  () => {
    if (!account.value || !hasFullRange.value) return Promise.resolve(null)
    return api<DateRangeLedgerResponse>(`/gl-accounts/${account.value.id}/ledger-by-date-range`, {
      query: { dateFrom: dateFrom.value, dateTo: dateTo.value }
    })
  },
  { watch: [account, dateFrom, dateTo] }
)

// Cash is a normal-debit account — debits increase the balance, credits decrease it.
const dailyRows = computed<DailySummaryRow[]>(() => {
  if (!ledger.value) return []
  const byDate = new Map<string, { debit: number; credit: number }>()
  for (const line of ledger.value.lines) {
    const date = line.transactionDate.slice(0, 10)
    const entry = byDate.get(date) ?? { debit: 0, credit: 0 }
    if (line.entrySide === 'DEBIT') entry.debit += line.amount
    else entry.credit += line.amount
    byDate.set(date, entry)
  }
  let running = ledger.value.openingBalance
  return [...byDate.keys()].sort().map((date) => {
    const { debit, credit } = byDate.get(date)!
    const netChange = debit - credit
    running += netChange
    return { date, receipts: debit, payments: credit, netChange, closingBalance: running }
  })
})

const columns = computed<ColumnDef<DailySummaryRow>[]>(() => [
  { key: 'date', label: t('accounting.cashReports.dailySummary.columns.date'), type: 'date' },
  {
    key: 'receipts',
    label: t('accounting.cashReports.dailySummary.columns.receipts'),
    type: 'currency'
  },
  {
    key: 'payments',
    label: t('accounting.cashReports.dailySummary.columns.payments'),
    type: 'currency'
  },
  {
    key: 'netChange',
    label: t('accounting.cashReports.dailySummary.columns.netChange'),
    type: 'currency'
  },
  {
    key: 'closingBalance',
    label: t('accounting.cashReports.dailySummary.columns.closingBalance'),
    type: 'currency'
  }
])
</script>
