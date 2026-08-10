<template>
  <div>
    <UButton to="/reports" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      {{ t('admin.reports.backToReports') }}
    </UButton>
    <PageHeader
      :title="t('accounting.financialStatements.incomeStatement.title')"
      :description="t('accounting.financialStatements.incomeStatement.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.financialStatementsHeader') },
        { label: t('accounting.financialStatements.incomeStatement.title') }
      ]"
    />

    <UCard class="mb-6">
      <UFormGroup
        :label="t('accounting.financialStatements.incomeStatement.financialPeriod')"
        class="max-w-xs"
      >
        <USelectMenu
          v-model="financialPeriodId"
          :options="periodOptions"
          option-attribute="label"
          value-attribute="value"
          :placeholder="
            t('accounting.financialStatements.incomeStatement.financialPeriodPlaceholder')
          "
        />
      </UFormGroup>
    </UCard>

    <UAlert
      v-if="fetchError"
      color="red"
      variant="subtle"
      class="mb-4"
      :title="apiErrorMessage(fetchError)"
    />

    <template v-if="!financialPeriodId">
      <UCard>
        <EmptyState
          icon="i-heroicons-chart-bar"
          :title="t('accounting.financialStatements.incomeStatement.emptyTitlePick')"
          :description="t('accounting.financialStatements.incomeStatement.emptyDescriptionPick')"
        />
      </UCard>
    </template>
    <template v-else-if="!pending && !hasAnyActivity">
      <UCard>
        <EmptyState
          icon="i-heroicons-chart-bar"
          :title="t('accounting.financialStatements.incomeStatement.emptyTitleNoActivity')"
          :description="
            t('accounting.financialStatements.incomeStatement.emptyDescriptionNoActivity')
          "
        />
      </UCard>
    </template>
    <template v-else>
      <UCard class="mb-6">
        <template #header>
          <span class="font-semibold">{{
            t('accounting.financialStatements.incomeStatement.income')
          }}</span>
        </template>
        <DataTable :rows="incomeLines" :columns="columns" :loading="pending" :exportable="false" />
        <div
          class="flex justify-end pt-4 px-2 text-sm font-semibold border-t border-gray-200 dark:border-gray-800 mt-2"
        >
          <span
            >{{ t('accounting.financialStatements.incomeStatement.totalIncome') }}:
            {{ formatCurrency(totalIncome) }}</span
          >
        </div>
      </UCard>

      <UCard class="mb-6">
        <template #header>
          <span class="font-semibold">{{
            t('accounting.financialStatements.incomeStatement.expenses')
          }}</span>
        </template>
        <DataTable :rows="expenseLines" :columns="columns" :loading="pending" :exportable="false" />
        <div
          class="flex justify-end pt-4 px-2 text-sm font-semibold border-t border-gray-200 dark:border-gray-800 mt-2"
        >
          <span
            >{{ t('accounting.financialStatements.incomeStatement.totalExpenses') }}:
            {{ formatCurrency(totalExpenses) }}</span
          >
        </div>
      </UCard>

      <UCard>
        <div class="flex justify-end text-base font-bold">
          <span :class="netIncome >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-red-500'">
            {{
              netIncome >= 0
                ? t('accounting.financialStatements.incomeStatement.netIncome')
                : t('accounting.financialStatements.incomeStatement.netLoss')
            }}:
            {{ formatCurrency(Math.abs(netIncome)) }}
          </span>
        </div>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type {
  FinancialPeriodResponse,
  GeneralLedgerSummaryRow,
  GlAccountResponse
} from '~/features/accounting/types'
import type { ColumnDef } from '~/shared/types'

interface StatementLine {
  accountNo: string
  accountName: string
  amount: number
}

const { t } = useI18n()
const api = useApi()

const { data: periods } = await useAsyncData('income-statement-periods', () =>
  api<FinancialPeriodResponse[]>('/financial-periods')
)
const periodOptions = computed(() =>
  (periods.value ?? []).map((p) => ({ label: p.periodName, value: p.id }))
)

const { data: glAccounts } = await useAsyncData('income-statement-gl-accounts', () =>
  api<GlAccountResponse[]>('/gl-accounts')
)
const glAccountById = computed(() => new Map((glAccounts.value ?? []).map((a) => [a.id, a])))

const financialPeriodId = ref<number | undefined>(undefined)

const {
  data: summaryRows,
  pending,
  error: fetchError
} = await useAsyncData(
  'income-statement-summary',
  () => {
    if (!financialPeriodId.value) return Promise.resolve([])
    return api<GeneralLedgerSummaryRow[]>('/gl-accounts/ledger-summary', {
      query: { financialPeriodId: financialPeriodId.value }
    })
  },
  { watch: [financialPeriodId] }
)

// Unlike the Balance Sheet, this must use this period's own debit/credit totals — not
// closingBalance, which is cumulative since the account's inception (see balance-sheet.vue).
const incomeLines = computed<StatementLine[]>(() =>
  (summaryRows.value ?? [])
    .filter((row) => glAccountById.value.get(row.glAccountId)?.accountType === 'INCOME')
    .map((row) => ({
      accountNo: row.accountNo,
      accountName: row.accountName,
      amount: row.periodCreditTotal - row.periodDebitTotal
    }))
)
const expenseLines = computed<StatementLine[]>(() =>
  (summaryRows.value ?? [])
    .filter((row) => glAccountById.value.get(row.glAccountId)?.accountType === 'EXPENSE')
    .map((row) => ({
      accountNo: row.accountNo,
      accountName: row.accountName,
      amount: row.periodDebitTotal - row.periodCreditTotal
    }))
)

const totalIncome = computed(() => incomeLines.value.reduce((sum, r) => sum + r.amount, 0))
const totalExpenses = computed(() => expenseLines.value.reduce((sum, r) => sum + r.amount, 0))
const netIncome = computed(() => totalIncome.value - totalExpenses.value)

const hasAnyActivity = computed(() => incomeLines.value.length > 0 || expenseLines.value.length > 0)

const columns = computed<ColumnDef<StatementLine>[]>(() => [
  {
    key: 'accountNo',
    label: t('accounting.financialStatements.incomeStatement.columns.accountNo')
  },
  {
    key: 'accountName',
    label: t('accounting.financialStatements.incomeStatement.columns.accountName')
  },
  {
    key: 'amount',
    label: t('accounting.financialStatements.incomeStatement.columns.amount'),
    type: 'currency'
  }
])
</script>
