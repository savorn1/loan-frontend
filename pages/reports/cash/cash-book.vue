<template>
  <div>
    <UButton to="/reports" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      {{ t('admin.reports.title') }}
    </UButton>
    <PageHeader
      :title="t('accounting.cashReports.cashBook.title')"
      :description="t('accounting.cashReports.cashBook.description')"
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
      :title="t('accounting.cashReports.cashBook.accountNotFound')"
    />

    <UCard v-if="ledger" class="mb-6">
      <dl class="grid grid-cols-2 sm:grid-cols-4 gap-y-3 text-sm">
        <dt class="text-gray-500">{{ t('accounting.cashReports.cashBook.openingBalance') }}</dt>
        <dd class="font-semibold">{{ formatCurrency(ledger.openingBalance) }}</dd>
        <dt class="text-gray-500">{{ t('accounting.cashReports.cashBook.periodDebit') }}</dt>
        <dd>{{ formatCurrency(ledger.periodDebitTotal) }}</dd>
        <dt class="text-gray-500">{{ t('accounting.cashReports.cashBook.periodCredit') }}</dt>
        <dd>{{ formatCurrency(ledger.periodCreditTotal) }}</dd>
        <dt class="text-gray-500">{{ t('accounting.cashReports.cashBook.closingBalance') }}</dt>
        <dd class="font-semibold">{{ formatCurrency(ledger.closingBalance) }}</dd>
      </dl>
    </UCard>

    <UCard>
      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable :rows="ledger?.lines ?? []" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-book-open"
            :title="
              hasFullRange
                ? t('accounting.cashReports.cashBook.emptyTitleNoActivity')
                : t('accounting.cashReports.cashBook.emptyTitlePick')
            "
            :description="
              hasFullRange
                ? t('accounting.cashReports.cashBook.emptyDescriptionNoActivity')
                : t('accounting.cashReports.cashBook.emptyDescriptionPick')
            "
          />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type {
  DateRangeLedgerResponse,
  GlAccountResponse,
  LedgerLineResponse
} from '~/features/accounting/types'
import type { ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

const { data: glAccounts } = await useAsyncData('cash-book-gl-accounts', () =>
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
  'cash-book-ledger',
  () => {
    if (!account.value || !hasFullRange.value) return Promise.resolve(null)
    return api<DateRangeLedgerResponse>(`/gl-accounts/${account.value.id}/ledger-by-date-range`, {
      query: { dateFrom: dateFrom.value, dateTo: dateTo.value }
    })
  },
  { watch: [account, dateFrom, dateTo] }
)

const columns = computed<ColumnDef<LedgerLineResponse>[]>(() => [
  {
    key: 'transactionDate',
    label: t('accounting.cashReports.cashBook.columns.date'),
    type: 'date'
  },
  { key: 'entryNo', label: t('accounting.cashReports.cashBook.columns.entryNo') },
  { key: 'description', label: t('accounting.cashReports.cashBook.columns.description') },
  {
    key: 'entrySide',
    label: t('accounting.cashReports.cashBook.columns.side'),
    type: 'badge',
    color: (row) => (row.entrySide === 'DEBIT' ? 'orange' : 'teal')
  },
  { key: 'amount', label: t('accounting.cashReports.cashBook.columns.amount'), type: 'currency' },
  {
    key: 'runningBalance',
    label: t('accounting.cashReports.cashBook.columns.balance'),
    type: 'currency'
  }
])
</script>
