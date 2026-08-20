<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.financialStatements.balanceSheet.title')"
      :description="t('accounting.financialStatements.balanceSheet.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.financialStatementsHeader') },
        { label: t('accounting.financialStatements.balanceSheet.title') }
      ]"
    />

    <UCard class="mb-6">
      <UFormGroup
        :label="t('accounting.financialStatements.balanceSheet.financialPeriod')"
        class="max-w-xs"
      >
        <USelectMenu
          v-model="financialPeriodId"
          :options="periodOptions"
          option-attribute="label"
          value-attribute="value"
          :placeholder="t('accounting.financialStatements.balanceSheet.financialPeriodPlaceholder')"
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
          icon="i-heroicons-scale"
          :title="t('accounting.financialStatements.balanceSheet.emptyTitlePick')"
          :description="t('accounting.financialStatements.balanceSheet.emptyDescriptionPick')"
        />
      </UCard>
    </template>
    <template v-else-if="!pending && !hasAnyActivity">
      <UCard>
        <EmptyState
          icon="i-heroicons-scale"
          :title="t('accounting.financialStatements.balanceSheet.emptyTitleNoActivity')"
          :description="t('accounting.financialStatements.balanceSheet.emptyDescriptionNoActivity')"
        />
      </UCard>
    </template>
    <template v-else>
      <UCard class="mb-6">
        <template #header>
          <span class="font-semibold">{{
            t('accounting.financialStatements.balanceSheet.assets')
          }}</span>
        </template>
        <DataTable :rows="assetRows" :columns="columns" :loading="pending" :exportable="false" />
        <div
          class="flex justify-end pt-4 px-2 text-sm font-semibold border-t border-gray-200 dark:border-gray-800 mt-2"
        >
          <span
            >{{ t('accounting.financialStatements.balanceSheet.totalAssets') }}:
            {{ formatCurrency(totalAssets) }}</span
          >
        </div>
      </UCard>

      <UCard class="mb-6">
        <template #header>
          <span class="font-semibold">{{
            t('accounting.financialStatements.balanceSheet.liabilities')
          }}</span>
        </template>
        <DataTable
          :rows="liabilityRows"
          :columns="columns"
          :loading="pending"
          :exportable="false"
        />
        <div
          class="flex justify-end pt-4 px-2 text-sm font-semibold border-t border-gray-200 dark:border-gray-800 mt-2"
        >
          <span
            >{{ t('accounting.financialStatements.balanceSheet.totalLiabilities') }}:
            {{ formatCurrency(totalLiabilities) }}</span
          >
        </div>
      </UCard>

      <UCard class="mb-6">
        <template #header>
          <span class="font-semibold">{{
            t('accounting.financialStatements.balanceSheet.equity')
          }}</span>
        </template>
        <DataTable
          :rows="equityRowsWithRetainedEarnings"
          :columns="columns"
          :loading="pending"
          :exportable="false"
        />
        <p class="text-xs text-gray-500 mt-3">
          {{ t('accounting.financialStatements.balanceSheet.retainedEarningsNote') }}
        </p>
        <div
          class="flex justify-end pt-4 px-2 text-sm font-semibold border-t border-gray-200 dark:border-gray-800 mt-2"
        >
          <span
            >{{ t('accounting.financialStatements.balanceSheet.totalEquity') }}:
            {{ formatCurrency(totalEquityWithRetainedEarnings) }}</span
          >
        </div>
      </UCard>

      <UCard>
        <dl class="grid grid-cols-2 gap-y-3 text-sm">
          <dt class="text-gray-500">
            {{ t('accounting.financialStatements.balanceSheet.totalAssets') }}
          </dt>
          <dd class="font-semibold text-right">{{ formatCurrency(totalAssets) }}</dd>
          <dt class="text-gray-500">
            {{ t('accounting.financialStatements.balanceSheet.totalLiabilitiesAndEquity') }}
          </dt>
          <dd class="font-semibold text-right">
            {{ formatCurrency(totalLiabilities + totalEquityWithRetainedEarnings) }}
          </dd>
        </dl>
        <div
          class="pt-3 mt-3 border-t border-gray-200 dark:border-gray-800 text-right text-sm font-semibold"
        >
          <span :class="isBalanced ? 'text-teal-600 dark:text-teal-400' : 'text-red-500'">
            {{
              isBalanced
                ? t('accounting.financialStatements.balanceSheet.balanced')
                : t('accounting.financialStatements.balanceSheet.outOfBalance')
            }}
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

const { t } = useI18n()
const api = useApi()

const { data: periods } = await useAsyncData('balance-sheet-periods', () =>
  api<FinancialPeriodResponse[]>('/financial-periods')
)
const periodOptions = computed(() =>
  (periods.value ?? []).map((p) => ({ label: p.periodName, value: p.id }))
)

const { data: glAccounts } = await useAsyncData('balance-sheet-gl-accounts', () =>
  api<GlAccountResponse[]>('/gl-accounts')
)
const glAccountById = computed(() => new Map((glAccounts.value ?? []).map((a) => [a.id, a])))

const financialPeriodId = ref<number | undefined>(undefined)

const {
  data: summaryRows,
  pending,
  error: fetchError
} = await useAsyncData(
  'balance-sheet-summary',
  () => {
    if (!financialPeriodId.value) return Promise.resolve([])
    return api<GeneralLedgerSummaryRow[]>('/gl-accounts/ledger-summary', {
      query: { financialPeriodId: financialPeriodId.value }
    })
  },
  { watch: [financialPeriodId] }
)

function rowsForType(type: string) {
  return (summaryRows.value ?? []).filter(
    (row) => glAccountById.value.get(row.glAccountId)?.accountType === type
  )
}

const assetRows = computed(() => rowsForType('ASSET'))
const liabilityRows = computed(() => rowsForType('LIABILITY'))
const equityRows = computed(() => rowsForType('EQUITY'))
const incomeRows = computed(() => rowsForType('INCOME'))
const expenseRows = computed(() => rowsForType('EXPENSE'))

const totalAssets = computed(() => assetRows.value.reduce((sum, r) => sum + r.closingBalance, 0))
const totalLiabilities = computed(() =>
  liabilityRows.value.reduce((sum, r) => sum + r.closingBalance, 0)
)
const totalEquity = computed(() => equityRows.value.reduce((sum, r) => sum + r.closingBalance, 0))

// Income/expense closingBalance is cumulative since account inception (this system never
// posts period-close entries to zero them into retained earnings) — so summing it directly
// gives cumulative net income to date, which is exactly the plug the balance sheet needs.
const retainedEarnings = computed(
  () =>
    incomeRows.value.reduce((sum, r) => sum + r.closingBalance, 0) -
    expenseRows.value.reduce((sum, r) => sum + r.closingBalance, 0)
)
const totalEquityWithRetainedEarnings = computed(() => totalEquity.value + retainedEarnings.value)

const equityRowsWithRetainedEarnings = computed(() => [
  ...equityRows.value,
  {
    glAccountId: -1,
    accountNo: '—',
    accountName: t('accounting.financialStatements.balanceSheet.retainedEarningsLabel'),
    openingBalance: 0,
    periodDebitTotal: 0,
    periodCreditTotal: 0,
    closingBalance: retainedEarnings.value
  } satisfies GeneralLedgerSummaryRow
])

const hasAnyActivity = computed(() => (summaryRows.value ?? []).length > 0)
const isBalanced = computed(
  () =>
    Math.abs(totalAssets.value - (totalLiabilities.value + totalEquityWithRetainedEarnings.value)) <
    0.005
)

const columns = computed<ColumnDef<GeneralLedgerSummaryRow>[]>(() => [
  { key: 'accountNo', label: t('accounting.financialStatements.balanceSheet.columns.accountNo') },
  {
    key: 'accountName',
    label: t('accounting.financialStatements.balanceSheet.columns.accountName')
  },
  {
    key: 'closingBalance',
    label: t('accounting.financialStatements.balanceSheet.columns.balance'),
    type: 'currency'
  }
])
</script>
