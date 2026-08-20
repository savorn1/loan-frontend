<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.writeoffRestructureReports.recovery.title')"
      :description="t('accounting.writeoffRestructureReports.recovery.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.writeoffRestructureReportsHeader') },
        { label: t('accounting.writeoffRestructureReports.recovery.title') }
      ]"
    />

    <UCard v-if="rows.length > 0" class="mb-6">
      <dl class="grid grid-cols-3 gap-y-3 text-sm">
        <dt class="text-gray-500">
          {{ t('accounting.writeoffRestructureReports.recovery.totalWrittenOff') }}
        </dt>
        <dd class="font-semibold col-span-2 text-right">{{ formatCurrency(totalWrittenOff) }}</dd>
        <dt class="text-gray-500">
          {{ t('accounting.writeoffRestructureReports.recovery.totalRecovered') }}
        </dt>
        <dd class="font-semibold col-span-2 text-right">{{ formatCurrency(totalRecovered) }}</dd>
        <dt class="text-gray-500">
          {{ t('accounting.writeoffRestructureReports.recovery.recoveryRate') }}
        </dt>
        <dd class="font-semibold col-span-2 text-right">{{ recoveryRate.toFixed(1) }}%</dd>
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
            icon="i-heroicons-arrow-uturn-left"
            :title="t('accounting.writeoffRestructureReports.recovery.emptyTitle')"
            :description="t('accounting.writeoffRestructureReports.recovery.emptyDescription')"
          />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { LoanWriteoffResponse, LoanWriteoffRecoveryResponse } from '~/features/loans/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

interface RecoveryRow {
  loanId: number
  writeoffAmount: number
  writeoffDate: string
  recoveredAmount: number
  recoveryRate: number
  status: string
}

const { t } = useI18n()
const api = useApi()

const {
  data: writeoffsRaw,
  pending,
  error: fetchError
} = await useAsyncData('writeoff-recovery-writeoffs', () =>
  api<PageResponse<LoanWriteoffResponse>>('/loans/writeoffs', { query: { size: 1000 } })
)
const writeoffs = computed(() => writeoffsRaw.value?.content ?? [])

// No portfolio-wide recoveries endpoint exists — only per-loan
// (/loans/{loanId}/writeoff/recoveries) — so fetch one call per write-off.
// Bounded by the write-off count, which is small relative to the full loan book.
const { data: recoveriesByWriteoff } = await useAsyncData(
  'writeoff-recovery-recoveries',
  () =>
    Promise.all(
      writeoffs.value.map((w) =>
        api<LoanWriteoffRecoveryResponse[]>(`/loans/${w.loanId}/writeoff/recoveries`)
      )
    ),
  { watch: [writeoffs] }
)

const rows = computed<RecoveryRow[]>(() =>
  writeoffs.value.map((w, i) => {
    const recovered = (recoveriesByWriteoff.value?.[i] ?? []).reduce((sum, r) => sum + r.amount, 0)
    return {
      loanId: w.loanId,
      writeoffAmount: w.amount,
      writeoffDate: w.writeoffDate,
      recoveredAmount: recovered,
      recoveryRate: w.amount > 0 ? Math.round((recovered / w.amount) * 1000) / 10 : 0,
      status: w.status
    }
  })
)

const totalWrittenOff = computed(() => rows.value.reduce((sum, r) => sum + r.writeoffAmount, 0))
const totalRecovered = computed(() => rows.value.reduce((sum, r) => sum + r.recoveredAmount, 0))
const recoveryRate = computed(() =>
  totalWrittenOff.value > 0 ? (totalRecovered.value / totalWrittenOff.value) * 100 : 0
)

const columns = computed<ColumnDef<RecoveryRow>[]>(() => [
  { key: 'loanId', label: t('accounting.writeoffRestructureReports.recovery.columns.loan') },
  {
    key: 'writeoffDate',
    label: t('accounting.writeoffRestructureReports.recovery.columns.writeoffDate'),
    type: 'date'
  },
  {
    key: 'writeoffAmount',
    label: t('accounting.writeoffRestructureReports.recovery.columns.writeoffAmount'),
    type: 'currency'
  },
  {
    key: 'recoveredAmount',
    label: t('accounting.writeoffRestructureReports.recovery.columns.recoveredAmount'),
    type: 'currency'
  },
  {
    key: 'recoveryRate',
    label: t('accounting.writeoffRestructureReports.recovery.columns.recoveryRate'),
    type: 'percent'
  },
  {
    key: 'status',
    label: t('accounting.writeoffRestructureReports.recovery.columns.status'),
    type: 'status'
  }
])
</script>
