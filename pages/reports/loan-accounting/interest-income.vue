<template>
  <div>
    <PageHeader
      :title="t('accounting.loanAccountingReports.interestIncome.title')"
      :description="t('accounting.loanAccountingReports.interestIncome.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.loanAccountingReportsHeader') },
        { label: t('accounting.loanAccountingReports.interestIncome.title') }
      ]"
    />

    <UCard class="mb-6">
      <UFormGroup
        :label="t('accounting.loanAccountingReports.interestIncome.financialPeriod')"
        class="max-w-xs"
      >
        <USelectMenu
          v-model="financialPeriodId"
          :options="periodOptions"
          option-attribute="label"
          value-attribute="value"
          :placeholder="
            t('accounting.loanAccountingReports.interestIncome.financialPeriodPlaceholder')
          "
        />
      </UFormGroup>
    </UCard>

    <UAlert
      v-if="glAccounts && !account"
      color="red"
      variant="subtle"
      class="mb-4"
      :title="t('accounting.loanAccountingReports.interestIncome.accountNotFound')"
    />

    <UCard v-if="ledger" class="mb-6">
      <dl class="grid grid-cols-2 sm:grid-cols-4 gap-y-3 text-sm">
        <dt class="text-gray-500">
          {{ t('accounting.loanAccountingReports.interestIncome.openingBalance') }}
        </dt>
        <dd class="font-semibold">{{ formatCurrency(ledger.openingBalance) }}</dd>
        <dt class="text-gray-500">
          {{ t('accounting.loanAccountingReports.interestIncome.periodDebit') }}
        </dt>
        <dd>{{ formatCurrency(ledger.periodDebitTotal) }}</dd>
        <dt class="text-gray-500">
          {{ t('accounting.loanAccountingReports.interestIncome.periodCredit') }}
        </dt>
        <dd>{{ formatCurrency(ledger.periodCreditTotal) }}</dd>
        <dt class="text-gray-500">
          {{ t('accounting.loanAccountingReports.interestIncome.closingBalance') }}
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
            icon="i-heroicons-chart-bar"
            :title="
              financialPeriodId
                ? t('accounting.loanAccountingReports.interestIncome.emptyTitleNoActivity')
                : t('accounting.loanAccountingReports.interestIncome.emptyTitlePick')
            "
            :description="
              financialPeriodId
                ? t('accounting.loanAccountingReports.interestIncome.emptyDescriptionNoActivity')
                : t('accounting.loanAccountingReports.interestIncome.emptyDescriptionPick')
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

const { data: periods } = await useAsyncData('interest-income-periods', () =>
  api<FinancialPeriodResponse[]>('/financial-periods')
)
const periodOptions = computed(() =>
  (periods.value ?? []).map((p) => ({ label: p.periodName, value: p.id }))
)

const { data: glAccounts } = await useAsyncData('interest-income-gl-accounts', () =>
  api<GlAccountResponse[]>('/gl-accounts')
)
const account = computed(() => (glAccounts.value ?? []).find((a) => a.accountNo === '4010'))

const financialPeriodId = ref<number | undefined>(undefined)

const {
  data: ledger,
  pending,
  error: fetchError
} = await useAsyncData(
  'interest-income-ledger',
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
    label: t('accounting.loanAccountingReports.interestIncome.columns.date'),
    type: 'date'
  },
  { key: 'entryNo', label: t('accounting.loanAccountingReports.interestIncome.columns.entryNo') },
  {
    key: 'description',
    label: t('accounting.loanAccountingReports.interestIncome.columns.description')
  },
  {
    key: 'entrySide',
    label: t('accounting.loanAccountingReports.interestIncome.columns.side'),
    type: 'badge',
    color: (row) => (row.entrySide === 'DEBIT' ? 'orange' : 'teal')
  },
  {
    key: 'amount',
    label: t('accounting.loanAccountingReports.interestIncome.columns.amount'),
    type: 'currency'
  },
  {
    key: 'runningBalance',
    label: t('accounting.loanAccountingReports.interestIncome.columns.balance'),
    type: 'currency'
  }
])
</script>
