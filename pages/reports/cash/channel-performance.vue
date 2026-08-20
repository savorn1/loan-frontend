<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.cashReports.channelPerformance.title')"
      :description="t('accounting.cashReports.channelPerformance.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.cashReportsHeader') },
        { label: t('accounting.cashReports.channelPerformance.title') }
      ]"
    />

    <UAlert
      v-if="fetchError"
      color="red"
      variant="subtle"
      class="mb-4"
      :title="apiErrorMessage(fetchError)"
    />

    <UCard class="mb-6">
      <template #header>
        <span class="font-semibold">{{
          t('accounting.cashReports.channelPerformance.byChannelHeader')
        }}</span>
      </template>
      <DataTable :rows="byChannel" :columns="columns" :loading="pending" :exportable="false" />
    </UCard>

    <UCard>
      <template #header>
        <span class="font-semibold">{{
          t('accounting.cashReports.channelPerformance.byGatewayHeader')
        }}</span>
      </template>
      <DataTable :rows="byGateway" :columns="columns" :loading="pending" :exportable="false" />
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { PaymentTransactionResponse } from '~/features/payments/types'
import type { ColumnDef } from '~/shared/types'

interface PerformanceRow {
  name: string
  transactionCount: number
  totalAmount: number
  successCount: number
  failedCount: number
  successRate: number
}

const { t } = useI18n()
const api = useApi()

const {
  data: transactionsRaw,
  pending,
  error: fetchError
} = await useAsyncData('cash-channel-performance', () =>
  api<PaymentTransactionResponse[]>('/payments/transactions')
)
const transactions = computed(() => transactionsRaw.value ?? [])

function aggregate(keyFn: (t: PaymentTransactionResponse) => string): PerformanceRow[] {
  const byKey = new Map<string, PerformanceRow>()
  for (const txn of transactions.value) {
    const name = keyFn(txn)
    const existing = byKey.get(name) ?? {
      name,
      transactionCount: 0,
      totalAmount: 0,
      successCount: 0,
      failedCount: 0,
      successRate: 0
    }
    existing.transactionCount += 1
    existing.totalAmount += txn.amount
    if (txn.status === 'SUCCESS') existing.successCount += 1
    if (txn.status === 'FAILED') existing.failedCount += 1
    byKey.set(name, existing)
  }
  return [...byKey.values()]
    .map((row) => ({
      ...row,
      successRate:
        row.transactionCount > 0
          ? Math.round((row.successCount / row.transactionCount) * 1000) / 10
          : 0
    }))
    .sort((a, b) => b.transactionCount - a.transactionCount)
}

const byChannel = computed(() => aggregate((txn) => txn.paymentChannelName))
const byGateway = computed(() => aggregate((txn) => txn.paymentGatewayName))

const columns = computed<ColumnDef<PerformanceRow>[]>(() => [
  { key: 'name', label: t('accounting.cashReports.channelPerformance.columns.name') },
  {
    key: 'transactionCount',
    label: t('accounting.cashReports.channelPerformance.columns.transactionCount')
  },
  {
    key: 'totalAmount',
    label: t('accounting.cashReports.channelPerformance.columns.totalAmount'),
    type: 'currency'
  },
  {
    key: 'successCount',
    label: t('accounting.cashReports.channelPerformance.columns.successCount')
  },
  { key: 'failedCount', label: t('accounting.cashReports.channelPerformance.columns.failedCount') },
  {
    key: 'successRate',
    label: t('accounting.cashReports.channelPerformance.columns.successRate'),
    type: 'percent'
  }
])
</script>
