<template>
  <div>
    <UButton to="/reports" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      {{ t('admin.reports.backToReports') }}
    </UButton>
    <PageHeader
      :title="t('accounting.generalLedgerReports.ledgerByDateRange.title')"
      :description="t('accounting.generalLedgerReports.ledgerByDateRange.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.generalLedgerReportsHeader') },
        { label: t('accounting.generalLedgerReports.ledgerByDateRange.title') }
      ]"
    />

    <UCard class="mb-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormGroup :label="t('accounting.generalLedgerReports.ledgerByDateRange.glAccount')">
          <USelectMenu
            v-model="glAccountId"
            :options="glAccountOptions"
            option-attribute="label"
            value-attribute="value"
            :placeholder="
              t('accounting.generalLedgerReports.ledgerByDateRange.glAccountPlaceholder')
            "
          />
        </UFormGroup>
        <UFormGroup
          :label="t('common.dateRangeFilter.from') + ' – ' + t('common.dateRangeFilter.to')"
        >
          <DateRangeFilter v-model:from="dateFrom" v-model:to="dateTo" />
        </UFormGroup>
      </div>
      <p v-if="glAccountId && !hasFullRange" class="text-xs text-gray-500 mt-2">
        {{ t('accounting.generalLedgerReports.ledgerByDateRange.dateRangeRequired') }}
      </p>
    </UCard>

    <UCard v-if="ledger" class="mb-6">
      <dl class="grid grid-cols-2 sm:grid-cols-4 gap-y-3 text-sm">
        <dt class="text-gray-500">
          {{ t('accounting.generalLedgerReports.ledgerByDateRange.openingBalance') }}
        </dt>
        <dd class="font-semibold">{{ formatCurrency(ledger.openingBalance) }}</dd>
        <dt class="text-gray-500">
          {{ t('accounting.generalLedgerReports.ledgerByDateRange.periodDebit') }}
        </dt>
        <dd>{{ formatCurrency(ledger.periodDebitTotal) }}</dd>
        <dt class="text-gray-500">
          {{ t('accounting.generalLedgerReports.ledgerByDateRange.periodCredit') }}
        </dt>
        <dd>{{ formatCurrency(ledger.periodCreditTotal) }}</dd>
        <dt class="text-gray-500">
          {{ t('accounting.generalLedgerReports.ledgerByDateRange.closingBalance') }}
        </dt>
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
            icon="i-heroicons-calendar-days"
            :title="
              glAccountId && hasFullRange
                ? t('accounting.generalLedgerReports.ledgerByDateRange.emptyTitleNoActivity')
                : t('accounting.generalLedgerReports.ledgerByDateRange.emptyTitlePick')
            "
            :description="
              glAccountId && hasFullRange
                ? t('accounting.generalLedgerReports.ledgerByDateRange.emptyDescriptionNoActivity')
                : t('accounting.generalLedgerReports.ledgerByDateRange.emptyDescriptionPick')
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

const { data: glAccounts } = await useAsyncData('ledger-by-date-range-gl-accounts', () =>
  api<GlAccountResponse[]>('/gl-accounts')
)
const glAccountOptions = computed(() =>
  (glAccounts.value ?? []).map((a) => ({ label: `${a.accountNo} — ${a.accountName}`, value: a.id }))
)

const glAccountId = ref<number | undefined>(undefined)
const dateFrom = ref('')
const dateTo = ref('')
const hasFullRange = computed(() => !!dateFrom.value && !!dateTo.value)

const {
  data: ledger,
  pending,
  error: fetchError
} = await useAsyncData(
  'ledger-by-date-range-report',
  () => {
    if (!glAccountId.value || !hasFullRange.value) return Promise.resolve(null)
    return api<DateRangeLedgerResponse>(`/gl-accounts/${glAccountId.value}/ledger-by-date-range`, {
      query: { dateFrom: dateFrom.value, dateTo: dateTo.value }
    })
  },
  { watch: [glAccountId, dateFrom, dateTo] }
)

const columns = computed<ColumnDef<LedgerLineResponse>[]>(() => [
  {
    key: 'transactionDate',
    label: t('accounting.generalLedgerReports.ledgerByDateRange.columns.date'),
    type: 'date'
  },
  { key: 'entryNo', label: t('accounting.generalLedgerReports.ledgerByDateRange.columns.entryNo') },
  {
    key: 'description',
    label: t('accounting.generalLedgerReports.ledgerByDateRange.columns.description')
  },
  {
    key: 'entrySide',
    label: t('accounting.generalLedgerReports.ledgerByDateRange.columns.side'),
    type: 'badge',
    color: (row) => (row.entrySide === 'DEBIT' ? 'orange' : 'teal')
  },
  {
    key: 'amount',
    label: t('accounting.generalLedgerReports.ledgerByDateRange.columns.amount'),
    type: 'currency'
  },
  {
    key: 'runningBalance',
    label: t('accounting.generalLedgerReports.ledgerByDateRange.columns.balance'),
    type: 'currency'
  }
])
</script>
