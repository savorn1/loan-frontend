<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.cashReports.cashFlow.title')"
      :description="t('accounting.cashReports.cashFlow.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.cashReportsHeader') },
        { label: t('accounting.cashReports.cashFlow.title') }
      ]"
    />

    <UCard v-if="rows.length > 0" class="mb-6">
      <dl class="grid grid-cols-3 gap-y-3 text-sm">
        <dt class="text-gray-500">{{ t('accounting.cashReports.cashFlow.totalDisbursed') }}</dt>
        <dd class="font-semibold col-span-2 text-right">{{ formatCurrency(totalDisbursed) }}</dd>
        <dt class="text-gray-500">{{ t('accounting.cashReports.cashFlow.totalCollected') }}</dt>
        <dd class="font-semibold col-span-2 text-right">{{ formatCurrency(totalCollected) }}</dd>
        <dt class="text-gray-500">{{ t('accounting.cashReports.cashFlow.netCashFlow') }}</dt>
        <dd class="font-semibold col-span-2 text-right">{{ formatCurrency(netCashFlow) }}</dd>
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

      <DataTable :rows="rows" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-arrows-right-left"
            :title="t('accounting.cashReports.cashFlow.emptyTitle')"
            :description="t('accounting.cashReports.cashFlow.emptyDescription')"
          />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { DisbursementTrendPoint, CollectionTrendPoint } from '~/features/reports/types'
import type { ColumnDef } from '~/shared/types'

interface CashFlowRow {
  month: string
  totalDisbursed: number
  totalCollected: number
  netCashFlow: number
}

const { t } = useI18n()
const api = useApi()

const [
  { data: disbursementTrend, pending: p1, error: e1 },
  { data: collectionTrend, pending: p2, error: e2 }
] = await Promise.all([
  useAsyncData('cash-flow-disbursement-trend', () =>
    api<DisbursementTrendPoint[]>('/loans/reports/disbursement-trend')
  ),
  useAsyncData('cash-flow-collection-trend', () =>
    api<CollectionTrendPoint[]>('/payments/reports/collection-trend')
  )
])
const pending = computed(() => p1.value || p2.value)
const fetchError = computed(() => e1.value || e2.value)

const rows = computed<CashFlowRow[]>(() => {
  const disbursedByMonth = new Map(
    (disbursementTrend.value ?? []).map((p) => [p.month, p.totalDisbursed])
  )
  const collectedByMonth = new Map(
    (collectionTrend.value ?? []).map((p) => [p.month, p.totalCollected])
  )
  const months = [...new Set([...disbursedByMonth.keys(), ...collectedByMonth.keys()])].sort()
  return months.map((month) => {
    const totalDisbursed = disbursedByMonth.get(month) ?? 0
    const totalCollected = collectedByMonth.get(month) ?? 0
    return { month, totalDisbursed, totalCollected, netCashFlow: totalCollected - totalDisbursed }
  })
})

const totalDisbursed = computed(() => rows.value.reduce((sum, r) => sum + r.totalDisbursed, 0))
const totalCollected = computed(() => rows.value.reduce((sum, r) => sum + r.totalCollected, 0))
const netCashFlow = computed(() => totalCollected.value - totalDisbursed.value)

const columns = computed<ColumnDef<CashFlowRow>[]>(() => [
  { key: 'month', label: t('accounting.cashReports.cashFlow.columns.month') },
  {
    key: 'totalDisbursed',
    label: t('accounting.cashReports.cashFlow.columns.totalDisbursed'),
    type: 'currency'
  },
  {
    key: 'totalCollected',
    label: t('accounting.cashReports.cashFlow.columns.totalCollected'),
    type: 'currency'
  },
  {
    key: 'netCashFlow',
    label: t('accounting.cashReports.cashFlow.columns.netCashFlow'),
    type: 'currency'
  }
])
</script>
