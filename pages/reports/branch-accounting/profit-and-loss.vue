<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.branchAccountingReports.profitAndLoss.title')"
      :description="t('accounting.branchAccountingReports.profitAndLoss.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.branchAccountingReportsHeader') },
        { label: t('accounting.branchAccountingReports.profitAndLoss.title') }
      ]"
    />

    <UCard class="mb-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormGroup :label="t('accounting.branchAccountingReports.profitAndLoss.branch')">
          <USelectMenu
            v-model="branchId"
            :options="branchOptions"
            option-attribute="label"
            value-attribute="value"
            :placeholder="t('accounting.branchAccountingReports.profitAndLoss.branchPlaceholder')"
          />
        </UFormGroup>
        <UFormGroup
          :label="t('common.dateRangeFilter.from') + ' – ' + t('common.dateRangeFilter.to')"
        >
          <DateRangeFilter v-model:from="dateFrom" v-model:to="dateTo" />
        </UFormGroup>
      </div>
    </UCard>

    <UAlert
      v-if="fetchError"
      color="red"
      variant="subtle"
      class="mb-4"
      :title="apiErrorMessage(fetchError)"
    />

    <template v-if="!branchId || !hasFullRange">
      <UCard>
        <EmptyState
          icon="i-heroicons-chart-bar"
          :title="t('accounting.branchAccountingReports.profitAndLoss.emptyTitlePick')"
          :description="t('accounting.branchAccountingReports.profitAndLoss.emptyDescriptionPick')"
        />
      </UCard>
    </template>
    <template v-else-if="!pending && !hasAnyActivity">
      <UCard>
        <EmptyState
          icon="i-heroicons-chart-bar"
          :title="t('accounting.branchAccountingReports.profitAndLoss.emptyTitleNoActivity')"
          :description="
            t('accounting.branchAccountingReports.profitAndLoss.emptyDescriptionNoActivity')
          "
        />
      </UCard>
    </template>
    <template v-else>
      <UCard class="mb-6">
        <template #header>
          <span class="font-semibold">{{
            t('accounting.branchAccountingReports.profitAndLoss.income')
          }}</span>
        </template>
        <DataTable :rows="incomeLines" :columns="columns" :loading="pending" :exportable="false" />
        <div
          class="flex justify-end pt-4 px-2 text-sm font-semibold border-t border-gray-200 dark:border-gray-800 mt-2"
        >
          <span
            >{{ t('accounting.branchAccountingReports.profitAndLoss.totalIncome') }}:
            {{ formatCurrency(totalIncome) }}</span
          >
        </div>
      </UCard>

      <UCard class="mb-6">
        <template #header>
          <span class="font-semibold">{{
            t('accounting.branchAccountingReports.profitAndLoss.expenses')
          }}</span>
        </template>
        <DataTable :rows="expenseLines" :columns="columns" :loading="pending" :exportable="false" />
        <div
          class="flex justify-end pt-4 px-2 text-sm font-semibold border-t border-gray-200 dark:border-gray-800 mt-2"
        >
          <span
            >{{ t('accounting.branchAccountingReports.profitAndLoss.totalExpenses') }}:
            {{ formatCurrency(totalExpenses) }}</span
          >
        </div>
      </UCard>

      <UCard>
        <div class="flex justify-end text-base font-bold">
          <span :class="netIncome >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-red-500'">
            {{
              netIncome >= 0
                ? t('accounting.branchAccountingReports.profitAndLoss.netIncome')
                : t('accounting.branchAccountingReports.profitAndLoss.netLoss')
            }}:
            {{ formatCurrency(Math.abs(netIncome)) }}
          </span>
        </div>
        <p class="text-xs text-gray-500 mt-3">
          {{ t('accounting.branchAccountingReports.profitAndLoss.note') }}
        </p>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { BranchLedgerResponse, GlAccountResponse } from '~/features/accounting/types'
import type { BranchResponse } from '~/features/branches/types'
import type { ColumnDef } from '~/shared/types'

interface StatementLine {
  accountNo: string
  accountName: string
  amount: number
}

const { t } = useI18n()
const api = useApi()

const { data: branches } = await useAsyncData('branch-pl-branches', () =>
  api<BranchResponse[]>('/branches')
)
const branchOptions = computed(() =>
  (branches.value ?? []).map((b) => ({ label: b.name, value: b.id }))
)

const { data: glAccounts } = await useAsyncData('branch-pl-gl-accounts', () =>
  api<GlAccountResponse[]>('/gl-accounts')
)
const accountTypeByNo = computed(
  () => new Map((glAccounts.value ?? []).map((a) => [a.accountNo, a.accountType]))
)

const branchId = ref<number | undefined>(undefined)
const dateFrom = ref('')
const dateTo = ref('')
const hasFullRange = computed(() => !!dateFrom.value && !!dateTo.value)

const {
  data: ledger,
  pending,
  error: fetchError
} = await useAsyncData(
  'branch-pl-ledger',
  () => {
    if (!branchId.value || !hasFullRange.value) return Promise.resolve(null)
    return api<BranchLedgerResponse>('/reports/ledger-by-branch', {
      query: { branchId: branchId.value, dateFrom: dateFrom.value, dateTo: dateTo.value }
    })
  },
  { watch: [branchId, dateFrom, dateTo] }
)

function linesForType(type: 'INCOME' | 'EXPENSE'): StatementLine[] {
  const byAccount = new Map<string, StatementLine>()
  for (const line of ledger.value?.lines ?? []) {
    if (accountTypeByNo.value.get(line.glAccountNo) !== type) continue
    const existing = byAccount.get(line.glAccountNo) ?? {
      accountNo: line.glAccountNo,
      accountName: line.glAccountName,
      amount: 0
    }
    // INCOME is normal-credit, EXPENSE is normal-debit — sum in each account's own direction.
    const matchesNormalSide =
      (type === 'INCOME' && line.entrySide === 'CREDIT') ||
      (type === 'EXPENSE' && line.entrySide === 'DEBIT')
    existing.amount += matchesNormalSide ? line.amount : -line.amount
    byAccount.set(line.glAccountNo, existing)
  }
  return [...byAccount.values()]
}

const incomeLines = computed(() => linesForType('INCOME'))
const expenseLines = computed(() => linesForType('EXPENSE'))
const totalIncome = computed(() => incomeLines.value.reduce((sum, r) => sum + r.amount, 0))
const totalExpenses = computed(() => expenseLines.value.reduce((sum, r) => sum + r.amount, 0))
const netIncome = computed(() => totalIncome.value - totalExpenses.value)
const hasAnyActivity = computed(() => incomeLines.value.length > 0 || expenseLines.value.length > 0)

const columns = computed<ColumnDef<StatementLine>[]>(() => [
  {
    key: 'accountNo',
    label: t('accounting.branchAccountingReports.profitAndLoss.columns.accountNo')
  },
  {
    key: 'accountName',
    label: t('accounting.branchAccountingReports.profitAndLoss.columns.accountName')
  },
  {
    key: 'amount',
    label: t('accounting.branchAccountingReports.profitAndLoss.columns.amount'),
    type: 'currency'
  }
])
</script>
