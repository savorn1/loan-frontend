<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.generalLedgerReports.postingCoverage.title')"
      :description="t('accounting.generalLedgerReports.postingCoverage.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.generalLedgerReportsHeader') },
        { label: t('accounting.generalLedgerReports.postingCoverage.title') }
      ]"
    />

    <UAlert
      icon="i-heroicons-information-circle"
      color="primary"
      variant="subtle"
      class="mb-6"
      :title="t('accounting.generalLedgerReports.postingCoverage.note')"
    />

    <UCard class="mb-6">
      <UFormGroup :label="t('accounting.generalLedgerReports.postingCoverage.financialPeriod')">
        <USelectMenu
          v-model="financialPeriodId"
          :options="periodOptions"
          option-attribute="label"
          value-attribute="value"
          :placeholder="
            t('accounting.generalLedgerReports.postingCoverage.financialPeriodPlaceholder')
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

      <DataTable :rows="rows" :columns="columns" :loading="pending" :exportable="false">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-scale"
            :title="t('accounting.generalLedgerReports.postingCoverage.emptyTitle')"
            :description="t('accounting.generalLedgerReports.postingCoverage.emptyDescription')"
          />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type {
  FinancialPeriodResponse,
  JournalEntryResponse,
  TransactionType
} from '~/features/accounting/types'
import type { LoanResponse } from '~/features/loans/types'
import type { PaymentResponse } from '~/features/payments/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

interface CoverageRow {
  category: string
  operationalTotal: number
  glTotal: number
  variance: number
  matched: boolean
}

const { t } = useI18n()
const api = useApi()

const {
  data: periods,
  pending: p1,
  error: e1
} = await useAsyncData('posting-coverage-periods', () =>
  api<FinancialPeriodResponse[]>('/financial-periods')
)
const periodOptions = computed(() =>
  (periods.value ?? []).map((p) => ({ label: p.periodName, value: p.id }))
)
const selectedPeriod = computed(() =>
  (periods.value ?? []).find((p) => p.id === financialPeriodId.value)
)

const {
  data: loansRaw,
  pending: p2,
  error: e2
} = await useAsyncData('posting-coverage-loans', () =>
  api<PageResponse<LoanResponse>>('/loans', { query: { size: 1000 } })
)
const loans = computed(() => loansRaw.value?.content ?? [])

const {
  data: paymentsRaw,
  pending: p3,
  error: e3
} = await useAsyncData('posting-coverage-payments', () =>
  api<PageResponse<PaymentResponse>>('/payments', { query: { size: 1000 } })
)
const payments = computed(() => paymentsRaw.value?.content ?? [])

const {
  data: entriesRaw,
  pending: p4,
  error: e4
} = await useAsyncData('posting-coverage-entries', () =>
  api<JournalEntryResponse[]>('/journal-entries')
)
const entries = computed(() => entriesRaw.value ?? [])

const pending = computed(() => p1.value || p2.value || p3.value || p4.value)
const fetchError = computed(() => e1.value || e2.value || e3.value || e4.value)

const financialPeriodId = ref<number | undefined>(undefined)

// A balanced entry has DEBIT total === CREDIT total, so summing one side
// gives the entry's total posted amount without double-counting.
function entryAmount(entry: JournalEntryResponse) {
  return entry.lines.filter((l) => l.entrySide === 'DEBIT').reduce((sum, l) => sum + l.amount, 0)
}

function glTotalFor(transactionType: TransactionType) {
  if (!financialPeriodId.value) return 0
  return entries.value
    .filter(
      (e) =>
        e.status === 'POSTED' &&
        e.transactionType === transactionType &&
        e.financialPeriodId === financialPeriodId.value
    )
    .reduce((sum, e) => sum + entryAmount(e), 0)
}

const rows = computed<CoverageRow[]>(() => {
  const period = selectedPeriod.value
  if (!period) return []

  const disbursedTotal = loans.value
    .filter(
      (l) => l.disbursedAt && l.disbursedAt >= period.startDate && l.disbursedAt <= period.endDate
    )
    .reduce((sum, l) => sum + l.principal, 0)

  const paidInPeriod = payments.value.filter(
    (p) =>
      p.status === 'PAID' && p.paidAt && p.paidAt >= period.startDate && p.paidAt <= period.endDate
  )
  const principalCollected = paidInPeriod.reduce((sum, p) => sum + (p.principalComponent ?? 0), 0)
  const interestCollected = paidInPeriod.reduce((sum, p) => sum + (p.interestComponent ?? 0), 0)

  const categories: { key: string; operationalTotal: number; transactionType: TransactionType }[] =
    [
      {
        key: t('accounting.generalLedgerReports.postingCoverage.categories.disbursement'),
        operationalTotal: disbursedTotal,
        transactionType: 'DISBURSEMENT'
      },
      {
        key: t('accounting.generalLedgerReports.postingCoverage.categories.principalPayment'),
        operationalTotal: principalCollected,
        transactionType: 'PRINCIPAL_PAYMENT'
      },
      {
        key: t('accounting.generalLedgerReports.postingCoverage.categories.interestPayment'),
        operationalTotal: interestCollected,
        transactionType: 'INTEREST_PAYMENT'
      }
    ]

  return categories.map((c) => {
    const glTotal = glTotalFor(c.transactionType)
    const variance = Math.round((c.operationalTotal - glTotal) * 100) / 100
    return {
      category: c.key,
      operationalTotal: c.operationalTotal,
      glTotal,
      variance,
      matched: Math.abs(variance) < 0.01
    }
  })
})

const columns = computed<ColumnDef<CoverageRow>[]>(() => [
  { key: 'category', label: t('accounting.generalLedgerReports.postingCoverage.columns.category') },
  {
    key: 'operationalTotal',
    label: t('accounting.generalLedgerReports.postingCoverage.columns.operationalTotal'),
    type: 'currency'
  },
  {
    key: 'glTotal',
    label: t('accounting.generalLedgerReports.postingCoverage.columns.glTotal'),
    type: 'currency'
  },
  {
    key: 'variance',
    label: t('accounting.generalLedgerReports.postingCoverage.columns.variance'),
    type: 'currency'
  },
  {
    key: 'matched',
    label: t('accounting.generalLedgerReports.postingCoverage.columns.matched'),
    type: 'boolean',
    trueLabel: t('accounting.generalLedgerReports.postingCoverage.matched'),
    trueColor: 'green',
    falseLabel: t('accounting.generalLedgerReports.postingCoverage.mismatched'),
    falseColor: 'amber'
  }
])
</script>
