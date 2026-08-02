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
      :title="t('accounting.revenueReports.otherIncome.title')"
      :description="t('accounting.revenueReports.otherIncome.description')"
    />

    <UCard class="mb-6">
      <UFormGroup :label="t('accounting.revenueReports.otherIncome.financialPeriod')" class="max-w-xs">
        <USelectMenu
          v-model="financialPeriodId"
          :options="periodOptions"
          option-attribute="label"
          value-attribute="value"
          :placeholder="t('accounting.revenueReports.otherIncome.financialPeriodPlaceholder')"
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

      <DataTable :rows="rows" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-sparkles"
            :title="emptyTitle"
            :description="emptyDescription"
          />
        </template>
      </DataTable>

      <div
        v-if="rows.length"
        class="flex justify-end pt-4 px-2 text-sm font-semibold border-t border-gray-200 dark:border-gray-800 mt-2"
      >
        <span>{{ t('accounting.revenueReports.otherIncome.totalOtherIncome') }}: {{ formatCurrency(totalOtherIncome) }}</span>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { FinancialPeriodResponse, GeneralLedgerSummaryRow, GlAccountResponse } from '~/features/accounting/types'
import type { ColumnDef } from '~/shared/types'

interface CategoryRow {
  accountNo: string
  accountName: string
  amount: number
}

const NAMED_INCOME_ACCOUNT_NOS = new Set(['4010', '4020', '4030'])

const { t } = useI18n()
const api = useApi()

const { data: periods } = await useAsyncData('other-income-periods', () =>
  api<FinancialPeriodResponse[]>('/financial-periods')
)
const periodOptions = computed(() => (periods.value ?? []).map((p) => ({ label: p.periodName, value: p.id })))

const { data: glAccounts } = await useAsyncData('other-income-gl-accounts', () => api<GlAccountResponse[]>('/gl-accounts'))
const otherIncomeAccountIds = computed(
  () =>
    new Set(
      (glAccounts.value ?? [])
        .filter((a) => a.accountType === 'INCOME' && !NAMED_INCOME_ACCOUNT_NOS.has(a.accountNo))
        .map((a) => a.id)
    )
)
const hasOtherIncomeAccounts = computed(() => otherIncomeAccountIds.value.size > 0)

const financialPeriodId = ref<number | undefined>(undefined)

const {
  data: summaryRows,
  pending,
  error: fetchError
} = await useAsyncData(
  'other-income-summary',
  () => {
    if (!financialPeriodId.value) return Promise.resolve([])
    return api<GeneralLedgerSummaryRow[]>('/gl-accounts/ledger-summary', {
      query: { financialPeriodId: financialPeriodId.value }
    })
  },
  { watch: [financialPeriodId] }
)

const rows = computed<CategoryRow[]>(() =>
  (summaryRows.value ?? [])
    .filter((row) => otherIncomeAccountIds.value.has(row.glAccountId))
    .map((row) => ({
      accountNo: row.accountNo,
      accountName: row.accountName,
      // INCOME is normal-credit — period credit less period debit is the net revenue for this period.
      amount: row.periodCreditTotal - row.periodDebitTotal
    }))
)

const totalOtherIncome = computed(() => rows.value.reduce((sum, r) => sum + r.amount, 0))

const emptyTitle = computed(() => {
  if (!financialPeriodId.value) return t('accounting.revenueReports.otherIncome.emptyTitlePick')
  if (!hasOtherIncomeAccounts.value) return t('accounting.revenueReports.otherIncome.emptyTitleNoAccounts')
  return t('accounting.revenueReports.otherIncome.emptyTitleNoActivity')
})
const emptyDescription = computed(() => {
  if (!financialPeriodId.value) return t('accounting.revenueReports.otherIncome.emptyDescriptionPick')
  if (!hasOtherIncomeAccounts.value) return t('accounting.revenueReports.otherIncome.emptyDescriptionNoAccounts')
  return t('accounting.revenueReports.otherIncome.emptyDescriptionNoActivity')
})

const columns = computed<ColumnDef<CategoryRow>[]>(() => [
  { key: 'accountNo', label: t('accounting.revenueReports.otherIncome.columns.accountNo') },
  { key: 'accountName', label: t('accounting.revenueReports.otherIncome.columns.accountName') },
  { key: 'amount', label: t('accounting.revenueReports.otherIncome.columns.amount'), type: 'currency' }
])
</script>
