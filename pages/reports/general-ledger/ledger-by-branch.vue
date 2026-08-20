<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.generalLedgerReports.ledgerByBranch.title')"
      :description="t('accounting.generalLedgerReports.ledgerByBranch.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.generalLedgerReportsHeader') },
        { label: t('accounting.generalLedgerReports.ledgerByBranch.title') }
      ]"
    />

    <UCard class="mb-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormGroup :label="t('accounting.generalLedgerReports.ledgerByBranch.branch')">
          <USelectMenu
            v-model="branchId"
            :options="branchOptions"
            option-attribute="label"
            value-attribute="value"
            :placeholder="t('accounting.generalLedgerReports.ledgerByBranch.branchPlaceholder')"
          />
        </UFormGroup>
        <UFormGroup
          :label="t('common.dateRangeFilter.from') + ' – ' + t('common.dateRangeFilter.to')"
        >
          <DateRangeFilter v-model:from="dateFrom" v-model:to="dateTo" />
        </UFormGroup>
      </div>
    </UCard>

    <UCard v-if="ledger" class="mb-6">
      <dl class="grid grid-cols-2 sm:grid-cols-4 gap-y-3 text-sm">
        <dt class="text-gray-500">
          {{ t('accounting.generalLedgerReports.ledgerByBranch.totalDebit') }}
        </dt>
        <dd class="font-semibold">{{ formatCurrency(ledger.totalDebit) }}</dd>
        <dt class="text-gray-500">
          {{ t('accounting.generalLedgerReports.ledgerByBranch.totalCredit') }}
        </dt>
        <dd class="font-semibold">{{ formatCurrency(ledger.totalCredit) }}</dd>
      </dl>
    </UCard>

    <UCard>
      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable :rows="ledger?.lines ?? []" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-building-office-2"
            :title="
              branchId
                ? t('accounting.generalLedgerReports.ledgerByBranch.emptyTitleNoActivity')
                : t('accounting.generalLedgerReports.ledgerByBranch.emptyTitlePick')
            "
            :description="
              branchId
                ? t('accounting.generalLedgerReports.ledgerByBranch.emptyDescriptionNoActivity')
                : t('accounting.generalLedgerReports.ledgerByBranch.emptyDescriptionPick')
            "
          />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { BranchLedgerLineResponse, BranchLedgerResponse } from '~/features/accounting/types'
import type { BranchResponse } from '~/features/branches/types'
import type { ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

const { data: branches } = await useAsyncData('ledger-by-branch-branches', () =>
  api<BranchResponse[]>('/branches')
)
const branchOptions = computed(() =>
  (branches.value ?? []).map((b) => ({ label: b.name, value: b.id }))
)

const branchId = ref<number | undefined>(undefined)
const dateFrom = ref('')
const dateTo = ref('')

const {
  data: ledger,
  pending,
  error: fetchError
} = await useAsyncData(
  'ledger-by-branch-report',
  () => {
    if (!branchId.value) return Promise.resolve(null)
    return api<BranchLedgerResponse>('/reports/ledger-by-branch', {
      query: {
        branchId: branchId.value,
        dateFrom: dateFrom.value || undefined,
        dateTo: dateTo.value || undefined
      }
    })
  },
  { watch: [branchId, dateFrom, dateTo] }
)

const columns = computed<ColumnDef<BranchLedgerLineResponse>[]>(() => [
  {
    key: 'transactionDate',
    label: t('accounting.generalLedgerReports.ledgerByBranch.columns.date'),
    type: 'date'
  },
  { key: 'entryNo', label: t('accounting.generalLedgerReports.ledgerByBranch.columns.entryNo') },
  {
    key: 'glAccountNo',
    label: t('accounting.generalLedgerReports.ledgerByBranch.columns.account'),
    value: (row) => `${row.glAccountNo} — ${row.glAccountName}`
  },
  {
    key: 'description',
    label: t('accounting.generalLedgerReports.ledgerByBranch.columns.description')
  },
  {
    key: 'entrySide',
    label: t('accounting.generalLedgerReports.ledgerByBranch.columns.side'),
    type: 'badge',
    color: (row) => (row.entrySide === 'DEBIT' ? 'orange' : 'teal')
  },
  {
    key: 'amount',
    label: t('accounting.generalLedgerReports.ledgerByBranch.columns.amount'),
    type: 'currency'
  }
])
</script>
