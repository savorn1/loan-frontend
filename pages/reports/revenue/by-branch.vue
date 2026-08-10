<template>
  <div>
    <UButton to="/reports" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      {{ t('admin.reports.backToReports') }}
    </UButton>
    <PageHeader
      :title="t('accounting.revenueReports.byBranch.title')"
      :description="t('accounting.revenueReports.byBranch.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.revenueReportsHeader') },
        { label: t('accounting.revenueReports.byBranch.title') }
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
                ? t('accounting.revenueReports.byBranch.emptyTitleNoActivity')
                : t('accounting.revenueReports.byBranch.emptyTitlePick')
            "
            :description="
              hasFullRange
                ? t('accounting.revenueReports.byBranch.emptyDescriptionNoActivity')
                : t('accounting.revenueReports.byBranch.emptyDescriptionPick')
            "
          />
        </template>
      </DataTable>

      <p class="text-xs text-gray-500 mt-3">
        {{ t('accounting.revenueReports.byBranch.note') }}
      </p>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { BranchLedgerResponse, GlAccountResponse } from '~/features/accounting/types'
import type { BranchResponse } from '~/features/branches/types'
import type { ColumnDef } from '~/shared/types'

interface BranchRevenueRow {
  branch: string
  totalRevenue: number
}

const { t } = useI18n()
const api = useApi()

const { data: branches } = await useAsyncData('revenue-by-branch-branches', () =>
  api<BranchResponse[]>('/branches')
)
const { data: glAccounts } = await useAsyncData('revenue-by-branch-gl-accounts', () =>
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
  'revenue-by-branch-ledgers',
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

const rows = computed<BranchRevenueRow[]>(() => {
  const branchNameById = new Map((branches.value ?? []).map((b) => [b.id, b.name]))
  return (branchLedgers.value ?? [])
    .map((ledger) => {
      let totalRevenue = 0
      for (const line of ledger.lines) {
        const account = accountByNo.value.get(line.glAccountNo)
        if (account?.accountType !== 'INCOME') continue
        // INCOME is normal-credit — a credit increases revenue, a debit (e.g. a reversal) decreases it.
        totalRevenue += line.entrySide === account.normalBalance ? line.amount : -line.amount
      }
      return {
        branch: branchNameById.get(ledger.branchId) ?? String(ledger.branchId),
        totalRevenue
      }
    })
    .filter((row) => row.totalRevenue !== 0)
})

const columns = computed<ColumnDef<BranchRevenueRow>[]>(() => [
  { key: 'branch', label: t('accounting.revenueReports.byBranch.columns.branch'), sortable: true },
  {
    key: 'totalRevenue',
    label: t('accounting.revenueReports.byBranch.columns.totalRevenue'),
    type: 'currency',
    sortable: true
  }
])
</script>
