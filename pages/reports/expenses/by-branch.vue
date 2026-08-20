<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.expenseReports.byBranch.title')"
      :description="t('accounting.expenseReports.byBranch.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.expenseReportsHeader') },
        { label: t('accounting.expenseReports.byBranch.title') }
      ]"
    />

    <UCard class="mb-6">
      <UFormGroup
        :label="t('common.dateRangeFilter.from') + ' – ' + t('common.dateRangeFilter.to')"
        class="max-w-xs"
      >
        <DateRangeFilter v-model:from="dateFrom" v-model:to="dateTo" />
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
            icon="i-heroicons-building-office-2"
            :title="
              hasFullRange
                ? t('accounting.expenseReports.byBranch.emptyTitleNoActivity')
                : t('accounting.expenseReports.byBranch.emptyTitlePick')
            "
            :description="
              hasFullRange
                ? t('accounting.expenseReports.byBranch.emptyDescriptionNoActivity')
                : t('accounting.expenseReports.byBranch.emptyDescriptionPick')
            "
          />
        </template>
      </DataTable>

      <p class="text-xs text-gray-500 mt-3">
        {{ t('accounting.expenseReports.byBranch.note') }}
      </p>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { BranchLedgerResponse, GlAccountResponse } from '~/features/accounting/types'
import type { BranchResponse } from '~/features/branches/types'
import type { ColumnDef } from '~/shared/types'

interface BranchExpenseRow {
  branch: string
  totalExpense: number
}

const { t } = useI18n()
const api = useApi()

const { data: branches } = await useAsyncData('expense-by-branch-branches', () =>
  api<BranchResponse[]>('/branches')
)
const { data: glAccounts } = await useAsyncData('expense-by-branch-gl-accounts', () =>
  api<GlAccountResponse[]>('/gl-accounts')
)
const accountByNo = computed(() => new Map((glAccounts.value ?? []).map((a) => [a.accountNo, a])))

const dateFrom = ref('')
const dateTo = ref('')
const hasFullRange = computed(() => !!dateFrom.value && !!dateTo.value)

const {
  data: branchLedgers,
  pending,
  error: fetchError
} = await useAsyncData(
  'expense-by-branch-ledgers',
  () => {
    if (!hasFullRange.value || !branches.value?.length) return Promise.resolve([])
    return Promise.all(
      branches.value.map((b) =>
        api<BranchLedgerResponse>('/reports/ledger-by-branch', {
          query: { branchId: b.id, dateFrom: dateFrom.value, dateTo: dateTo.value }
        })
      )
    )
  },
  { watch: [branches, dateFrom, dateTo] }
)

const rows = computed<BranchExpenseRow[]>(() => {
  const branchNameById = new Map((branches.value ?? []).map((b) => [b.id, b.name]))
  return (branchLedgers.value ?? [])
    .map((ledger) => {
      let totalExpense = 0
      for (const line of ledger.lines) {
        const account = accountByNo.value.get(line.glAccountNo)
        if (account?.accountType !== 'EXPENSE') continue
        // EXPENSE is normal-debit — a debit increases expense, a credit (e.g. a reversal) decreases it.
        totalExpense += line.entrySide === account.normalBalance ? line.amount : -line.amount
      }
      return {
        branch: branchNameById.get(ledger.branchId) ?? String(ledger.branchId),
        totalExpense
      }
    })
    .filter((row) => row.totalExpense !== 0)
})

const columns = computed<ColumnDef<BranchExpenseRow>[]>(() => [
  { key: 'branch', label: t('accounting.expenseReports.byBranch.columns.branch'), sortable: true },
  {
    key: 'totalExpense',
    label: t('accounting.expenseReports.byBranch.columns.totalExpense'),
    type: 'currency',
    sortable: true
  }
])
</script>
