<template>
  <div>
    <UButton to="/reports" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      {{ t('admin.reports.title') }}
    </UButton>
    <PageHeader
      :title="t('accounting.branchAccountingReports.transactionSummary.title')"
      :description="t('accounting.branchAccountingReports.transactionSummary.description')"
    />

    <UCard class="mb-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormGroup :label="t('accounting.branchAccountingReports.transactionSummary.branch')">
          <USelectMenu
            v-model="branchId"
            :options="branchOptions"
            option-attribute="label"
            value-attribute="value"
            :placeholder="
              t('accounting.branchAccountingReports.transactionSummary.branchPlaceholder')
            "
          />
        </UFormGroup>
        <UFormGroup
          :label="t('common.dateRangeFilter.from') + ' – ' + t('common.dateRangeFilter.to')"
        >
          <DateRangeFilter v-model:from="dateFrom" v-model:to="dateTo" />
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
            icon="i-heroicons-document-chart-bar"
            :title="
              branchId && hasFullRange
                ? t('accounting.branchAccountingReports.transactionSummary.emptyTitleNoActivity')
                : t('accounting.branchAccountingReports.transactionSummary.emptyTitlePick')
            "
            :description="
              branchId && hasFullRange
                ? t(
                    'accounting.branchAccountingReports.transactionSummary.emptyDescriptionNoActivity'
                  )
                : t('accounting.branchAccountingReports.transactionSummary.emptyDescriptionPick')
            "
          />
        </template>
      </DataTable>

      <div
        v-if="rows.length"
        class="flex justify-end gap-6 pt-4 px-2 text-sm font-semibold border-t border-gray-200 dark:border-gray-800 mt-2"
      >
        <span
          >{{ t('accounting.branchAccountingReports.transactionSummary.totalDebit') }}:
          {{ formatCurrency(totalDebit) }}</span
        >
        <span
          >{{ t('accounting.branchAccountingReports.transactionSummary.totalCredit') }}:
          {{ formatCurrency(totalCredit) }}</span
        >
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { BranchLedgerResponse } from '~/features/accounting/types'
import type { BranchResponse } from '~/features/branches/types'
import type { ColumnDef } from '~/shared/types'

interface SummaryRow {
  accountNo: string
  accountName: string
  debit: number
  credit: number
  net: number
}

const { t } = useI18n()
const api = useApi()

const { data: branches } = await useAsyncData('branch-txn-summary-branches', () =>
  api<BranchResponse[]>('/branches')
)
const branchOptions = computed(() =>
  (branches.value ?? []).map((b) => ({ label: b.name, value: b.id }))
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
  'branch-txn-summary-ledger',
  () => {
    if (!branchId.value || !hasFullRange.value) return Promise.resolve(null)
    return api<BranchLedgerResponse>('/reports/ledger-by-branch', {
      query: { branchId: branchId.value, dateFrom: dateFrom.value, dateTo: dateTo.value }
    })
  },
  { watch: [branchId, dateFrom, dateTo] }
)

const rows = computed<SummaryRow[]>(() => {
  const byAccount = new Map<string, SummaryRow>()
  for (const line of ledger.value?.lines ?? []) {
    const existing = byAccount.get(line.glAccountNo) ?? {
      accountNo: line.glAccountNo,
      accountName: line.glAccountName,
      debit: 0,
      credit: 0,
      net: 0
    }
    if (line.entrySide === 'DEBIT') existing.debit += line.amount
    else existing.credit += line.amount
    existing.net = existing.debit - existing.credit
    byAccount.set(line.glAccountNo, existing)
  }
  return [...byAccount.values()]
})

const totalDebit = computed(() => rows.value.reduce((sum, r) => sum + r.debit, 0))
const totalCredit = computed(() => rows.value.reduce((sum, r) => sum + r.credit, 0))

const columns = computed<ColumnDef<SummaryRow>[]>(() => [
  {
    key: 'accountNo',
    label: t('accounting.branchAccountingReports.transactionSummary.columns.accountNo'),
    sortable: true
  },
  {
    key: 'accountName',
    label: t('accounting.branchAccountingReports.transactionSummary.columns.accountName'),
    sortable: true
  },
  {
    key: 'debit',
    label: t('accounting.branchAccountingReports.transactionSummary.columns.debit'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'credit',
    label: t('accounting.branchAccountingReports.transactionSummary.columns.credit'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'net',
    label: t('accounting.branchAccountingReports.transactionSummary.columns.net'),
    type: 'currency',
    sortable: true
  }
])
</script>
