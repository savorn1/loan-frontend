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
      :title="t('accounting.financialStatements.changesInEquity.title')"
      :description="t('accounting.financialStatements.changesInEquity.description')"
    />

    <UCard class="mb-6">
      <UFormGroup :label="t('accounting.financialStatements.changesInEquity.financialPeriod')" class="max-w-xs">
        <USelectMenu
          v-model="financialPeriodId"
          :options="periodOptions"
          option-attribute="label"
          value-attribute="value"
          :placeholder="t('accounting.financialStatements.changesInEquity.financialPeriodPlaceholder')"
        />
      </UFormGroup>
    </UCard>

    <UCard>
      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable :rows="equityRows" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-arrow-trending-up"
            :title="
              financialPeriodId
                ? t('accounting.financialStatements.changesInEquity.emptyTitleNoActivity')
                : t('accounting.financialStatements.changesInEquity.emptyTitlePick')
            "
            :description="
              financialPeriodId
                ? t('accounting.financialStatements.changesInEquity.emptyDescriptionNoActivity')
                : t('accounting.financialStatements.changesInEquity.emptyDescriptionPick')
            "
          />
        </template>
      </DataTable>

      <p v-if="financialPeriodId && equityRows.length" class="text-sm text-gray-500 pt-4 px-2 border-t border-gray-200 dark:border-gray-800 mt-2">
        {{ t('accounting.financialStatements.changesInEquity.netIncomeReference') }}:
        <span class="font-semibold text-gray-900 dark:text-white">{{ formatCurrency(netIncome) }}</span>
      </p>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { FinancialPeriodResponse, GeneralLedgerSummaryRow, GlAccountResponse } from '~/features/accounting/types'
import type { ColumnDef } from '~/shared/types'

interface EquityChangeRow {
  accountNo: string
  accountName: string
  openingBalance: number
  movement: number
  closingBalance: number
}

const { t } = useI18n()
const api = useApi()

const { data: periods } = await useAsyncData('changes-in-equity-periods', () =>
  api<FinancialPeriodResponse[]>('/financial-periods')
)
const periodOptions = computed(() =>
  (periods.value ?? []).map((p) => ({ label: p.periodName, value: p.id }))
)

const { data: glAccounts } = await useAsyncData('changes-in-equity-gl-accounts', () =>
  api<GlAccountResponse[]>('/gl-accounts')
)
const glAccountById = computed(() => new Map((glAccounts.value ?? []).map((a) => [a.id, a])))

const financialPeriodId = ref<number | undefined>(undefined)

const {
  data: summaryRows,
  pending,
  error: fetchError
} = await useAsyncData(
  'changes-in-equity-summary',
  () => {
    if (!financialPeriodId.value) return Promise.resolve([])
    return api<GeneralLedgerSummaryRow[]>('/gl-accounts/ledger-summary', {
      query: { financialPeriodId: financialPeriodId.value }
    })
  },
  { watch: [financialPeriodId] }
)

const equityRows = computed<EquityChangeRow[]>(() =>
  (summaryRows.value ?? [])
    .filter((row) => glAccountById.value.get(row.glAccountId)?.accountType === 'EQUITY')
    .map((row) => ({
      accountNo: row.accountNo,
      accountName: row.accountName,
      openingBalance: row.openingBalance,
      movement: row.closingBalance - row.openingBalance,
      closingBalance: row.closingBalance
    }))
)

// Reference only — this system has no period-close process posting net income into an
// equity account, so it's shown separately rather than folded into the movements above.
const netIncome = computed(() => {
  const incomeTotal = (summaryRows.value ?? [])
    .filter((row) => glAccountById.value.get(row.glAccountId)?.accountType === 'INCOME')
    .reduce((sum, r) => sum + (r.periodCreditTotal - r.periodDebitTotal), 0)
  const expenseTotal = (summaryRows.value ?? [])
    .filter((row) => glAccountById.value.get(row.glAccountId)?.accountType === 'EXPENSE')
    .reduce((sum, r) => sum + (r.periodDebitTotal - r.periodCreditTotal), 0)
  return incomeTotal - expenseTotal
})

const columns = computed<ColumnDef<EquityChangeRow>[]>(() => [
  { key: 'accountNo', label: t('accounting.financialStatements.changesInEquity.columns.accountNo') },
  { key: 'accountName', label: t('accounting.financialStatements.changesInEquity.columns.accountName') },
  { key: 'openingBalance', label: t('accounting.financialStatements.changesInEquity.columns.opening'), type: 'currency' },
  { key: 'movement', label: t('accounting.financialStatements.changesInEquity.columns.movement'), type: 'currency' },
  { key: 'closingBalance', label: t('accounting.financialStatements.changesInEquity.columns.closing'), type: 'currency' }
])
</script>
