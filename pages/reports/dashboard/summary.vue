<template>
  <div>
    <UButton to="/reports" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      {{ t('admin.reports.title') }}
    </UButton>
    <PageHeader
      :title="t('accounting.dashboardReports.summary.title')"
      :description="t('accounting.dashboardReports.summary.description')"
    />

    <UAlert
      v-if="fetchError"
      color="red"
      variant="subtle"
      class="mb-4"
      :title="apiErrorMessage(fetchError)"
    />

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <UCard>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('accounting.dashboardReports.summary.totalActiveLoans') }}
        </div>
        <div class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
          {{ totalActiveLoans }}
        </div>
      </UCard>
      <UCard>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('accounting.dashboardReports.summary.totalOutstandingBalance') }}
        </div>
        <div class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
          {{ formatCurrency(totalOutstandingBalance) }}
        </div>
      </UCard>
      <UCard>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('accounting.dashboardReports.summary.totalDisbursedToday') }}
        </div>
        <div class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
          {{ formatCurrency(totalDisbursedToday) }}
        </div>
      </UCard>
      <UCard>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('accounting.dashboardReports.summary.totalCollectedToday') }}
        </div>
        <div class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
          {{ formatCurrency(totalCollectedToday) }}
        </div>
      </UCard>
      <UCard>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('accounting.dashboardReports.summary.totalOverdueAmount') }}
        </div>
        <div class="text-2xl font-semibold text-red-500 mt-1">
          {{ formatCurrency(totalOverdueAmount) }}
        </div>
      </UCard>
      <UCard>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('accounting.dashboardReports.summary.loansDueToday') }}
        </div>
        <div class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
          {{ loansDueToday }}
        </div>
      </UCard>
      <UCard>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('accounting.dashboardReports.summary.newLoanApplications') }}
        </div>
        <div class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
          {{ newLoanApplicationsToday }}
        </div>
      </UCard>
      <UCard>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('accounting.dashboardReports.summary.portfolioAtRisk') }}
        </div>
        <div class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
          {{ portfolioAtRiskPercent.toFixed(1) }}%
        </div>
      </UCard>
      <UCard>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('accounting.dashboardReports.summary.nonPerformingLoans') }}
        </div>
        <div class="text-2xl font-semibold text-red-500 mt-1">{{ nonPerformingLoanCount }}</div>
      </UCard>
      <UCard>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('accounting.dashboardReports.summary.averageLoanAmount') }}
        </div>
        <div class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
          {{ formatCurrency(averageLoanAmount) }}
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LoanResponse, ApplicationResponse } from '~/features/loans/types'
import type { PaymentResponse } from '~/features/payments/types'
import type { ParSummaryResponse, PortfolioSummaryResponse } from '~/features/reports/types'
import type { PageResponse } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

function todayIsoDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const todayIso = todayIsoDate()

const [
  { data: portfolio, error: e1 },
  { data: parSummary, error: e2 },
  { data: loansRaw, error: e3 },
  { data: paymentsRaw, error: e4 },
  { data: applicationsRaw, error: e5 }
] = await Promise.all([
  useAsyncData('dashboard-summary-portfolio', () =>
    api<PortfolioSummaryResponse>('/loans/reports/portfolio-summary')
  ),
  useAsyncData('dashboard-summary-par', () =>
    api<ParSummaryResponse>('/payments/reports/par-summary')
  ),
  useAsyncData('dashboard-summary-loans', () =>
    api<PageResponse<LoanResponse>>('/loans', { query: { size: 1000 } })
  ),
  useAsyncData('dashboard-summary-payments', () =>
    api<PageResponse<PaymentResponse>>('/payments', { query: { size: 1000 } })
  ),
  useAsyncData('dashboard-summary-applications', () =>
    api<PageResponse<ApplicationResponse>>('/loans/applications', { query: { size: 1000 } })
  )
])

const fetchError = computed(() => e1.value || e2.value || e3.value || e4.value || e5.value)

const loans = computed(() => loansRaw.value?.content ?? [])
const payments = computed(() => paymentsRaw.value?.content ?? [])
const applications = computed(() => applicationsRaw.value?.content ?? [])

const totalActiveLoans = computed(() => portfolio.value?.activeLoanCount ?? 0)
const totalOutstandingBalance = computed(() => portfolio.value?.totalOutstandingBalance ?? 0)

const totalDisbursedToday = computed(() =>
  loans.value
    .filter((l) => l.disbursedAt?.slice(0, 10) === todayIso)
    .reduce((sum, l) => sum + l.principal, 0)
)

const totalCollectedToday = computed(() =>
  payments.value
    .filter((p) => p.status === 'PAID' && p.paidAt?.slice(0, 10) === todayIso)
    .reduce((sum, p) => sum + p.amount, 0)
)

const totalOverdueAmount = computed(() => parSummary.value?.totalOverdueAmount ?? 0)

const loansDueToday = computed(
  () =>
    new Set(
      payments.value
        .filter((p) => p.status === 'PENDING' && p.dueDate === todayIso)
        .map((p) => p.loanId)
    ).size
)

const newLoanApplicationsToday = computed(
  () => applications.value.filter((a) => a.submittedAt?.slice(0, 10) === todayIso).length
)

const portfolioAtRiskPercent = computed(() => parSummary.value?.portfolioAtRiskPercent ?? 0)

const nonPerformingLoanCount = computed(
  () => parSummary.value?.buckets.find((b) => b.bucket === 'DPD_90_PLUS')?.loanCount ?? 0
)

const averageLoanAmount = computed(() => {
  const count = portfolio.value?.activeLoanCount ?? 0
  if (count === 0) return 0
  return (portfolio.value?.totalPrincipal ?? 0) / count
})
</script>
