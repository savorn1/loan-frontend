<template>
  <div>
    <UButton to="/reports" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      {{ t('admin.reports.backToReports') }}
    </UButton>
    <PageHeader
      :title="t('accounting.branchAccountingReports.cashPosition.title')"
      :description="t('accounting.branchAccountingReports.cashPosition.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.branchAccountingReportsHeader') },
        { label: t('accounting.branchAccountingReports.cashPosition.title') }
      ]"
    />

    <UCard class="mb-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormGroup :label="t('accounting.branchAccountingReports.cashPosition.branch')">
          <USelectMenu
            v-model="branchId"
            :options="branchOptions"
            option-attribute="label"
            value-attribute="value"
            :placeholder="t('accounting.branchAccountingReports.cashPosition.branchPlaceholder')"
          />
        </UFormGroup>
        <UFormGroup :label="t('accounting.branchAccountingReports.cashPosition.asOfDate')">
          <DatePicker v-model="asOfDate" :max="todayIso" />
        </UFormGroup>
      </div>
    </UCard>

    <UAlert
      v-if="glAccounts && !cashAccountExists"
      color="red"
      variant="subtle"
      class="mb-4"
      :title="t('accounting.branchAccountingReports.cashPosition.accountNotFound')"
    />

    <UAlert
      v-if="fetchError"
      color="red"
      variant="subtle"
      class="mb-4"
      :title="apiErrorMessage(fetchError)"
    />

    <UCard v-if="ledger">
      <div class="text-sm text-gray-500 dark:text-gray-400">
        {{ t('accounting.branchAccountingReports.cashPosition.cashPosition') }}
      </div>
      <div class="text-3xl font-semibold text-gray-900 dark:text-white mt-1">
        {{ formatCurrency(cashPosition) }}
      </div>

      <dl
        class="grid grid-cols-2 gap-y-3 text-sm mt-6 pt-4 border-t border-gray-200 dark:border-gray-800"
      >
        <dt class="text-gray-500">
          {{ t('accounting.branchAccountingReports.cashPosition.totalReceiptsToDate') }}
        </dt>
        <dd class="font-semibold text-right">{{ formatCurrency(totalReceipts) }}</dd>
        <dt class="text-gray-500">
          {{ t('accounting.branchAccountingReports.cashPosition.totalPaymentsToDate') }}
        </dt>
        <dd class="font-semibold text-right">{{ formatCurrency(totalPayments) }}</dd>
      </dl>
    </UCard>
    <UCard v-else>
      <EmptyState
        icon="i-heroicons-banknotes"
        :title="t('accounting.branchAccountingReports.cashPosition.emptyTitlePick')"
      />
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { BranchLedgerResponse, GlAccountResponse } from '~/features/accounting/types'
import type { BranchResponse } from '~/features/branches/types'

const { t } = useI18n()
const api = useApi()

function todayIsoDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const todayIso = todayIsoDate()

const { data: branches } = await useAsyncData('branch-cash-position-branches', () =>
  api<BranchResponse[]>('/branches')
)
const branchOptions = computed(() =>
  (branches.value ?? []).map((b) => ({ label: b.name, value: b.id }))
)

const { data: glAccounts } = await useAsyncData('branch-cash-position-gl-accounts', () =>
  api<GlAccountResponse[]>('/gl-accounts')
)
const cashAccountExists = computed(() =>
  (glAccounts.value ?? []).some((a) => a.accountNo === '1010')
)

const branchId = ref<number | undefined>(undefined)
const asOfDate = ref(todayIso)

const { data: ledger, error: fetchError } = await useAsyncData(
  'branch-cash-position-ledger',
  () => {
    if (!branchId.value || !asOfDate.value) return Promise.resolve(null)
    return api<BranchLedgerResponse>('/reports/ledger-by-branch', {
      query: { branchId: branchId.value, dateTo: asOfDate.value }
    })
  },
  { watch: [branchId, asOfDate] }
)

const cashLines = computed(() =>
  (ledger.value?.lines ?? []).filter((line) => line.glAccountNo === '1010')
)
const totalReceipts = computed(() =>
  cashLines.value.filter((l) => l.entrySide === 'DEBIT').reduce((sum, l) => sum + l.amount, 0)
)
const totalPayments = computed(() =>
  cashLines.value.filter((l) => l.entrySide === 'CREDIT').reduce((sum, l) => sum + l.amount, 0)
)
const cashPosition = computed(() => totalReceipts.value - totalPayments.value)
</script>
