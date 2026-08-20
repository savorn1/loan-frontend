<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.repaymentReports.firstPaymentDefault.title')"
      :description="t('accounting.repaymentReports.firstPaymentDefault.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.repaymentReportsHeader') },
        { label: t('accounting.repaymentReports.firstPaymentDefault.title') }
      ]"
    />

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-full sm:w-64"
          :placeholder="t('accounting.repaymentReports.firstPaymentDefault.searchPlaceholder')"
        />
      </template>

      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable v-model:sort="sort" :rows="rows" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-exclamation-triangle"
            :title="t('accounting.repaymentReports.firstPaymentDefault.emptyTitle')"
            :description="t('accounting.repaymentReports.firstPaymentDefault.emptyDescription')"
          />
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { LoanResponse } from '~/features/loans/types'
import type { PaymentResponse } from '~/features/payments/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

interface FpdRow {
  loanId: number
  loanNo: string
  customer: string
  dueDate: string
  paidAt: string | null
  daysLate: number
  amount: number
}

const { t } = useI18n()
const api = useApi()

const {
  data: loansRaw,
  pending: p1,
  error: e1
} = await useAsyncData('first-payment-default-loans', () =>
  api<PageResponse<LoanResponse>>('/loans', { query: { size: 1000 } })
)
const loans = computed(() => loansRaw.value?.content ?? [])
const loanById = computed(() => new Map(loans.value.map((l) => [l.id, l])))

const {
  data: paymentsRaw,
  pending: p2,
  error: e2
} = await useAsyncData('first-payment-default-payments', () =>
  api<PageResponse<PaymentResponse>>('/payments', { query: { size: 1000 } })
)
const payments = computed(() => paymentsRaw.value?.content ?? [])

const pending = computed(() => p1.value || p2.value)
const fetchError = computed(() => e1.value || e2.value)

function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const todayIso = toIsoDate(new Date())

function daysBetween(from: string, to: string) {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000)
}

// A loan's very first installment either still unpaid past its due date, or
// paid but only after that due date — the classic "first payment default" signal.
const defaults = computed<FpdRow[]>(() => {
  const rows: FpdRow[] = []
  for (const p of payments.value) {
    if (p.installmentNumber !== 1) continue
    const stillOverdue = p.status !== 'PAID' && p.dueDate < todayIso
    const paidLate = p.status === 'PAID' && !!p.paidAt && p.paidAt > p.dueDate
    if (!stillOverdue && !paidLate) continue
    const loan = loanById.value.get(p.loanId)
    rows.push({
      loanId: p.loanId,
      loanNo: loan?.loanNo ?? String(p.loanId),
      customer: loan?.customerName ?? '—',
      dueDate: p.dueDate,
      paidAt: p.paidAt,
      daysLate: daysBetween(p.dueDate, p.paidAt ?? todayIso),
      amount: p.amount
    })
  }
  return rows.sort((a, b) => b.daysLate - a.daysLate)
})

const { search, page, pageSize, sort, total, rows } = useClientTable(defaults, {
  searchFields: ['loanNo', 'customer'],
  pageSize: 15
})

const columns = computed<ColumnDef<FpdRow>[]>(() => [
  {
    key: 'loanNo',
    label: t('accounting.repaymentReports.firstPaymentDefault.columns.loan'),
    sortable: true
  },
  {
    key: 'customer',
    label: t('accounting.repaymentReports.firstPaymentDefault.columns.customer'),
    sortable: true
  },
  {
    key: 'dueDate',
    label: t('accounting.repaymentReports.firstPaymentDefault.columns.dueDate'),
    type: 'date',
    sortable: true
  },
  {
    key: 'paidAt',
    label: t('accounting.repaymentReports.firstPaymentDefault.columns.paidAt'),
    type: 'date',
    sortable: true
  },
  {
    key: 'daysLate',
    label: t('accounting.repaymentReports.firstPaymentDefault.columns.daysLate'),
    sortable: true
  },
  {
    key: 'amount',
    label: t('accounting.repaymentReports.firstPaymentDefault.columns.amount'),
    type: 'currency',
    sortable: true
  }
])
</script>
