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
      :title="t('accounting.cashReports.receipts.title')"
      :description="t('accounting.cashReports.receipts.description')"
    />

    <UCard class="mb-6">
      <UFormGroup :label="t('common.dateRangeFilter.from') + ' – ' + t('common.dateRangeFilter.to')" class="max-w-xs">
        <DateRangeFilter v-model:from="dateFrom" v-model:to="dateTo" />
      </UFormGroup>
    </UCard>

    <UAlert
      v-if="glAccounts && !account"
      color="red"
      variant="subtle"
      class="mb-4"
      :title="t('accounting.cashReports.receipts.accountNotFound')"
    />

    <UCard v-if="ledger" class="mb-6">
      <div class="flex justify-end text-sm font-semibold">
        <span>{{ t('accounting.cashReports.receipts.totalReceipts') }}: {{ formatCurrency(ledger.periodDebitTotal) }}</span>
      </div>
    </UCard>

    <UCard>
      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable :rows="receiptLines" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-arrow-down-circle"
            :title="
              hasFullRange
                ? t('accounting.cashReports.receipts.emptyTitleNoActivity')
                : t('accounting.cashReports.receipts.emptyTitlePick')
            "
            :description="
              hasFullRange
                ? t('accounting.cashReports.receipts.emptyDescriptionNoActivity')
                : t('accounting.cashReports.receipts.emptyDescriptionPick')
            "
          />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { DateRangeLedgerResponse, GlAccountResponse, LedgerLineResponse } from '~/features/accounting/types'
import type { ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

const { data: glAccounts } = await useAsyncData('cash-receipts-gl-accounts', () => api<GlAccountResponse[]>('/gl-accounts'))
const account = computed(() => (glAccounts.value ?? []).find((a) => a.accountNo === '1010'))

const dateFrom = ref('')
const dateTo = ref('')
const hasFullRange = computed(() => !!dateFrom.value && !!dateTo.value)

const {
  data: ledger,
  pending,
  error: fetchError
} = await useAsyncData(
  'cash-receipts-ledger',
  () => {
    if (!account.value || !hasFullRange.value) return Promise.resolve(null)
    return api<DateRangeLedgerResponse>(`/gl-accounts/${account.value.id}/ledger-by-date-range`, {
      query: { dateFrom: dateFrom.value, dateTo: dateTo.value }
    })
  },
  { watch: [account, dateFrom, dateTo] }
)

// Cash is a normal-debit account — a debit posting is a receipt (cash coming in).
const receiptLines = computed(() => (ledger.value?.lines ?? []).filter((line) => line.entrySide === 'DEBIT'))

const columns = computed<ColumnDef<LedgerLineResponse>[]>(() => [
  { key: 'transactionDate', label: t('accounting.cashReports.receipts.columns.date'), type: 'date' },
  { key: 'entryNo', label: t('accounting.cashReports.receipts.columns.entryNo') },
  { key: 'description', label: t('accounting.cashReports.receipts.columns.description') },
  { key: 'amount', label: t('accounting.cashReports.receipts.columns.amount'), type: 'currency' }
])
</script>
