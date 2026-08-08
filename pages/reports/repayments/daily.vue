<template>
  <div>
    <PageHeader
      :title="t('accounting.repaymentReports.daily.title')"
      :description="t('accounting.repaymentReports.daily.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.repaymentReportsHeader') },
        { label: t('accounting.repaymentReports.daily.title') }
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
                ? t('accounting.repaymentReports.daily.emptyTitleNoActivity')
                : t('accounting.repaymentReports.daily.emptyTitlePick')
            "
            :description="
              hasFullRange
                ? t('accounting.repaymentReports.daily.emptyDescriptionNoActivity')
                : t('accounting.repaymentReports.daily.emptyDescriptionPick')
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

interface DailyRow {
  date: string
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
} = await useAsyncData('repayments-daily', () =>
  api<PageResponse<PaymentResponse>>('/payments', { query: { size: 1000 } })
)
const payments = computed(() => paymentsRaw.value?.content ?? [])

const dateFrom = ref('')
const dateTo = ref('')
const hasFullRange = computed(() => !!dateFrom.value && !!dateTo.value)

const rows = computed<DailyRow[]>(() => {
  if (!hasFullRange.value) return []
  const byDate = new Map<string, DailyRow>()
  for (const p of payments.value) {
    if (p.status !== 'PAID' || !p.paidAt) continue
    if (p.paidAt < dateFrom.value || p.paidAt > dateTo.value) continue
    const existing = byDate.get(p.paidAt) ?? {
      date: p.paidAt,
      count: 0,
      totalAmount: 0,
      totalPrincipal: 0,
      totalInterest: 0
    }
    existing.count += 1
    existing.totalAmount += p.amount
    existing.totalPrincipal += p.principalComponent ?? 0
    existing.totalInterest += p.interestComponent ?? 0
    byDate.set(p.paidAt, existing)
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
})

const columns = computed<ColumnDef<DailyRow>[]>(() => [
  { key: 'date', label: t('accounting.repaymentReports.daily.columns.date'), type: 'date' },
  { key: 'count', label: t('accounting.repaymentReports.daily.columns.count') },
  {
    key: 'totalAmount',
    label: t('accounting.repaymentReports.daily.columns.totalAmount'),
    type: 'currency'
  },
  {
    key: 'totalPrincipal',
    label: t('accounting.repaymentReports.daily.columns.totalPrincipal'),
    type: 'currency'
  },
  {
    key: 'totalInterest',
    label: t('accounting.repaymentReports.daily.columns.totalInterest'),
    type: 'currency'
  }
])
</script>
