<template>
  <div>
    <UButton to="/reports" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      {{ t('admin.reports.title') }}
    </UButton>
    <PageHeader
      :title="t('accounting.expenseReports.byCategory.title')"
      :description="t('accounting.expenseReports.byCategory.description')"
    />

    <UCard class="mb-6">
      <UFormGroup
        :label="t('accounting.expenseReports.byCategory.financialPeriod')"
        class="max-w-xs"
      >
        <USelectMenu
          v-model="financialPeriodId"
          :options="periodOptions"
          option-attribute="label"
          value-attribute="value"
          :placeholder="t('accounting.expenseReports.byCategory.financialPeriodPlaceholder')"
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
            icon="i-heroicons-receipt-percent"
            :title="
              financialPeriodId
                ? t('accounting.expenseReports.byCategory.emptyTitleNoActivity')
                : t('accounting.expenseReports.byCategory.emptyTitlePick')
            "
            :description="
              financialPeriodId
                ? t('accounting.expenseReports.byCategory.emptyDescriptionNoActivity')
                : t('accounting.expenseReports.byCategory.emptyDescriptionPick')
            "
          />
        </template>
      </DataTable>

      <div
        v-if="rows.length"
        class="flex justify-end pt-4 px-2 text-sm font-semibold border-t border-gray-200 dark:border-gray-800 mt-2"
      >
        <span
          >{{ t('accounting.expenseReports.byCategory.totalExpenses') }}:
          {{ formatCurrency(totalExpenses) }}</span
        >
      </div>
      <p class="text-xs text-gray-500 mt-3">
        {{ t('accounting.expenseReports.byCategory.note') }}
      </p>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type {
  FinancialPeriodResponse,
  GeneralLedgerSummaryRow,
  GlAccountResponse
} from '~/features/accounting/types'
import type { ColumnDef } from '~/shared/types'

interface CategoryRow {
  category: string
  amount: number
}

const { t } = useI18n()
const api = useApi()

const { data: periods } = await useAsyncData('expense-by-category-periods', () =>
  api<FinancialPeriodResponse[]>('/financial-periods')
)
const periodOptions = computed(() =>
  (periods.value ?? []).map((p) => ({ label: p.periodName, value: p.id }))
)

const { data: glAccounts } = await useAsyncData('expense-by-category-gl-accounts', () =>
  api<GlAccountResponse[]>('/gl-accounts')
)
const accountById = computed(() => new Map((glAccounts.value ?? []).map((a) => [a.id, a])))

const financialPeriodId = ref<number | undefined>(undefined)

const {
  data: summaryRows,
  pending,
  error: fetchError
} = await useAsyncData(
  'expense-by-category-summary',
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
    .filter((row) => accountById.value.get(row.glAccountId)?.accountType === 'EXPENSE')
    .map((row) => ({
      category: row.accountName,
      // EXPENSE is normal-debit — period debit less period credit is the net expense for this period.
      amount: row.periodDebitTotal - row.periodCreditTotal
    }))
)

const totalExpenses = computed(() => rows.value.reduce((sum, r) => sum + r.amount, 0))

const columns = computed<ColumnDef<CategoryRow>[]>(() => [
  {
    key: 'category',
    label: t('accounting.expenseReports.byCategory.columns.category'),
    sortable: true
  },
  {
    key: 'amount',
    label: t('accounting.expenseReports.byCategory.columns.amount'),
    type: 'currency',
    sortable: true
  }
])
</script>
