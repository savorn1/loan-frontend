<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.riskComplianceReports.largeTransactions.title')"
      :description="t('accounting.riskComplianceReports.largeTransactions.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.riskComplianceReportsHeader') },
        { label: t('accounting.riskComplianceReports.largeTransactions.title') }
      ]"
    />

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center gap-3">
          <UFormGroup
            class="w-full sm:w-auto"
            :label="t('accounting.riskComplianceReports.largeTransactions.threshold')"
          >
            <UInput v-model.number="threshold" type="number" size="sm" class="w-full sm:w-40" />
          </UFormGroup>
          <UFormGroup
            class="w-full sm:w-auto"
            :label="t('accounting.riskComplianceReports.largeTransactions.months')"
          >
            <USelectMenu
              v-model="months"
              :options="monthsOptions"
              option-attribute="label"
              value-attribute="value"
              size="sm"
              class="w-full sm:w-32"
            />
          </UFormGroup>
        </div>
      </template>

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
            icon="i-heroicons-banknotes"
            :title="t('accounting.riskComplianceReports.largeTransactions.emptyTitle')"
            :description="t('accounting.riskComplianceReports.largeTransactions.emptyDescription')"
          />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { LargeTransactionRow } from '~/features/reports/types'
import type { ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

const threshold = ref(5000)
const months = ref(3)
const monthsOptions = [
  { label: t('accounting.riskComplianceReports.largeTransactions.months1'), value: 1 },
  { label: t('accounting.riskComplianceReports.largeTransactions.months3'), value: 3 },
  { label: t('accounting.riskComplianceReports.largeTransactions.months6'), value: 6 },
  { label: t('accounting.riskComplianceReports.largeTransactions.months12'), value: 12 }
]

const {
  data: rows,
  pending,
  error: fetchError
} = await useAsyncData(
  'risk-large-transactions',
  () =>
    api<LargeTransactionRow[]>('/payments/reports/large-transactions', {
      query: { threshold: threshold.value, months: months.value }
    }),
  { watch: [threshold, months], default: () => [] }
)

const columns = computed<ColumnDef<LargeTransactionRow>[]>(() => [
  { key: 'loanId', label: t('accounting.riskComplianceReports.largeTransactions.columns.loanId') },
  {
    key: 'amount',
    label: t('accounting.riskComplianceReports.largeTransactions.columns.amount'),
    type: 'currency'
  },
  {
    key: 'paidAt',
    label: t('accounting.riskComplianceReports.largeTransactions.columns.paidAt'),
    type: 'date'
  },
  {
    key: 'installmentNumber',
    label: t('accounting.riskComplianceReports.largeTransactions.columns.installmentNumber')
  }
])
</script>
