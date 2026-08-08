<template>
  <div>
    <PageHeader
      :title="t('accounting.branchAccountingReports.trialBalance.title')"
      :description="t('accounting.branchAccountingReports.trialBalance.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.branchAccountingReportsHeader') },
        { label: t('accounting.branchAccountingReports.trialBalance.title') }
      ]"
    />

    <UCard class="mb-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormGroup :label="t('accounting.branchAccountingReports.trialBalance.branch')">
          <USelectMenu
            v-model="branchId"
            :options="branchOptions"
            option-attribute="label"
            value-attribute="value"
            :placeholder="t('accounting.branchAccountingReports.trialBalance.branchPlaceholder')"
          />
        </UFormGroup>
        <UFormGroup :label="t('accounting.branchAccountingReports.trialBalance.asOfDate')">
          <DatePicker v-model="asOfDate" :max="todayIso" />
        </UFormGroup>
      </div>
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
            icon="i-heroicons-scale"
            :title="
              branchId && asOfDate
                ? t('accounting.branchAccountingReports.trialBalance.emptyTitleNoActivity')
                : t('accounting.branchAccountingReports.trialBalance.emptyTitlePick')
            "
            :description="
              branchId && asOfDate
                ? t('accounting.branchAccountingReports.trialBalance.emptyDescriptionNoActivity')
                : t('accounting.branchAccountingReports.trialBalance.emptyDescriptionPick')
            "
          />
        </template>
      </DataTable>

      <div
        v-if="rows.length"
        class="flex justify-end gap-6 pt-4 px-2 text-sm font-semibold border-t border-gray-200 dark:border-gray-800 mt-2"
      >
        <span
          >{{ t('accounting.branchAccountingReports.trialBalance.totalDebit') }}:
          {{ formatCurrency(totalDebit) }}</span
        >
        <span
          >{{ t('accounting.branchAccountingReports.trialBalance.totalCredit') }}:
          {{ formatCurrency(totalCredit) }}</span
        >
        <span :class="isBalanced ? 'text-teal-600 dark:text-teal-400' : 'text-red-500'">
          {{
            isBalanced
              ? t('accounting.branchAccountingReports.trialBalance.balanced')
              : t('accounting.branchAccountingReports.trialBalance.outOfBalance')
          }}
        </span>
      </div>
      <p class="text-xs text-gray-500 mt-3">
        {{ t('accounting.branchAccountingReports.trialBalance.note') }}
      </p>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { BranchLedgerResponse, GlAccountResponse } from '~/features/accounting/types'
import type { BranchResponse } from '~/features/branches/types'
import type { ColumnDef } from '~/shared/types'

interface TrialBalanceRow {
  accountNo: string
  accountName: string
  totalDebit: number
  totalCredit: number
  balance: number
}

const { t } = useI18n()
const api = useApi()

function todayIsoDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const todayIso = todayIsoDate()

const { data: branches } = await useAsyncData('branch-tb-branches', () =>
  api<BranchResponse[]>('/branches')
)
const branchOptions = computed(() =>
  (branches.value ?? []).map((b) => ({ label: b.name, value: b.id }))
)

const { data: glAccounts } = await useAsyncData('branch-tb-gl-accounts', () =>
  api<GlAccountResponse[]>('/gl-accounts')
)
const accountByNo = computed(() => new Map((glAccounts.value ?? []).map((a) => [a.accountNo, a])))

const branchId = ref<number | undefined>(undefined)
const asOfDate = ref('')

const {
  data: ledger,
  pending,
  error: fetchError
} = await useAsyncData(
  'branch-tb-ledger',
  () => {
    if (!branchId.value || !asOfDate.value) return Promise.resolve(null)
    return api<BranchLedgerResponse>('/reports/ledger-by-branch', {
      query: { branchId: branchId.value, dateTo: asOfDate.value }
    })
  },
  { watch: [branchId, asOfDate] }
)

const rows = computed<TrialBalanceRow[]>(() => {
  const byAccount = new Map<string, TrialBalanceRow>()
  for (const line of ledger.value?.lines ?? []) {
    const account = accountByNo.value.get(line.glAccountNo)
    const existing = byAccount.get(line.glAccountNo) ?? {
      accountNo: line.glAccountNo,
      accountName: line.glAccountName,
      totalDebit: 0,
      totalCredit: 0,
      balance: 0
    }
    if (line.entrySide === 'DEBIT') existing.totalDebit += line.amount
    else existing.totalCredit += line.amount
    const matchesNormalSide = account && line.entrySide === account.normalBalance
    existing.balance += matchesNormalSide ? line.amount : -line.amount
    byAccount.set(line.glAccountNo, existing)
  }
  return [...byAccount.values()]
})

const totalDebit = computed(() => rows.value.reduce((sum, r) => sum + r.totalDebit, 0))
const totalCredit = computed(() => rows.value.reduce((sum, r) => sum + r.totalCredit, 0))
const isBalanced = computed(() => Math.abs(totalDebit.value - totalCredit.value) < 0.005)

const columns = computed<ColumnDef<TrialBalanceRow>[]>(() => [
  {
    key: 'accountNo',
    label: t('accounting.branchAccountingReports.trialBalance.columns.accountNo'),
    sortable: true
  },
  {
    key: 'accountName',
    label: t('accounting.branchAccountingReports.trialBalance.columns.accountName'),
    sortable: true
  },
  {
    key: 'totalDebit',
    label: t('accounting.branchAccountingReports.trialBalance.columns.debit'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'totalCredit',
    label: t('accounting.branchAccountingReports.trialBalance.columns.credit'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'balance',
    label: t('accounting.branchAccountingReports.trialBalance.columns.balance'),
    type: 'currency',
    sortable: true
  }
])
</script>
