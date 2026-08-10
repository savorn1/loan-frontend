<template>
  <div>
    <UButton to="/reports" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      {{ t('admin.reports.backToReports') }}
    </UButton>
    <PageHeader
      :title="t('accounting.riskComplianceReports.concentrationRisk.title')"
      :description="t('accounting.riskComplianceReports.concentrationRisk.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.riskComplianceReportsHeader') },
        { label: t('accounting.riskComplianceReports.concentrationRisk.title') }
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
          t('accounting.riskComplianceReports.concentrationRisk.byBranchHeader')
        }}</span>
      </template>
      <DataTable
        :rows="branchRows"
        :columns="branchColumns"
        :loading="pending"
        :exportable="false"
      />
    </UCard>

    <UCard>
      <template #header>
        <span class="font-semibold">{{
          t('accounting.riskComplianceReports.concentrationRisk.topBorrowersHeader')
        }}</span>
      </template>
      <DataTable
        :rows="borrowerRows"
        :columns="borrowerColumns"
        :loading="pending"
        :exportable="false"
      />
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { BranchResponse } from '~/features/branches/types'
import type { CustomerResponse } from '~/features/customers/types'
import type {
  BorrowerConcentrationRow,
  BranchConcentrationRow,
  ConcentrationRiskResponse
} from '~/features/reports/types'
import type { ColumnDef, PageResponse } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

const [
  { data: concentration, pending: p1, error: e1 },
  { data: branches },
  { data: customersRaw }
] = await Promise.all([
  useAsyncData('risk-concentration', () =>
    api<ConcentrationRiskResponse>('/loans/reports/concentration-risk', { query: { topN: 10 } })
  ),
  useAsyncData('risk-concentration-branches', () => api<BranchResponse[]>('/branches')),
  useAsyncData('risk-concentration-customers', () =>
    api<PageResponse<CustomerResponse>>('/customers', { query: { size: 1000 } })
  )
])

const pending = computed(() => p1.value)
const fetchError = computed(() => e1.value)

const branchNameById = computed(() => new Map((branches.value ?? []).map((b) => [b.id, b.name])))
const customerNameById = computed(
  () => new Map((customersRaw.value?.content ?? []).map((c) => [c.id, c.fullName]))
)

const branchRows = computed(() => concentration.value?.byBranch ?? [])
const borrowerRows = computed(() => concentration.value?.topBorrowers ?? [])

const branchColumns = computed<ColumnDef<BranchConcentrationRow>[]>(() => [
  {
    key: 'branchId',
    label: t('accounting.riskComplianceReports.concentrationRisk.columns.branch'),
    value: (row) =>
      row.branchId != null ? (branchNameById.value.get(row.branchId) ?? String(row.branchId)) : '—'
  },
  {
    key: 'loanCount',
    label: t('accounting.riskComplianceReports.concentrationRisk.columns.loanCount')
  },
  {
    key: 'outstandingBalance',
    label: t('accounting.riskComplianceReports.concentrationRisk.columns.outstandingBalance'),
    type: 'currency'
  },
  {
    key: 'percentOfPortfolio',
    label: t('accounting.riskComplianceReports.concentrationRisk.columns.percentOfPortfolio'),
    type: 'percent'
  }
])

const borrowerColumns = computed<ColumnDef<BorrowerConcentrationRow>[]>(() => [
  {
    key: 'customerId',
    label: t('accounting.riskComplianceReports.concentrationRisk.columns.customer'),
    value: (row) => customerNameById.value.get(row.customerId) ?? String(row.customerId)
  },
  {
    key: 'loanCount',
    label: t('accounting.riskComplianceReports.concentrationRisk.columns.loanCount')
  },
  {
    key: 'outstandingBalance',
    label: t('accounting.riskComplianceReports.concentrationRisk.columns.outstandingBalance'),
    type: 'currency'
  },
  {
    key: 'percentOfPortfolio',
    label: t('accounting.riskComplianceReports.concentrationRisk.columns.percentOfPortfolio'),
    type: 'percent'
  }
])
</script>
