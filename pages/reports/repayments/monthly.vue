<template>
  <div>
    <UButton to="/reports" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      {{ t('admin.reports.backToReports') }}
    </UButton>
    <PageHeader
      :title="t('accounting.repaymentReports.monthly.title')"
      :description="t('accounting.repaymentReports.monthly.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.repaymentReportsHeader') },
        { label: t('accounting.repaymentReports.monthly.title') }
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
            icon="i-heroicons-calendar-days"
            :title="
              hasFullRange
                ? t('accounting.repaymentReports.monthly.emptyTitleNoActivity')
                : t('accounting.repaymentReports.monthly.emptyTitlePick')
            "
            :description="
              hasFullRange
                ? t('accounting.repaymentReports.monthly.emptyDescriptionNoActivity')
                : t('accounting.repaymentReports.monthly.emptyDescriptionPick')
            "
          />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { PaymentResponse } from '~/features/payments/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

interface MonthlyRow {
  month: string
  count: number
  totalAmount: number
  totalPrincipal: number
  totalInterest: number
}

const { t } = useI18n()
const api = useApi()

const {
  data: paymentsRaw,
  pending,
  error: fetchError
} = await useAsyncData('repayments-monthly', () =>
  api<PageResponse<PaymentResponse>>('/payments', { query: { size: 1000 } })
)
const payments = computed(() => paymentsRaw.value?.content ?? [])

const dateFrom = ref('')
const dateTo = ref('')
const hasFullRange = computed(() => !!dateFrom.value && !!dateTo.value)

const rows = computed<MonthlyRow[]>(() => {
  if (!hasFullRange.value) return []
  const byMonth = new Map<string, MonthlyRow>()
  for (const p of payments.value) {
    if (p.status !== 'PAID' || !p.paidAt) continue
    if (p.paidAt < dateFrom.value || p.paidAt > dateTo.value) continue
    const month = p.paidAt.slice(0, 7)
    const existing = byMonth.get(month) ?? {
      month,
      count: 0,
      totalAmount: 0,
      totalPrincipal: 0,
      totalInterest: 0
    }
    existing.count += 1
    existing.totalAmount += p.amount
    existing.totalPrincipal += p.principalComponent ?? 0
    existing.totalInterest += p.interestComponent ?? 0
    byMonth.set(month, existing)
  }
  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month))
})

const columns = computed<ColumnDef<MonthlyRow>[]>(() => [
  { key: 'month', label: t('accounting.repaymentReports.monthly.columns.month') },
  { key: 'count', label: t('accounting.repaymentReports.monthly.columns.count') },
  {
    key: 'totalAmount',
    label: t('accounting.repaymentReports.monthly.columns.totalAmount'),
    type: 'currency'
  },
  {
    key: 'totalPrincipal',
    label: t('accounting.repaymentReports.monthly.columns.totalPrincipal'),
    type: 'currency'
  },
  {
    key: 'totalInterest',
    label: t('accounting.repaymentReports.monthly.columns.totalInterest'),
    type: 'currency'
  }
])
</script>
