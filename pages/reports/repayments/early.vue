<template>
  <div>
    <UButton to="/reports" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      {{ t('admin.reports.backToReports') }}
    </UButton>
    <PageHeader
      :title="t('accounting.repaymentReports.early.title')"
      :description="t('accounting.repaymentReports.early.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.repaymentReportsHeader') },
        { label: t('accounting.repaymentReports.early.title') }
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
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-56"
          :placeholder="t('accounting.repaymentReports.early.searchPlaceholder')"
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
            icon="i-heroicons-forward"
            :title="
              hasFullRange
                ? t('accounting.repaymentReports.early.emptyTitleNoActivity')
                : t('accounting.repaymentReports.early.emptyTitlePick')
            "
            :description="
              hasFullRange
                ? t('accounting.repaymentReports.early.emptyDescriptionNoActivity')
                : t('accounting.repaymentReports.early.emptyDescriptionPick')
            "
          />
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
      <p class="text-xs text-gray-500 mt-3">
        {{ t('accounting.repaymentReports.early.note') }}
      </p>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { PaymentResponse } from '~/features/payments/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

interface EarlyRow {
  loanId: number
  installmentNumber: number | null
  dueDate: string
  paidAt: string
  daysEarly: number
  amount: number
}

const { t } = useI18n()
const api = useApi()

const {
  data: paymentsRaw,
  pending,
  error: fetchError
} = await useAsyncData('repayments-early', () =>
  api<PageResponse<PaymentResponse>>('/payments', { query: { size: 1000 } })
)
const payments = computed(() => paymentsRaw.value?.content ?? [])

const dateFrom = ref('')
const dateTo = ref('')
const hasFullRange = computed(() => !!dateFrom.value && !!dateTo.value)

function daysBetween(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000)
}

const earlyRows = computed<EarlyRow[]>(() => {
  if (!hasFullRange.value) return []
  return payments.value
    .filter(
      (p): p is PaymentResponse & { paidAt: string } =>
        p.status === 'PAID' &&
        !!p.paidAt &&
        p.paidAt >= dateFrom.value &&
        p.paidAt <= dateTo.value &&
        p.paidAt < p.dueDate
    )
    .map((p) => ({
      loanId: p.loanId,
      installmentNumber: p.installmentNumber,
      dueDate: p.dueDate,
      paidAt: p.paidAt,
      daysEarly: daysBetween(p.paidAt, p.dueDate),
      amount: p.amount
    }))
})

const { search, page, pageSize, sort, total, rows } = useClientTable(earlyRows, {
  searchFields: ['loanId'],
  pageSize: 15
})

const columns = computed<ColumnDef<EarlyRow>[]>(() => [
  { key: 'loanId', label: t('accounting.repaymentReports.early.columns.loanId'), sortable: true },
  {
    key: 'installmentNumber',
    label: t('accounting.repaymentReports.early.columns.installmentNumber'),
    sortable: true
  },
  {
    key: 'dueDate',
    label: t('accounting.repaymentReports.early.columns.dueDate'),
    type: 'date',
    sortable: true
  },
  {
    key: 'paidAt',
    label: t('accounting.repaymentReports.early.columns.paidAt'),
    type: 'date',
    sortable: true
  },
  {
    key: 'daysEarly',
    label: t('accounting.repaymentReports.early.columns.daysEarly'),
    sortable: true
  },
  {
    key: 'amount',
    label: t('accounting.repaymentReports.early.columns.amount'),
    type: 'currency',
    sortable: true
  }
])
</script>
