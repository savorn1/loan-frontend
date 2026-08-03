<template>
  <div>
    <UButton to="/reports" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      {{ t('admin.reports.title') }}
    </UButton>
    <PageHeader
      :title="t('accounting.trialBalanceReports.closingTrialBalance.title')"
      :description="t('accounting.trialBalanceReports.closingTrialBalance.description')"
    />

    <UCard class="mb-6">
      <UFormGroup
        :label="t('accounting.trialBalanceReports.closingTrialBalance.financialPeriod')"
        class="max-w-xs"
      >
        <USelectMenu
          v-model="financialPeriodId"
          :options="periodOptions"
          option-attribute="label"
          value-attribute="value"
          :placeholder="
            t('accounting.trialBalanceReports.closingTrialBalance.financialPeriodPlaceholder')
          "
        />
      </UFormGroup>
    </UCard>

    <UCard v-if="latestSnapshot" class="mb-6">
      <dl class="grid grid-cols-2 sm:grid-cols-4 gap-y-3 text-sm">
        <dt class="text-gray-500">
          {{ t('accounting.trialBalanceReports.closingTrialBalance.generatedAt') }}
        </dt>
        <dd class="font-semibold">{{ formatDateTime(latestSnapshot.generatedAt) }}</dd>
        <dt class="text-gray-500">
          {{ t('accounting.trialBalanceReports.closingTrialBalance.generatedBy') }}
        </dt>
        <dd class="font-semibold">{{ latestSnapshot.generatedBy }}</dd>
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

      <DataTable :rows="latestSnapshot?.lines ?? []" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-lock-closed"
            :title="emptyTitle"
            :description="emptyDescription"
          >
            <template v-if="financialPeriodId && !latestSnapshot" #action>
              <UButton to="/trial-balance" size="xs" variant="soft">
                {{ t('accounting.trialBalanceReports.closingTrialBalance.goToTrialBalance') }}
              </UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div
        v-if="latestSnapshot"
        class="flex justify-end gap-6 pt-4 px-2 text-sm font-semibold border-t border-gray-200 dark:border-gray-800 mt-2"
      >
        <span
          >{{ t('accounting.trialBalanceReports.closingTrialBalance.totalDebit') }}:
          {{ formatCurrency(latestSnapshot.totalDebit) }}</span
        >
        <span
          >{{ t('accounting.trialBalanceReports.closingTrialBalance.totalCredit') }}:
          {{ formatCurrency(latestSnapshot.totalCredit) }}</span
        >
        <span :class="isBalanced ? 'text-teal-600 dark:text-teal-400' : 'text-red-500'">
          {{
            isBalanced
              ? t('accounting.trialBalanceReports.closingTrialBalance.balanced')
              : t('accounting.trialBalanceReports.closingTrialBalance.outOfBalance')
          }}
        </span>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type {
  FinancialPeriodResponse,
  TrialBalanceResponse,
  TrialBalanceRowResponse
} from '~/features/accounting/types'
import type { ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

const { data: periods } = await useAsyncData('closing-trial-balance-periods', () =>
  api<FinancialPeriodResponse[]>('/financial-periods')
)
const periodOptions = computed(() =>
  (periods.value ?? []).map((p) => ({ label: p.periodName, value: p.id }))
)

const financialPeriodId = ref<number | undefined>(undefined)

const {
  data: snapshots,
  pending,
  error: fetchError
} = await useAsyncData(
  'closing-trial-balance-snapshots',
  () => {
    if (!financialPeriodId.value) return Promise.resolve([])
    return api<TrialBalanceResponse[]>('/trial-balance/snapshots', {
      query: { financialPeriodId: financialPeriodId.value }
    })
  },
  { watch: [financialPeriodId] }
)

// Snapshots come back most-recent-first — the closing trial balance is simply the latest one.
const latestSnapshot = computed(() => snapshots.value?.[0] ?? null)

const emptyTitle = computed(() =>
  !financialPeriodId.value
    ? t('accounting.trialBalanceReports.closingTrialBalance.emptyTitlePick')
    : t('accounting.trialBalanceReports.closingTrialBalance.emptyTitleNoSnapshot')
)
const emptyDescription = computed(() =>
  !financialPeriodId.value
    ? t('accounting.trialBalanceReports.closingTrialBalance.emptyDescriptionPick')
    : t('accounting.trialBalanceReports.closingTrialBalance.emptyDescriptionNoSnapshot')
)

const columns = computed<ColumnDef<TrialBalanceRowResponse>[]>(() => [
  {
    key: 'accountNo',
    label: t('accounting.trialBalanceReports.closingTrialBalance.columns.accountNo'),
    sortable: true
  },
  {
    key: 'accountName',
    label: t('accounting.trialBalanceReports.closingTrialBalance.columns.accountName'),
    sortable: true
  },
  {
    key: 'totalDebit',
    label: t('accounting.trialBalanceReports.closingTrialBalance.columns.debit'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'totalCredit',
    label: t('accounting.trialBalanceReports.closingTrialBalance.columns.credit'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'balance',
    label: t('accounting.trialBalanceReports.closingTrialBalance.columns.balance'),
    type: 'currency',
    sortable: true
  }
])

const isBalanced = computed(() => {
  if (!latestSnapshot.value) return true
  return Math.abs(latestSnapshot.value.totalDebit - latestSnapshot.value.totalCredit) < 0.005
})
</script>
