<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.expenseReports.operatingExpenses.title')"
      :description="t('accounting.expenseReports.operatingExpenses.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.expenseReportsHeader') },
        { label: t('accounting.expenseReports.operatingExpenses.title') }
      ]"
    />

    <UCard class="mb-6">
      <UFormGroup
        :label="t('accounting.expenseReports.operatingExpenses.financialPeriod')"
        class="max-w-xs"
      >
        <USelectMenu
          v-model="financialPeriodId"
          :options="periodOptions"
          option-attribute="label"
          value-attribute="value"
          :placeholder="t('accounting.expenseReports.operatingExpenses.financialPeriodPlaceholder')"
        />
      </UFormGroup>
    </UCard>

    <UAlert
      v-if="glAccounts && !account"
      color="red"
      variant="subtle"
      class="mb-4"
      :title="t('accounting.expenseReports.operatingExpenses.accountNotFound')"
    />

    <UCard v-if="ledger" class="mb-6">
      <dl class="grid grid-cols-2 sm:grid-cols-4 gap-y-3 text-sm">
        <dt class="text-gray-500">
          {{ t('accounting.expenseReports.operatingExpenses.openingBalance') }}
        </dt>
        <dd class="font-semibold">{{ formatCurrency(ledger.openingBalance) }}</dd>
        <dt class="text-gray-500">
          {{ t('accounting.expenseReports.operatingExpenses.periodDebit') }}
        </dt>
        <dd>{{ formatCurrency(ledger.periodDebitTotal) }}</dd>
        <dt class="text-gray-500">
          {{ t('accounting.expenseReports.operatingExpenses.periodCredit') }}
        </dt>
        <dd>{{ formatCurrency(ledger.periodCreditTotal) }}</dd>
        <dt class="text-gray-500">
          {{ t('accounting.expenseReports.operatingExpenses.closingBalance') }}
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
            icon="i-heroicons-receipt-percent"
            :title="
              financialPeriodId
                ? t('accounting.expenseReports.operatingExpenses.emptyTitleNoActivity')
                : t('accounting.expenseReports.operatingExpenses.emptyTitlePick')
            "
            :description="
              financialPeriodId
                ? t('accounting.expenseReports.operatingExpenses.emptyDescriptionNoActivity')
                : t('accounting.expenseReports.operatingExpenses.emptyDescriptionPick')
            "
          />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type {
  FinancialPeriodResponse,
  GeneralLedgerResponse,
  GlAccountResponse,
  LedgerLineResponse
} from '~/features/accounting/types'
import type { ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

const { data: periods } = await useAsyncData('operating-expenses-periods', () =>
  api<FinancialPeriodResponse[]>('/financial-periods')
)
const periodOptions = computed(() =>
  (periods.value ?? []).map((p) => ({ label: p.periodName, value: p.id }))
)

const { data: glAccounts } = await useAsyncData('operating-expenses-gl-accounts', () =>
  api<GlAccountResponse[]>('/gl-accounts')
)
const account = computed(() => (glAccounts.value ?? []).find((a) => a.accountNo === '5020'))

const financialPeriodId = ref<number | undefined>(undefined)

const {
  data: ledger,
  pending,
  error: fetchError
} = await useAsyncData(
  'operating-expenses-ledger',
  () => {
    if (!account.value || !financialPeriodId.value) return Promise.resolve(null)
    return api<GeneralLedgerResponse>(`/gl-accounts/${account.value.id}/ledger`, {
      query: { financialPeriodId: financialPeriodId.value }
    })
  },
  { watch: [account, financialPeriodId] }
)

const columns = computed<ColumnDef<LedgerLineResponse>[]>(() => [
  {
    key: 'transactionDate',
    label: t('accounting.expenseReports.operatingExpenses.columns.date'),
    type: 'date'
  },
  { key: 'entryNo', label: t('accounting.expenseReports.operatingExpenses.columns.entryNo') },
  {
    key: 'description',
    label: t('accounting.expenseReports.operatingExpenses.columns.description')
  },
  {
    key: 'entrySide',
    label: t('accounting.expenseReports.operatingExpenses.columns.side'),
    type: 'badge',
    color: (row) => (row.entrySide === 'DEBIT' ? 'orange' : 'teal')
  },
  {
    key: 'amount',
    label: t('accounting.expenseReports.operatingExpenses.columns.amount'),
    type: 'currency'
  },
  {
    key: 'runningBalance',
    label: t('accounting.expenseReports.operatingExpenses.columns.balance'),
    type: 'currency'
  }
])
</script>
