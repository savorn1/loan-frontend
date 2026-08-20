<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.riskComplianceReports.guarantors.title')"
      :description="t('accounting.riskComplianceReports.guarantors.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.riskComplianceReportsHeader') },
        { label: t('accounting.riskComplianceReports.guarantors.title') }
      ]"
    />

    <UAlert
      v-if="pending"
      icon="i-heroicons-clock"
      color="primary"
      variant="subtle"
      class="mb-6"
      :title="t('admin.reports.heavyLoadHint')"
    />

    <UCard v-if="rows.length > 0" class="mb-6">
      <dl class="grid grid-cols-2 gap-y-3 text-sm">
        <dt class="text-gray-500">
          {{ t('accounting.riskComplianceReports.guarantors.activeCount') }}
        </dt>
        <dd class="font-semibold text-right">{{ activeCount }}</dd>
        <dt class="text-gray-500">
          {{ t('accounting.riskComplianceReports.guarantors.totalGuaranteedAmount') }}
        </dt>
        <dd class="font-semibold text-right">{{ formatCurrency(totalGuaranteedAmount) }}</dd>
      </dl>
    </UCard>

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-full sm:w-64"
          :placeholder="t('accounting.riskComplianceReports.guarantors.searchPlaceholder')"
        />
      </template>

      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable v-model:sort="sort" :rows="pagedRows" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-user-group"
            :title="t('accounting.riskComplianceReports.guarantors.emptyTitle')"
            :description="t('accounting.riskComplianceReports.guarantors.emptyDescription')"
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
import type { LoanResponse, LoanGuarantorResponse } from '~/features/loans/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

interface GuarantorRow {
  loanNo: string
  customer: string
  guarantorName: string
  phone: string
  relationship: string
  guaranteedAmount: number
  status: string
}

const { t } = useI18n()
const api = useApi()

const {
  data: loansRaw,
  pending: p1,
  error: e1
} = await useAsyncData('risk-guarantors-loans', () =>
  api<PageResponse<LoanResponse>>('/loans', { query: { size: 1000 } })
)
// Scoped to ACTIVE loans, matching the Collateral/LTV reports — the population
// a guarantee still meaningfully covers.
const loans = computed(() => (loansRaw.value?.content ?? []).filter((l) => l.status === 'ACTIVE'))

// No portfolio-wide guarantors endpoint exists — only per-loan
// (/loans/{id}/guarantors) — so fetch one call per loan.
const {
  data: guarantorsByLoan,
  pending: p2,
  error: e2
} = await useAsyncData(
  'risk-guarantors-items',
  () =>
    Promise.all(loans.value.map((l) => api<LoanGuarantorResponse[]>(`/loans/${l.id}/guarantors`))),
  { watch: [loans] }
)

const pending = computed(() => p1.value || p2.value)
const fetchError = computed(() => e1.value || e2.value)

const rows = computed<GuarantorRow[]>(() => {
  const result: GuarantorRow[] = []
  loans.value.forEach((loan, i) => {
    for (const g of guarantorsByLoan.value?.[i] ?? []) {
      result.push({
        loanNo: loan.loanNo,
        customer: loan.customerName,
        guarantorName: g.name,
        phone: g.phone,
        relationship: g.relationship ?? '—',
        guaranteedAmount: g.guaranteedAmount ?? 0,
        status: g.status
      })
    }
  })
  return result
})

const activeCount = computed(() => rows.value.filter((r) => r.status === 'ACTIVE').length)
const totalGuaranteedAmount = computed(() =>
  rows.value.filter((r) => r.status === 'ACTIVE').reduce((sum, r) => sum + r.guaranteedAmount, 0)
)

const {
  search,
  page,
  pageSize,
  sort,
  total,
  rows: pagedRows
} = useClientTable(rows, {
  searchFields: ['loanNo', 'customer', 'guarantorName'],
  pageSize: 15
})

const columns = computed<ColumnDef<GuarantorRow>[]>(() => [
  {
    key: 'loanNo',
    label: t('accounting.riskComplianceReports.guarantors.columns.loan'),
    sortable: true
  },
  {
    key: 'customer',
    label: t('accounting.riskComplianceReports.guarantors.columns.customer'),
    sortable: true
  },
  {
    key: 'guarantorName',
    label: t('accounting.riskComplianceReports.guarantors.columns.guarantor'),
    sortable: true
  },
  { key: 'phone', label: t('accounting.riskComplianceReports.guarantors.columns.phone') },
  {
    key: 'relationship',
    label: t('accounting.riskComplianceReports.guarantors.columns.relationship')
  },
  {
    key: 'guaranteedAmount',
    label: t('accounting.riskComplianceReports.guarantors.columns.guaranteedAmount'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'status',
    label: t('accounting.riskComplianceReports.guarantors.columns.status'),
    type: 'badge',
    color: (row) => (row.status === 'ACTIVE' ? 'teal' : 'gray'),
    sortable: true
  }
])
</script>
