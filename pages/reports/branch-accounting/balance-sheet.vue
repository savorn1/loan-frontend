<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.branchAccountingReports.balanceSheet.title')"
      :description="t('accounting.branchAccountingReports.balanceSheet.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.branchAccountingReportsHeader') },
        { label: t('accounting.branchAccountingReports.balanceSheet.title') }
      ]"
    />

    <UCard class="mb-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormGroup :label="t('accounting.branchAccountingReports.balanceSheet.branch')">
          <USelectMenu
            v-model="branchId"
            :options="branchOptions"
            option-attribute="label"
            value-attribute="value"
            :placeholder="t('accounting.branchAccountingReports.balanceSheet.branchPlaceholder')"
          />
        </UFormGroup>
        <UFormGroup :label="t('accounting.branchAccountingReports.balanceSheet.asOfDate')">
          <DatePicker v-model="asOfDate" :max="todayIso" />
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

    <template v-if="!branchId || !asOfDate">
      <UCard>
        <EmptyState
          icon="i-heroicons-scale"
          :title="t('accounting.branchAccountingReports.balanceSheet.emptyTitlePick')"
          :description="t('accounting.branchAccountingReports.balanceSheet.emptyDescriptionPick')"
        />
      </UCard>
    </template>
    <template v-else-if="!pending && !hasAnyActivity">
      <UCard>
        <EmptyState
          icon="i-heroicons-scale"
          :title="t('accounting.branchAccountingReports.balanceSheet.emptyTitleNoActivity')"
          :description="
            t('accounting.branchAccountingReports.balanceSheet.emptyDescriptionNoActivity')
          "
        />
      </UCard>
    </template>
    <template v-else>
      <UCard class="mb-6">
        <template #header>
          <span class="font-semibold">{{
            t('accounting.branchAccountingReports.balanceSheet.assets')
          }}</span>
        </template>
        <DataTable :rows="assetRows" :columns="columns" :loading="pending" :exportable="false" />
        <div
          class="flex justify-end pt-4 px-2 text-sm font-semibold border-t border-gray-200 dark:border-gray-800 mt-2"
        >
          <span
            >{{ t('accounting.branchAccountingReports.balanceSheet.totalAssets') }}:
            {{ formatCurrency(totalAssets) }}</span
          >
        </div>
      </UCard>

      <UCard class="mb-6">
        <template #header>
          <span class="font-semibold">{{
            t('accounting.branchAccountingReports.balanceSheet.liabilities')
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
            >{{ t('accounting.branchAccountingReports.balanceSheet.totalLiabilities') }}:
            {{ formatCurrency(totalLiabilities) }}</span
          >
        </div>
      </UCard>

      <UCard class="mb-6">
        <template #header>
          <span class="font-semibold">{{
            t('accounting.branchAccountingReports.balanceSheet.equity')
          }}</span>
        </template>
        <DataTable
          :rows="equityRowsWithRetainedEarnings"
          :columns="columns"
          :loading="pending"
          :exportable="false"
        />
        <div
          class="flex justify-end pt-4 px-2 text-sm font-semibold border-t border-gray-200 dark:border-gray-800 mt-2"
        >
          <span
            >{{ t('accounting.branchAccountingReports.balanceSheet.totalEquity') }}:
            {{ formatCurrency(totalEquityWithRetainedEarnings) }}</span
          >
        </div>
      </UCard>

      <UCard>
        <dl class="grid grid-cols-2 gap-y-3 text-sm">
          <dt class="text-gray-500">
            {{ t('accounting.branchAccountingReports.balanceSheet.totalAssets') }}
          </dt>
          <dd class="font-semibold text-right">{{ formatCurrency(totalAssets) }}</dd>
          <dt class="text-gray-500">
            {{ t('accounting.branchAccountingReports.balanceSheet.totalLiabilitiesAndEquity') }}
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
                ? t('accounting.branchAccountingReports.balanceSheet.balanced')
                : t('accounting.branchAccountingReports.balanceSheet.outOfBalance')
            }}
          </span>
        </div>
        <p class="text-xs text-gray-500 mt-3">
          {{ t('accounting.branchAccountingReports.balanceSheet.note') }}
        </p>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { BranchLedgerResponse, GlAccountResponse } from '~/features/accounting/types'
import type { BranchResponse } from '~/features/branches/types'
import type { ColumnDef } from '~/shared/types'

interface BalanceRow {
  accountNo: string
  accountName: string
  balance: number
}

const { t } = useI18n()
const api = useApi()

function todayIsoDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const todayIso = todayIsoDate()

const { data: branches } = await useAsyncData('branch-bs-branches', () =>
  api<BranchResponse[]>('/branches')
)
const branchOptions = computed(() =>
  (branches.value ?? []).map((b) => ({ label: b.name, value: b.id }))
)

const { data: glAccounts } = await useAsyncData('branch-bs-gl-accounts', () =>
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
  'branch-bs-ledger',
  () => {
    if (!branchId.value || !asOfDate.value) return Promise.resolve(null)
    // dateFrom intentionally omitted — cumulative to date, same as the global Balance Sheet's
    // reliance on closingBalance, but computed client-side since there's no per-branch balance endpoint.
    return api<BranchLedgerResponse>('/reports/ledger-by-branch', {
      query: { branchId: branchId.value, dateTo: asOfDate.value }
    })
  },
  { watch: [branchId, asOfDate] }
)

function rowsForType(type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'): BalanceRow[] {
  const byAccount = new Map<string, BalanceRow>()
  for (const line of ledger.value?.lines ?? []) {
    const account = accountByNo.value.get(line.glAccountNo)
    if (account?.accountType !== type) continue
    const existing = byAccount.get(line.glAccountNo) ?? {
      accountNo: line.glAccountNo,
      accountName: line.glAccountName,
      balance: 0
    }
    const matchesNormalSide = line.entrySide === account.normalBalance
    existing.balance += matchesNormalSide ? line.amount : -line.amount
    byAccount.set(line.glAccountNo, existing)
  }
  return [...byAccount.values()]
}

const assetRows = computed(() => rowsForType('ASSET'))
const liabilityRows = computed(() => rowsForType('LIABILITY'))
const equityRows = computed(() => rowsForType('EQUITY'))

const totalAssets = computed(() => assetRows.value.reduce((sum, r) => sum + r.balance, 0))
const totalLiabilities = computed(() => liabilityRows.value.reduce((sum, r) => sum + r.balance, 0))
const totalEquity = computed(() => equityRows.value.reduce((sum, r) => sum + r.balance, 0))

// Same technique as the global Balance Sheet — this system never posts closing entries that
// zero income/expense into retained earnings, so it's computed here rather than read from the ledger.
const retainedEarnings = computed(
  () =>
    rowsForType('INCOME').reduce((sum, r) => sum + r.balance, 0) -
    rowsForType('EXPENSE').reduce((sum, r) => sum + r.balance, 0)
)
const totalEquityWithRetainedEarnings = computed(() => totalEquity.value + retainedEarnings.value)
const equityRowsWithRetainedEarnings = computed(() => [
  ...equityRows.value,
  {
    accountNo: '—',
    accountName: t('accounting.branchAccountingReports.balanceSheet.retainedEarningsLabel'),
    balance: retainedEarnings.value
  }
])

const hasAnyActivity = computed(() => (ledger.value?.lines.length ?? 0) > 0)
const isBalanced = computed(
  () =>
    Math.abs(totalAssets.value - (totalLiabilities.value + totalEquityWithRetainedEarnings.value)) <
    0.005
)

const columns = computed<ColumnDef<BalanceRow>[]>(() => [
  {
    key: 'accountNo',
    label: t('accounting.branchAccountingReports.balanceSheet.columns.accountNo')
  },
  {
    key: 'accountName',
    label: t('accounting.branchAccountingReports.balanceSheet.columns.accountName')
  },
  {
    key: 'balance',
    label: t('accounting.branchAccountingReports.balanceSheet.columns.balance'),
    type: 'currency'
  }
])
</script>
