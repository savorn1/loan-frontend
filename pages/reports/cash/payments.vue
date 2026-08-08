<template>
  <div>
    <PageHeader
      :title="t('accounting.cashReports.payments.title')"
      :description="t('accounting.cashReports.payments.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.cashReportsHeader') },
        { label: t('accounting.cashReports.payments.title') }
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
      :title="t('accounting.cashReports.payments.accountNotFound')"
    />

    <UCard v-if="ledger" class="mb-6">
      <div class="flex justify-end text-sm font-semibold">
        <span
          >{{ t('accounting.cashReports.payments.totalPayments') }}:
          {{ formatCurrency(ledger.periodCreditTotal) }}</span
        >
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

      <DataTable :rows="paymentLines" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-arrow-up-circle"
            :title="
              hasFullRange
                ? t('accounting.cashReports.payments.emptyTitleNoActivity')
                : t('accounting.cashReports.payments.emptyTitlePick')
            "
            :description="
              hasFullRange
                ? t('accounting.cashReports.payments.emptyDescriptionNoActivity')
                : t('accounting.cashReports.payments.emptyDescriptionPick')
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

const { data: glAccounts } = await useAsyncData('cash-payments-gl-accounts', () =>
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
  'cash-payments-ledger',
  () => {
    if (!account.value || !hasFullRange.value) return Promise.resolve(null)
    return api<DateRangeLedgerResponse>(`/gl-accounts/${account.value.id}/ledger-by-date-range`, {
      query: { dateFrom: dateFrom.value, dateTo: dateTo.value }
    })
  },
  { watch: [account, dateFrom, dateTo] }
)

// Cash is a normal-debit account — a credit posting is a payment (cash going out).
const paymentLines = computed(() =>
  (ledger.value?.lines ?? []).filter((line) => line.entrySide === 'CREDIT')
)

const columns = computed<ColumnDef<LedgerLineResponse>[]>(() => [
  {
    key: 'transactionDate',
    label: t('accounting.cashReports.payments.columns.date'),
    type: 'date'
  },
  { key: 'entryNo', label: t('accounting.cashReports.payments.columns.entryNo') },
  { key: 'description', label: t('accounting.cashReports.payments.columns.description') },
  { key: 'amount', label: t('accounting.cashReports.payments.columns.amount'), type: 'currency' }
])
</script>
