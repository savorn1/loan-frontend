<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.dashboardReports.forecast.title')"
      :description="t('accounting.dashboardReports.forecast.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.dashboardReportsHeader') },
        { label: t('accounting.dashboardReports.forecast.title') }
      ]"
    />

    <UAlert
      icon="i-heroicons-information-circle"
      color="primary"
      variant="subtle"
      class="mb-6"
      :title="t('accounting.dashboardReports.forecast.note')"
    />

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
            icon="i-heroicons-calendar-days"
            :title="t('accounting.dashboardReports.forecast.emptyTitle')"
            :description="t('accounting.dashboardReports.forecast.emptyDescription')"
          />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { PaymentResponse } from '~/features/payments/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

interface ForecastRow {
  month: string
  installmentCount: number
  expectedTotal: number
  expectedPrincipal: number
  expectedInterest: number
}

const { t } = useI18n()
const api = useApi()

const {
  data: paymentsRaw,
  pending,
  error: fetchError
} = await useAsyncData('dashboard-forecast-payments', () =>
  api<PageResponse<PaymentResponse>>('/payments', { query: { size: 1000 } })
)
const payments = computed(() => paymentsRaw.value?.content ?? [])

// Naive cash-flow forecast: not-yet-paid installments, grouped by the month
// they're scheduled to fall due — no assumptions beyond the existing schedule.
const rows = computed<ForecastRow[]>(() => {
  const byMonth = new Map<string, ForecastRow>()
  for (const p of payments.value) {
    if (p.status === 'PAID') continue
    const month = p.dueDate.slice(0, 7)
    const existing = byMonth.get(month) ?? {
      month,
      installmentCount: 0,
      expectedTotal: 0,
      expectedPrincipal: 0,
      expectedInterest: 0
    }
    existing.installmentCount += 1
    existing.expectedTotal += p.amount
    existing.expectedPrincipal += p.principalComponent ?? 0
    existing.expectedInterest += p.interestComponent ?? 0
    byMonth.set(month, existing)
  }
  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month))
})

const columns = computed<ColumnDef<ForecastRow>[]>(() => [
  { key: 'month', label: t('accounting.dashboardReports.forecast.columns.month') },
  {
    key: 'installmentCount',
    label: t('accounting.dashboardReports.forecast.columns.installmentCount')
  },
  {
    key: 'expectedTotal',
    label: t('accounting.dashboardReports.forecast.columns.expectedTotal'),
    type: 'currency'
  },
  {
    key: 'expectedPrincipal',
    label: t('accounting.dashboardReports.forecast.columns.expectedPrincipal'),
    type: 'currency'
  },
  {
    key: 'expectedInterest',
    label: t('accounting.dashboardReports.forecast.columns.expectedInterest'),
    type: 'currency'
  }
])
</script>
