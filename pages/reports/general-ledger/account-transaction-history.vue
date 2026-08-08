<template>
  <div>
    <PageHeader
      :title="t('accounting.generalLedgerReports.accountTransactionHistory.title')"
      :description="t('accounting.generalLedgerReports.accountTransactionHistory.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.generalLedgerReportsHeader') },
        { label: t('accounting.generalLedgerReports.accountTransactionHistory.title') }
      ]"
    />

    <UCard class="mb-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormGroup
          :label="t('accounting.generalLedgerReports.accountTransactionHistory.glAccount')"
        >
          <USelectMenu
            v-model="glAccountId"
            :options="glAccountOptions"
            option-attribute="label"
            value-attribute="value"
            :placeholder="
              t('accounting.generalLedgerReports.accountTransactionHistory.glAccountPlaceholder')
            "
          />
        </UFormGroup>
        <UFormGroup
          :label="t('common.dateRangeFilter.from') + ' – ' + t('common.dateRangeFilter.to')"
        >
          <DateRangeFilter v-model:from="dateFrom" v-model:to="dateTo" />
        </UFormGroup>
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

      <DataTable :rows="ledger?.lines ?? []" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-clock"
            :title="
              glAccountId
                ? t(
                    'accounting.generalLedgerReports.accountTransactionHistory.emptyTitleNoActivity'
                  )
                : t('accounting.generalLedgerReports.accountTransactionHistory.emptyTitlePick')
            "
            :description="
              glAccountId
                ? t(
                    'accounting.generalLedgerReports.accountTransactionHistory.emptyDescriptionNoActivity'
                  )
                : t(
                    'accounting.generalLedgerReports.accountTransactionHistory.emptyDescriptionPick'
                  )
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

const { data: glAccounts } = await useAsyncData('account-transaction-history-gl-accounts', () =>
  api<GlAccountResponse[]>('/gl-accounts')
)
const glAccountOptions = computed(() =>
  (glAccounts.value ?? []).map((a) => ({ label: `${a.accountNo} — ${a.accountName}`, value: a.id }))
)

const glAccountId = ref<number | undefined>(undefined)
const dateFrom = ref('')
const dateTo = ref('')

const {
  data: ledger,
  pending,
  error: fetchError
} = await useAsyncData(
  'account-transaction-history-report',
  () => {
    if (!glAccountId.value) return Promise.resolve(null)
    return api<DateRangeLedgerResponse>(`/gl-accounts/${glAccountId.value}/ledger-by-date-range`, {
      query: { dateFrom: dateFrom.value || undefined, dateTo: dateTo.value || undefined }
    })
  },
  { watch: [glAccountId, dateFrom, dateTo] }
)

const columns = computed<ColumnDef<LedgerLineResponse>[]>(() => [
  {
    key: 'transactionDate',
    label: t('accounting.generalLedgerReports.accountTransactionHistory.columns.date'),
    type: 'date'
  },
  {
    key: 'entryNo',
    label: t('accounting.generalLedgerReports.accountTransactionHistory.columns.entryNo')
  },
  {
    key: 'description',
    label: t('accounting.generalLedgerReports.accountTransactionHistory.columns.description')
  },
  {
    key: 'entrySide',
    label: t('accounting.generalLedgerReports.accountTransactionHistory.columns.side'),
    type: 'badge',
    color: (row) => (row.entrySide === 'DEBIT' ? 'orange' : 'teal')
  },
  {
    key: 'amount',
    label: t('accounting.generalLedgerReports.accountTransactionHistory.columns.amount'),
    type: 'currency'
  },
  {
    key: 'runningBalance',
    label: t('accounting.generalLedgerReports.accountTransactionHistory.columns.balance'),
    type: 'currency'
  }
])
</script>
