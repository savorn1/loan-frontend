<template>
  <div>
    <PageHeader
      :title="t('accounting.trialBalanceReports.adjustedTrialBalance.title')"
      :description="t('accounting.trialBalanceReports.adjustedTrialBalance.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.trialBalanceReportsHeader') },
        { label: t('accounting.trialBalanceReports.adjustedTrialBalance.title') }
      ]"
    />

    <UCard class="mb-6">
      <UFormGroup
        :label="t('accounting.trialBalanceReports.adjustedTrialBalance.financialPeriod')"
        class="max-w-xs"
      >
        <USelectMenu
          v-model="financialPeriodId"
          :options="periodOptions"
          option-attribute="label"
          value-attribute="value"
          :placeholder="
            t('accounting.trialBalanceReports.adjustedTrialBalance.financialPeriodPlaceholder')
          "
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

      <DataTable :rows="rows ?? []" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-adjustments-horizontal"
            :title="
              financialPeriodId
                ? t('accounting.trialBalanceReports.adjustedTrialBalance.emptyTitleNoActivity')
                : t('accounting.trialBalanceReports.adjustedTrialBalance.emptyTitlePick')
            "
            :description="
              financialPeriodId
                ? t(
                    'accounting.trialBalanceReports.adjustedTrialBalance.emptyDescriptionNoActivity'
                  )
                : t('accounting.trialBalanceReports.adjustedTrialBalance.emptyDescriptionPick')
            "
          />
        </template>
      </DataTable>

      <div
        v-if="rows?.length"
        class="flex justify-end gap-6 pt-4 px-2 text-sm font-semibold border-t border-gray-200 dark:border-gray-800 mt-2"
      >
        <span
          >{{ t('accounting.trialBalanceReports.adjustedTrialBalance.totalDebit') }}:
          {{ formatCurrency(totalDebit) }}</span
        >
        <span
          >{{ t('accounting.trialBalanceReports.adjustedTrialBalance.totalCredit') }}:
          {{ formatCurrency(totalCredit) }}</span
        >
        <span :class="isBalanced ? 'text-teal-600 dark:text-teal-400' : 'text-red-500'">
          {{
            isBalanced
              ? t('accounting.trialBalanceReports.adjustedTrialBalance.balanced')
              : t('accounting.trialBalanceReports.adjustedTrialBalance.outOfBalance')
          }}
        </span>
      </div>
      <p class="text-xs text-gray-500 mt-3">
        {{ t('accounting.trialBalanceReports.adjustedTrialBalance.note') }}
      </p>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { FinancialPeriodResponse, TrialBalanceRowResponse } from '~/features/accounting/types'
import type { ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

const { data: periods } = await useAsyncData('adjusted-trial-balance-periods', () =>
  api<FinancialPeriodResponse[]>('/financial-periods')
)
const periodOptions = computed(() =>
  (periods.value ?? []).map((p) => ({ label: p.periodName, value: p.id }))
)

const financialPeriodId = ref<number | undefined>(undefined)

const {
  data: rows,
  pending,
  error: fetchError
} = await useAsyncData(
  'adjusted-trial-balance-rows',
  () => {
    if (!financialPeriodId.value) return Promise.resolve([])
    return api<TrialBalanceRowResponse[]>('/trial-balance', {
      query: { financialPeriodId: financialPeriodId.value }
    })
  },
  { watch: [financialPeriodId] }
)

const columns = computed<ColumnDef<TrialBalanceRowResponse>[]>(() => [
  {
    key: 'accountNo',
    label: t('accounting.trialBalanceReports.adjustedTrialBalance.columns.accountNo'),
    sortable: true
  },
  {
    key: 'accountName',
    label: t('accounting.trialBalanceReports.adjustedTrialBalance.columns.accountName'),
    sortable: true
  },
  {
    key: 'totalDebit',
    label: t('accounting.trialBalanceReports.adjustedTrialBalance.columns.debit'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'totalCredit',
    label: t('accounting.trialBalanceReports.adjustedTrialBalance.columns.credit'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'balance',
    label: t('accounting.trialBalanceReports.adjustedTrialBalance.columns.balance'),
    type: 'currency',
    sortable: true
  }
])

const totalDebit = computed(() => (rows.value ?? []).reduce((sum, r) => sum + r.totalDebit, 0))
const totalCredit = computed(() => (rows.value ?? []).reduce((sum, r) => sum + r.totalCredit, 0))
const isBalanced = computed(() => Math.abs(totalDebit.value - totalCredit.value) < 0.005)
</script>
