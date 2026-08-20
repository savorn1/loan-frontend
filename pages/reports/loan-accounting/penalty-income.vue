<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.loanAccountingReports.penaltyIncome.title')"
      :description="t('accounting.loanAccountingReports.penaltyIncome.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.loanAccountingReportsHeader') },
        { label: t('accounting.loanAccountingReports.penaltyIncome.title') }
      ]"
    />

    <UCard class="mb-6">
      <UFormGroup
        :label="t('accounting.loanAccountingReports.penaltyIncome.financialPeriod')"
        class="max-w-xs"
      >
        <USelectMenu
          v-model="financialPeriodId"
          :options="periodOptions"
          option-attribute="label"
          value-attribute="value"
          :placeholder="
            t('accounting.loanAccountingReports.penaltyIncome.financialPeriodPlaceholder')
          "
        />
      </UFormGroup>
    </UCard>

    <UAlert
      v-if="glAccounts && !account"
      color="red"
      variant="subtle"
      class="mb-4"
      :title="t('accounting.loanAccountingReports.penaltyIncome.accountNotFound')"
    />

    <UCard v-if="ledger" class="mb-6">
      <dl class="grid grid-cols-2 sm:grid-cols-4 gap-y-3 text-sm">
        <dt class="text-gray-500">
          {{ t('accounting.loanAccountingReports.penaltyIncome.openingBalance') }}
        </dt>
        <dd class="font-semibold">{{ formatCurrency(ledger.openingBalance) }}</dd>
        <dt class="text-gray-500">
          {{ t('accounting.loanAccountingReports.penaltyIncome.periodDebit') }}
        </dt>
        <dd>{{ formatCurrency(ledger.periodDebitTotal) }}</dd>
        <dt class="text-gray-500">
          {{ t('accounting.loanAccountingReports.penaltyIncome.periodCredit') }}
        </dt>
        <dd>{{ formatCurrency(ledger.periodCreditTotal) }}</dd>
        <dt class="text-gray-500">
          {{ t('accounting.loanAccountingReports.penaltyIncome.closingBalance') }}
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
            icon="i-heroicons-exclamation-triangle"
            :title="
              financialPeriodId
                ? t('accounting.loanAccountingReports.penaltyIncome.emptyTitleNoActivity')
                : t('accounting.loanAccountingReports.penaltyIncome.emptyTitlePick')
            "
            :description="
              financialPeriodId
                ? t('accounting.loanAccountingReports.penaltyIncome.emptyDescriptionNoActivity')
                : t('accounting.loanAccountingReports.penaltyIncome.emptyDescriptionPick')
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

const { data: periods } = await useAsyncData('penalty-income-periods', () =>
  api<FinancialPeriodResponse[]>('/financial-periods')
)
const periodOptions = computed(() =>
  (periods.value ?? []).map((p) => ({ label: p.periodName, value: p.id }))
)

const { data: glAccounts } = await useAsyncData('penalty-income-gl-accounts', () =>
  api<GlAccountResponse[]>('/gl-accounts')
)
const account = computed(() => (glAccounts.value ?? []).find((a) => a.accountNo === '4030'))

const financialPeriodId = ref<number | undefined>(undefined)

const {
  data: ledger,
  pending,
  error: fetchError
} = await useAsyncData(
  'penalty-income-ledger',
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
    label: t('accounting.loanAccountingReports.penaltyIncome.columns.date'),
    type: 'date'
  },
  { key: 'entryNo', label: t('accounting.loanAccountingReports.penaltyIncome.columns.entryNo') },
  {
    key: 'description',
    label: t('accounting.loanAccountingReports.penaltyIncome.columns.description')
  },
  {
    key: 'entrySide',
    label: t('accounting.loanAccountingReports.penaltyIncome.columns.side'),
    type: 'badge',
    color: (row) => (row.entrySide === 'DEBIT' ? 'orange' : 'teal')
  },
  {
    key: 'amount',
    label: t('accounting.loanAccountingReports.penaltyIncome.columns.amount'),
    type: 'currency'
  },
  {
    key: 'runningBalance',
    label: t('accounting.loanAccountingReports.penaltyIncome.columns.balance'),
    type: 'currency'
  }
])
</script>
