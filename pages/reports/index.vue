<template>
  <div>
    <PageHeader :title="t('admin.reports.title')" :description="t('admin.reports.description')" />

    <UCard class="mb-6">
      <UInput
        v-model="globalSearch"
        icon="i-heroicons-magnifying-glass"
        size="lg"
        :placeholder="t('admin.reports.globalSearchPlaceholder')"
      />
    </UCard>

    <UCard v-if="globalSearch.trim()">
      <template #header>
        <span class="font-semibold">{{
          t('admin.reports.globalSearchResultsHeader', { count: globalSearchResults.length })
        }}</span>
      </template>
      <DataTable
        :rows="globalSearchResults"
        :columns="globalSearchColumns"
        :exportable="false"
        @select="(row: SearchResultTile) => router.push(row.to)"
      >
        <template #label-data="{ row }">
          <div class="flex items-center gap-3">
            <div
              class="shrink-0 rounded-lg p-2 bg-primary-50 dark:bg-primary-400/10 text-primary-500 dark:text-primary-300"
            >
              <UIcon :name="row.icon" class="w-5 h-5" />
            </div>
            <span class="font-medium text-gray-900 dark:text-white">{{ row.label }}</span>
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-magnifying-glass"
            :title="t('common.noMatches')"
            :description="t('common.nothingMatches', { query: globalSearch })"
          />
        </template>
      </DataTable>
    </UCard>

    <template v-else>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <template v-if="loading">
          <UCard v-for="i in 4" :key="i">
            <div class="flex items-center gap-4">
              <USkeleton class="w-10 h-10 rounded-lg shrink-0" />
              <div class="min-w-0 flex-1 space-y-2">
                <USkeleton class="h-3 w-20" />
                <USkeleton class="h-6 w-16" />
              </div>
            </div>
          </UCard>
        </template>
        <template v-else>
          <UCard v-for="tile in statTiles" :key="tile.label">
            <div class="flex items-center gap-4">
              <div class="shrink-0 rounded-xl p-2.5 text-white shadow-sm" :class="tile.iconBg">
                <UIcon :name="tile.icon" class="w-5 h-5" />
              </div>
              <div class="min-w-0">
                <div class="text-sm text-gray-500 dark:text-gray-400">{{ tile.label }}</div>
                <div class="text-2xl font-semibold text-gray-900 dark:text-white">
                  {{ tile.value }}
                </div>
              </div>
            </div>
          </UCard>
        </template>
      </div>

      <UCard class="mb-6">
        <template #header>
          <span class="font-semibold">{{ t('admin.reports.loansByStatusHeader') }}</span>
        </template>
        <div v-if="loading" class="h-24">
          <USkeleton class="w-full h-full" />
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div
            v-for="s in statusBreakdown"
            :key="s.status"
            class="rounded-lg border border-gray-100 dark:border-gray-800 p-4"
          >
            <StatusBadge :status="s.status" class="mb-2" />
            <div class="text-xl font-semibold text-gray-900 dark:text-white">
              {{ formatCurrency(s.totalPrincipal) }}
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              {{
                s.loanCount === 1
                  ? t('admin.reports.loanCount.one')
                  : t('admin.reports.loanCount.other', { count: s.loanCount })
              }}
            </div>
          </div>
        </div>
      </UCard>

      <UCard class="mb-6">
        <template #header>
          <span class="font-semibold">{{ t('admin.reports.parByBucketHeader') }}</span>
        </template>
        <div v-if="loading" class="h-32">
          <USkeleton class="w-full h-full" />
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            v-for="b in parSummary?.buckets ?? []"
            :key="b.bucket"
            class="rounded-lg border border-gray-100 dark:border-gray-800 p-4"
          >
            <UBadge :color="bucketColor(b.bucket)" variant="subtle" class="mb-2">{{
              bucketLabel(b.bucket)
            }}</UBadge>
            <div class="text-xl font-semibold text-gray-900 dark:text-white">
              {{ formatCurrency(b.overdueAmount) }}
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              {{
                b.loanCount === 1
                  ? t('admin.reports.loanCount.one')
                  : t('admin.reports.loanCount.other', { count: b.loanCount })
              }}
            </div>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('admin.reports.trendsHeader') }}</span>
        </template>
        <div v-if="loading" class="h-64">
          <USkeleton class="w-full h-full" />
        </div>
        <div v-else class="h-64">
          <ClientOnly>
            <Line :data="trendChartData" :options="trendChartOptions" />
          </ClientOnly>
        </div>
      </UCard>

      <ReportCategoryCard
        :title="t('admin.reports.generalLedgerReportsHeader')"
        :tiles="generalLedgerReportTiles"
      />

      <ReportCategoryCard
        :title="t('admin.reports.trialBalanceReportsHeader')"
        :tiles="trialBalanceReportTiles"
      />

      <ReportCategoryCard
        :title="t('admin.reports.financialStatementsHeader')"
        :tiles="financialStatementTiles"
      />

      <ReportCategoryCard
        :title="t('admin.reports.loanAccountingReportsHeader')"
        :tiles="loanAccountingReportTiles"
      />

      <ReportCategoryCard
        :title="t('admin.reports.receivablesReportsHeader')"
        :tiles="receivablesReportTiles"
      />

      <ReportCategoryCard :title="t('admin.reports.cashReportsHeader')" :tiles="cashReportTiles" />

      <ReportCategoryCard
        :title="t('admin.reports.branchAccountingReportsHeader')"
        :tiles="branchAccountingReportTiles"
      />

      <ReportCategoryCard
        :title="t('admin.reports.expenseReportsHeader')"
        :tiles="expenseReportTiles"
      />

      <ReportCategoryCard
        :title="t('admin.reports.revenueReportsHeader')"
        :tiles="revenueReportTiles"
      />

      <ReportCategoryCard
        :title="t('admin.reports.loanPortfolioReportsHeader')"
        :tiles="loanPortfolioReportTiles"
      />

      <ReportCategoryCard
        :title="t('admin.reports.repaymentReportsHeader')"
        :tiles="repaymentReportTiles"
      />

      <ReportCategoryCard
        :title="t('admin.reports.outstandingReportsHeader')"
        :tiles="outstandingReportTiles"
      />

      <ReportCategoryCard
        :title="t('admin.reports.overdueReportsHeader')"
        :tiles="overdueReportTiles"
      />

      <ReportCategoryCard
        :title="t('admin.reports.penaltyReportsHeader')"
        :tiles="penaltyReportTiles"
      />

      <ReportCategoryCard
        :title="t('admin.reports.interestReportsHeader')"
        :tiles="interestReportTiles"
      />

      <ReportCategoryCard
        :title="t('admin.reports.customerReportsHeader')"
        :tiles="customerReportTiles"
      />

      <ReportCategoryCard
        :title="t('admin.reports.scheduleReportsHeader')"
        :tiles="scheduleReportTiles"
      />

      <ReportCategoryCard
        :title="t('admin.reports.writeoffRestructureReportsHeader')"
        :tiles="writeoffRestructureReportTiles"
      />

      <ReportCategoryCard
        :title="t('admin.reports.dashboardReportsHeader')"
        :tiles="dashboardReportTiles"
      />

      <ReportCategoryCard
        :title="t('admin.reports.riskComplianceReportsHeader')"
        :tiles="riskComplianceReportTiles"
      />

      <ReportCategoryCard
        :title="t('admin.reports.operationalPerformanceReportsHeader')"
        :tiles="operationalPerformanceReportTiles"
      />

      <ReportCategoryCard
        :title="t('admin.reports.productProfitabilityReportsHeader')"
        :tiles="productProfitabilityReportTiles"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  type TooltipItem
} from 'chart.js'
import { Line } from 'vue-chartjs'
import type { CollectionBucket } from '~/features/collections/types'
import type { LoanStatus } from '~/features/loans/types'
import type {
  CollectionTrendPoint,
  DisbursementTrendPoint,
  LoanStatusBreakdown,
  ParSummaryResponse,
  PortfolioSummaryResponse,
  ReportTile
} from '~/features/reports/types'
import type { ColumnDef } from '~/shared/types'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

const { t } = useI18n()
const api = useApi()
const router = useRouter()
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

const [
  { data: portfolio, pending: p1 },
  { data: disbursementTrend, pending: p2 },
  { data: parSummary, pending: p3 },
  { data: collectionTrend, pending: p4 },
  { data: statusBreakdownRaw, pending: p5 }
] = await Promise.all([
  useAsyncData('reports-portfolio', () =>
    api<PortfolioSummaryResponse>('/loans/reports/portfolio-summary')
  ),
  useAsyncData('reports-disbursement-trend', () =>
    api<DisbursementTrendPoint[]>('/loans/reports/disbursement-trend')
  ),
  useAsyncData('reports-par-summary', () =>
    api<ParSummaryResponse>('/payments/reports/par-summary')
  ),
  useAsyncData('reports-collection-trend', () =>
    api<CollectionTrendPoint[]>('/payments/reports/collection-trend')
  ),
  useAsyncData('reports-status-breakdown', () =>
    api<LoanStatusBreakdown[]>('/loans/reports/status-breakdown')
  )
])

const loading = computed(() => p1.value && p2.value && p3.value && p4.value && p5.value)

const STATUS_ORDER: LoanStatus[] = ['PENDING', 'APPROVED', 'ACTIVE', 'CLOSED', 'REJECTED']
const statusBreakdown = computed(() =>
  [...(statusBreakdownRaw.value ?? [])].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  )
)

const BUCKET_META: Record<CollectionBucket, { labelKey: string; color: string }> = {
  DPD_1_30: { labelKey: 'admin.reports.buckets.dpd1_30', color: 'orange' },
  DPD_31_60: { labelKey: 'admin.reports.buckets.dpd31_60', color: 'orange' },
  DPD_61_90: { labelKey: 'admin.reports.buckets.dpd61_90', color: 'red' },
  DPD_90_PLUS: { labelKey: 'admin.reports.buckets.dpd90plus', color: 'red' }
}
function bucketLabel(bucket: CollectionBucket) {
  return t(BUCKET_META[bucket].labelKey)
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function bucketColor(bucket: CollectionBucket): any {
  return BUCKET_META[bucket].color
}

const statTiles = computed(() => {
  const parPct = parSummary.value?.portfolioAtRiskPercent ?? 0
  return [
    {
      label: t('admin.reports.statTiles.activeLoans'),
      value: portfolio.value?.activeLoanCount ?? 0,
      icon: 'i-heroicons-banknotes',
      iconBg: 'bg-gradient-to-br from-indigo-400 to-violet-500'
    },
    {
      label: t('admin.reports.statTiles.totalPrincipal'),
      value: formatCurrency(portfolio.value?.totalPrincipal ?? 0),
      icon: 'i-heroicons-currency-dollar',
      iconBg: 'bg-gradient-to-br from-sky-400 to-blue-500'
    },
    {
      label: t('admin.reports.statTiles.totalOutstanding'),
      value: formatCurrency(portfolio.value?.totalOutstandingBalance ?? 0),
      icon: 'i-heroicons-scale',
      iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-500'
    },
    {
      label: t('admin.reports.statTiles.portfolioAtRisk'),
      value: `${parPct.toFixed(1)}%`,
      icon: 'i-heroicons-shield-exclamation',
      iconBg:
        parPct > 10
          ? 'bg-gradient-to-br from-rose-400 to-red-500'
          : 'bg-gradient-to-br from-fuchsia-400 to-pink-500'
    }
  ]
})

// Last 6 calendar months (oldest first), matching the "YYYY-MM" key the
// backend groups by — same fixed 6-month window as the dashboard's own trend.
const trendMonths = computed(() => {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { key, label: d.toLocaleDateString('en-US', { month: 'short' }) }
  })
})

function seriesFor<T extends { month: string }>(points: T[] | null | undefined, valueKey: keyof T) {
  const map = new Map((points ?? []).map((p) => [p.month, Number(p[valueKey])]))
  return trendMonths.value.map((m) => map.get(m.key) ?? 0)
}

const trendChartData = computed(() => ({
  labels: trendMonths.value.map((m) => m.label),
  datasets: [
    {
      label: t('admin.reports.chartLegend.disbursed'),
      data: seriesFor(disbursementTrend.value, 'totalDisbursed'),
      borderColor: '#6366f1',
      backgroundColor: '#6366f1',
      tension: 0.35,
      pointRadius: 3
    },
    {
      label: t('admin.reports.chartLegend.collected'),
      data: seriesFor(collectionTrend.value, 'totalCollected'),
      borderColor: '#14b8a6',
      backgroundColor: '#14b8a6',
      tension: 0.35,
      pointRadius: 3
    }
  ]
}))

const generalLedgerReportTiles = computed<ReportTile[]>(() => [
  {
    to: '/reports/general-ledger',
    icon: 'i-heroicons-book-open',
    label: t('admin.reports.generalLedgerReportsTiles.generalLedger.label'),
    description: t('admin.reports.generalLedgerReportsTiles.generalLedger.description')
  },
  {
    to: '/reports/general-ledger/journal-report',
    icon: 'i-heroicons-document-text',
    label: t('admin.reports.generalLedgerReportsTiles.journalReport.label'),
    description: t('admin.reports.generalLedgerReportsTiles.journalReport.description')
  },
  {
    to: '/reports/general-ledger/journal-entry-details',
    icon: 'i-heroicons-magnifying-glass',
    label: t('admin.reports.generalLedgerReportsTiles.journalEntryDetails.label'),
    description: t('admin.reports.generalLedgerReportsTiles.journalEntryDetails.description')
  },
  {
    to: '/general-ledger',
    icon: 'i-heroicons-calculator',
    label: t('admin.reports.generalLedgerReportsTiles.ledgerByAccount.label'),
    description: t('admin.reports.generalLedgerReportsTiles.ledgerByAccount.description')
  },
  {
    to: '/reports/general-ledger/ledger-by-branch',
    icon: 'i-heroicons-building-office-2',
    label: t('admin.reports.generalLedgerReportsTiles.ledgerByBranch.label'),
    description: t('admin.reports.generalLedgerReportsTiles.ledgerByBranch.description')
  },
  {
    to: '/reports/general-ledger/ledger-by-date-range',
    icon: 'i-heroicons-calendar-days',
    label: t('admin.reports.generalLedgerReportsTiles.ledgerByDateRange.label'),
    description: t('admin.reports.generalLedgerReportsTiles.ledgerByDateRange.description')
  },
  {
    to: '/reports/general-ledger/account-transaction-history',
    icon: 'i-heroicons-clock',
    label: t('admin.reports.generalLedgerReportsTiles.accountTransactionHistory.label'),
    description: t('admin.reports.generalLedgerReportsTiles.accountTransactionHistory.description')
  },
  {
    to: '/reports/general-ledger/reconciliation',
    icon: 'i-heroicons-scale',
    label: t('admin.reports.generalLedgerReportsTiles.reconciliation.label'),
    description: t('admin.reports.generalLedgerReportsTiles.reconciliation.description')
  }
])

const trialBalanceReportTiles = computed<ReportTile[]>(() => [
  {
    to: '/trial-balance',
    icon: 'i-heroicons-scale',
    label: t('admin.reports.trialBalanceReportsTiles.trialBalance.label'),
    description: t('admin.reports.trialBalanceReportsTiles.trialBalance.description')
  },
  {
    to: '/reports/trial-balance/adjusted',
    icon: 'i-heroicons-adjustments-horizontal',
    label: t('admin.reports.trialBalanceReportsTiles.adjustedTrialBalance.label'),
    description: t('admin.reports.trialBalanceReportsTiles.adjustedTrialBalance.description')
  },
  {
    to: '/reports/trial-balance/closing',
    icon: 'i-heroicons-lock-closed',
    label: t('admin.reports.trialBalanceReportsTiles.closingTrialBalance.label'),
    description: t('admin.reports.trialBalanceReportsTiles.closingTrialBalance.description')
  }
])

// "Financial Position Report" is the same statement as "Balance Sheet" under a different
// (IFRS) name — both tiles link to the same page rather than duplicating the report.
const financialStatementTiles = computed<ReportTile[]>(() => [
  {
    to: '/reports/financial-statements/balance-sheet',
    icon: 'i-heroicons-scale',
    label: t('admin.reports.financialStatementsTiles.balanceSheet.label'),
    description: t('admin.reports.financialStatementsTiles.balanceSheet.description')
  },
  {
    to: '/reports/financial-statements/income-statement',
    icon: 'i-heroicons-chart-bar',
    label: t('admin.reports.financialStatementsTiles.incomeStatement.label'),
    description: t('admin.reports.financialStatementsTiles.incomeStatement.description')
  },
  {
    to: '/reports/financial-statements/cash-flow',
    icon: 'i-heroicons-banknotes',
    label: t('admin.reports.financialStatementsTiles.cashFlow.label'),
    description: t('admin.reports.financialStatementsTiles.cashFlow.description')
  },
  {
    to: '/reports/financial-statements/changes-in-equity',
    icon: 'i-heroicons-arrow-trending-up',
    label: t('admin.reports.financialStatementsTiles.changesInEquity.label'),
    description: t('admin.reports.financialStatementsTiles.changesInEquity.description')
  },
  {
    to: '/reports/financial-statements/balance-sheet',
    icon: 'i-heroicons-document-chart-bar',
    label: t('admin.reports.financialStatementsTiles.financialPositionReport.label'),
    description: t('admin.reports.financialStatementsTiles.financialPositionReport.description')
  }
])

const loanAccountingReportTiles = computed<ReportTile[]>(() => [
  {
    to: '/reports/loan-accounting/portfolio-summary',
    icon: 'i-heroicons-briefcase',
    label: t('admin.reports.loanAccountingReportsTiles.portfolioSummary.label'),
    description: t('admin.reports.loanAccountingReportsTiles.portfolioSummary.description')
  },
  {
    to: '/reports/loan-accounting/outstanding-balance',
    icon: 'i-heroicons-banknotes',
    label: t('admin.reports.loanAccountingReportsTiles.outstandingBalance.label'),
    description: t('admin.reports.loanAccountingReportsTiles.outstandingBalance.description')
  },
  {
    to: '/reports/loan-accounting/loans-receivable',
    icon: 'i-heroicons-banknotes',
    label: t('admin.reports.loanAccountingReportsTiles.loansReceivable.label'),
    description: t('admin.reports.loanAccountingReportsTiles.loansReceivable.description')
  },
  {
    to: '/reports/loan-accounting/interest-receivable',
    icon: 'i-heroicons-inbox-arrow-down',
    label: t('admin.reports.loanAccountingReportsTiles.interestReceivable.label'),
    description: t('admin.reports.loanAccountingReportsTiles.interestReceivable.description')
  },
  {
    to: '/reports/loan-accounting/interest-income',
    icon: 'i-heroicons-chart-bar',
    label: t('admin.reports.loanAccountingReportsTiles.interestIncome.label'),
    description: t('admin.reports.loanAccountingReportsTiles.interestIncome.description')
  },
  {
    to: '/reports/loan-accounting/penalty-income',
    icon: 'i-heroicons-exclamation-triangle',
    label: t('admin.reports.loanAccountingReportsTiles.penaltyIncome.label'),
    description: t('admin.reports.loanAccountingReportsTiles.penaltyIncome.description')
  },
  {
    to: '/reports/loan-accounting/fee-income',
    icon: 'i-heroicons-receipt-percent',
    label: t('admin.reports.loanAccountingReportsTiles.feeIncome.label'),
    description: t('admin.reports.loanAccountingReportsTiles.feeIncome.description')
  }
])

const receivablesReportTiles = computed<ReportTile[]>(() => [
  {
    to: '/reports/receivables/aging',
    icon: 'i-heroicons-clock',
    label: t('admin.reports.receivablesReportsTiles.aging.label'),
    description: t('admin.reports.receivablesReportsTiles.aging.description')
  },
  {
    to: '/reports/receivables/outstanding',
    icon: 'i-heroicons-banknotes',
    label: t('admin.reports.receivablesReportsTiles.outstanding.label'),
    description: t('admin.reports.receivablesReportsTiles.outstanding.description')
  }
])

const cashReportTiles = computed<ReportTile[]>(() => [
  {
    to: '/reports/cash/cash-book',
    icon: 'i-heroicons-book-open',
    label: t('admin.reports.cashReportsTiles.cashBook.label'),
    description: t('admin.reports.cashReportsTiles.cashBook.description')
  },
  {
    to: '/reports/cash/receipts',
    icon: 'i-heroicons-arrow-down-circle',
    label: t('admin.reports.cashReportsTiles.receipts.label'),
    description: t('admin.reports.cashReportsTiles.receipts.description')
  },
  {
    to: '/reports/cash/payments',
    icon: 'i-heroicons-arrow-up-circle',
    label: t('admin.reports.cashReportsTiles.payments.label'),
    description: t('admin.reports.cashReportsTiles.payments.description')
  },
  {
    to: '/reports/cash/daily-summary',
    icon: 'i-heroicons-calendar-days',
    label: t('admin.reports.cashReportsTiles.dailySummary.label'),
    description: t('admin.reports.cashReportsTiles.dailySummary.description')
  },
  {
    to: '/reports/cash/position',
    icon: 'i-heroicons-banknotes',
    label: t('admin.reports.cashReportsTiles.position.label'),
    description: t('admin.reports.cashReportsTiles.position.description')
  }
])

const branchAccountingReportTiles = computed<ReportTile[]>(() => [
  {
    to: '/reports/branch-accounting/profit-and-loss',
    icon: 'i-heroicons-chart-bar',
    label: t('admin.reports.branchAccountingReportsTiles.profitAndLoss.label'),
    description: t('admin.reports.branchAccountingReportsTiles.profitAndLoss.description')
  },
  {
    to: '/reports/branch-accounting/balance-sheet',
    icon: 'i-heroicons-scale',
    label: t('admin.reports.branchAccountingReportsTiles.balanceSheet.label'),
    description: t('admin.reports.branchAccountingReportsTiles.balanceSheet.description')
  },
  {
    to: '/reports/branch-accounting/trial-balance',
    icon: 'i-heroicons-calculator',
    label: t('admin.reports.branchAccountingReportsTiles.trialBalance.label'),
    description: t('admin.reports.branchAccountingReportsTiles.trialBalance.description')
  },
  {
    to: '/reports/branch-accounting/cash-position',
    icon: 'i-heroicons-banknotes',
    label: t('admin.reports.branchAccountingReportsTiles.cashPosition.label'),
    description: t('admin.reports.branchAccountingReportsTiles.cashPosition.description')
  },
  {
    to: '/reports/branch-accounting/transaction-summary',
    icon: 'i-heroicons-document-chart-bar',
    label: t('admin.reports.branchAccountingReportsTiles.transactionSummary.label'),
    description: t('admin.reports.branchAccountingReportsTiles.transactionSummary.description')
  }
])

const expenseReportTiles = computed<ReportTile[]>(() => [
  {
    to: '/reports/expenses/operating-expenses',
    icon: 'i-heroicons-receipt-percent',
    label: t('admin.reports.expenseReportsTiles.operatingExpenses.label'),
    description: t('admin.reports.expenseReportsTiles.operatingExpenses.description')
  },
  {
    to: '/reports/expenses/by-branch',
    icon: 'i-heroicons-building-office-2',
    label: t('admin.reports.expenseReportsTiles.byBranch.label'),
    description: t('admin.reports.expenseReportsTiles.byBranch.description')
  },
  {
    to: '/reports/expenses/by-category',
    icon: 'i-heroicons-tag',
    label: t('admin.reports.expenseReportsTiles.byCategory.label'),
    description: t('admin.reports.expenseReportsTiles.byCategory.description')
  }
])

const revenueReportTiles = computed<ReportTile[]>(() => [
  {
    to: '/reports/loan-accounting/interest-income',
    icon: 'i-heroicons-chart-bar',
    label: t('admin.reports.revenueReportsTiles.interestIncome.label'),
    description: t('admin.reports.revenueReportsTiles.interestIncome.description')
  },
  {
    to: '/reports/loan-accounting/fee-income',
    icon: 'i-heroicons-receipt-percent',
    label: t('admin.reports.revenueReportsTiles.feeIncome.label'),
    description: t('admin.reports.revenueReportsTiles.feeIncome.description')
  },
  {
    to: '/reports/loan-accounting/penalty-income',
    icon: 'i-heroicons-exclamation-triangle',
    label: t('admin.reports.revenueReportsTiles.penaltyIncome.label'),
    description: t('admin.reports.revenueReportsTiles.penaltyIncome.description')
  },
  {
    to: '/reports/revenue/other-income',
    icon: 'i-heroicons-sparkles',
    label: t('admin.reports.revenueReportsTiles.otherIncome.label'),
    description: t('admin.reports.revenueReportsTiles.otherIncome.description')
  },
  {
    to: '/reports/revenue/by-branch',
    icon: 'i-heroicons-building-office-2',
    label: t('admin.reports.revenueReportsTiles.byBranch.label'),
    description: t('admin.reports.revenueReportsTiles.byBranch.description')
  }
])

const loanPortfolioReportTiles = computed<ReportTile[]>(() => [
  {
    to: '/reports/loan-accounting/portfolio-summary',
    icon: 'i-heroicons-briefcase',
    label: t('admin.reports.loanPortfolioReportsTiles.portfolioSummary.label'),
    description: t('admin.reports.loanPortfolioReportsTiles.portfolioSummary.description')
  },
  {
    to: '/reports/loan-portfolio/loans-by-status?status=ACTIVE',
    icon: 'i-heroicons-bolt',
    label: t('admin.reports.loanPortfolioReportsTiles.activeLoans.label'),
    description: t('admin.reports.loanPortfolioReportsTiles.activeLoans.description')
  },
  {
    to: '/reports/loan-portfolio/loans-by-status?status=CLOSED',
    icon: 'i-heroicons-lock-closed',
    label: t('admin.reports.loanPortfolioReportsTiles.closedLoans.label'),
    description: t('admin.reports.loanPortfolioReportsTiles.closedLoans.description')
  },
  {
    to: '/applications',
    icon: 'i-heroicons-document-text',
    label: t('admin.reports.loanPortfolioReportsTiles.pendingApplications.label'),
    description: t('admin.reports.loanPortfolioReportsTiles.pendingApplications.description')
  },
  {
    to: '/reports/loan-portfolio/loans-by-status?status=APPROVED',
    icon: 'i-heroicons-check-circle',
    label: t('admin.reports.loanPortfolioReportsTiles.approvedLoans.label'),
    description: t('admin.reports.loanPortfolioReportsTiles.approvedLoans.description')
  },
  {
    to: '/reports/loan-portfolio/loans-by-status?status=REJECTED',
    icon: 'i-heroicons-x-circle',
    label: t('admin.reports.loanPortfolioReportsTiles.rejectedLoans.label'),
    description: t('admin.reports.loanPortfolioReportsTiles.rejectedLoans.description')
  },
  {
    to: '/reports/loan-portfolio/loans-by-status',
    icon: 'i-heroicons-list-bullet',
    label: t('admin.reports.loanPortfolioReportsTiles.byStatus.label'),
    description: t('admin.reports.loanPortfolioReportsTiles.byStatus.description')
  },
  {
    to: '/reports/loan-portfolio/by-branch',
    icon: 'i-heroicons-building-office-2',
    label: t('admin.reports.loanPortfolioReportsTiles.byBranch.label'),
    description: t('admin.reports.loanPortfolioReportsTiles.byBranch.description')
  },
  {
    to: '/reports/loan-portfolio/by-customer',
    icon: 'i-heroicons-user-group',
    label: t('admin.reports.loanPortfolioReportsTiles.byCustomer.label'),
    description: t('admin.reports.loanPortfolioReportsTiles.byCustomer.description')
  }
])

const repaymentReportTiles = computed<ReportTile[]>(() => [
  {
    to: '/reports/repayments/daily',
    icon: 'i-heroicons-calendar-days',
    label: t('admin.reports.repaymentReportsTiles.daily.label'),
    description: t('admin.reports.repaymentReportsTiles.daily.description')
  },
  {
    to: '/reports/repayments/monthly',
    icon: 'i-heroicons-calendar',
    label: t('admin.reports.repaymentReportsTiles.monthly.label'),
    description: t('admin.reports.repaymentReportsTiles.monthly.description')
  },
  {
    to: '/reports/repayments/collection',
    icon: 'i-heroicons-inbox-arrow-down',
    label: t('admin.reports.repaymentReportsTiles.collection.label'),
    description: t('admin.reports.repaymentReportsTiles.collection.description')
  },
  {
    to: '/reports/repayments/early',
    icon: 'i-heroicons-forward',
    label: t('admin.reports.repaymentReportsTiles.early.label'),
    description: t('admin.reports.repaymentReportsTiles.early.description')
  },
  {
    to: '/reports/repayments/missed',
    icon: 'i-heroicons-exclamation-triangle',
    label: t('admin.reports.repaymentReportsTiles.missed.label'),
    description: t('admin.reports.repaymentReportsTiles.missed.description')
  }
])

const outstandingReportTiles = computed<ReportTile[]>(() => [
  {
    to: '/reports/loan-accounting/loans-receivable',
    icon: 'i-heroicons-banknotes',
    label: t('admin.reports.outstandingReportsTiles.outstandingPrincipal.label'),
    description: t('admin.reports.outstandingReportsTiles.outstandingPrincipal.description')
  },
  {
    to: '/reports/loan-accounting/interest-receivable',
    icon: 'i-heroicons-inbox-arrow-down',
    label: t('admin.reports.outstandingReportsTiles.outstandingInterest.label'),
    description: t('admin.reports.outstandingReportsTiles.outstandingInterest.description')
  },
  {
    to: '/reports/loan-accounting/outstanding-balance',
    icon: 'i-heroicons-scale',
    label: t('admin.reports.outstandingReportsTiles.outstandingBalance.label'),
    description: t('admin.reports.outstandingReportsTiles.outstandingBalance.description')
  },
  {
    to: '/reports/loan-portfolio/by-customer',
    icon: 'i-heroicons-user-group',
    label: t('admin.reports.outstandingReportsTiles.byCustomer.label'),
    description: t('admin.reports.outstandingReportsTiles.byCustomer.description')
  },
  {
    to: '/reports/loan-portfolio/by-branch',
    icon: 'i-heroicons-building-office-2',
    label: t('admin.reports.outstandingReportsTiles.byBranch.label'),
    description: t('admin.reports.outstandingReportsTiles.byBranch.description')
  }
])

const overdueReportTiles = computed<ReportTile[]>(() => [
  {
    to: '/reports/receivables/aging',
    icon: 'i-heroicons-clock',
    label: t('admin.reports.overdueReportsTiles.overdueLoans.label'),
    description: t('admin.reports.overdueReportsTiles.overdueLoans.description')
  },
  {
    to: '/reports/repayments/missed',
    icon: 'i-heroicons-exclamation-triangle',
    label: t('admin.reports.overdueReportsTiles.overdueInstallments.label'),
    description: t('admin.reports.overdueReportsTiles.overdueInstallments.description')
  },
  {
    to: '/reports/receivables/aging',
    icon: 'i-heroicons-chart-bar',
    label: t('admin.reports.overdueReportsTiles.dpd.label'),
    description: t('admin.reports.overdueReportsTiles.dpd.description')
  },
  {
    to: '/reports/receivables/aging?bucket=DPD_90_PLUS',
    icon: 'i-heroicons-fire',
    label: t('admin.reports.overdueReportsTiles.delinquentLoans.label'),
    description: t('admin.reports.overdueReportsTiles.delinquentLoans.description')
  },
  {
    to: '/reports/overdue/collection-due?range=today',
    icon: 'i-heroicons-calendar-days',
    label: t('admin.reports.overdueReportsTiles.dueToday.label'),
    description: t('admin.reports.overdueReportsTiles.dueToday.description')
  },
  {
    to: '/reports/overdue/collection-due?range=week',
    icon: 'i-heroicons-calendar-days',
    label: t('admin.reports.overdueReportsTiles.dueWeek.label'),
    description: t('admin.reports.overdueReportsTiles.dueWeek.description')
  },
  {
    to: '/reports/overdue/collection-due?range=month',
    icon: 'i-heroicons-calendar',
    label: t('admin.reports.overdueReportsTiles.dueMonth.label'),
    description: t('admin.reports.overdueReportsTiles.dueMonth.description')
  }
])

const penaltyReportTiles = computed<ReportTile[]>(() => [
  {
    to: '/reports/penalties/charges',
    icon: 'i-heroicons-exclamation-triangle',
    label: t('admin.reports.penaltyReportsTiles.charges.label'),
    description: t('admin.reports.penaltyReportsTiles.charges.description')
  },
  {
    to: '/reports/penalties/waivers',
    icon: 'i-heroicons-hand-raised',
    label: t('admin.reports.penaltyReportsTiles.waivers.label'),
    description: t('admin.reports.penaltyReportsTiles.waivers.description')
  },
  {
    to: '/reports/penalties/outstanding',
    icon: 'i-heroicons-scale',
    label: t('admin.reports.penaltyReportsTiles.outstanding.label'),
    description: t('admin.reports.penaltyReportsTiles.outstanding.description')
  },
  {
    to: '/reports/penalties/collection',
    icon: 'i-heroicons-inbox-arrow-down',
    label: t('admin.reports.penaltyReportsTiles.collection.label'),
    description: t('admin.reports.penaltyReportsTiles.collection.description')
  }
])

const interestReportTiles = computed<ReportTile[]>(() => [
  {
    to: '/reports/interest/accrued',
    icon: 'i-heroicons-chart-bar',
    label: t('admin.reports.interestReportsTiles.accrued.label'),
    description: t('admin.reports.interestReportsTiles.accrued.description')
  },
  {
    to: '/reports/interest/collected',
    icon: 'i-heroicons-inbox-arrow-down',
    label: t('admin.reports.interestReportsTiles.collected.label'),
    description: t('admin.reports.interestReportsTiles.collected.description')
  },
  {
    to: '/reports/interest/outstanding',
    icon: 'i-heroicons-scale',
    label: t('admin.reports.interestReportsTiles.outstanding.label'),
    description: t('admin.reports.interestReportsTiles.outstanding.description')
  }
])

const customerReportTiles = computed<ReportTile[]>(() => [
  {
    to: '/reports/customers/loan-history',
    icon: 'i-heroicons-clock',
    label: t('admin.reports.customerReportsTiles.loanHistory.label'),
    description: t('admin.reports.customerReportsTiles.loanHistory.description')
  },
  {
    to: '/reports/customers/loan-history?status=ACTIVE',
    icon: 'i-heroicons-bolt',
    label: t('admin.reports.customerReportsTiles.activeLoans.label'),
    description: t('admin.reports.customerReportsTiles.activeLoans.description')
  },
  {
    to: '/reports/customers/loan-summary',
    icon: 'i-heroicons-briefcase',
    label: t('admin.reports.customerReportsTiles.loanSummary.label'),
    description: t('admin.reports.customerReportsTiles.loanSummary.description')
  },
  {
    to: '/reports/customers/payment-history',
    icon: 'i-heroicons-inbox-arrow-down',
    label: t('admin.reports.customerReportsTiles.paymentHistory.label'),
    description: t('admin.reports.customerReportsTiles.paymentHistory.description')
  },
  {
    to: '/reports/loan-portfolio/by-customer',
    icon: 'i-heroicons-trophy',
    label: t('admin.reports.customerReportsTiles.topBorrowers.label'),
    description: t('admin.reports.customerReportsTiles.topBorrowers.description')
  }
])

const scheduleReportTiles = computed<ReportTile[]>(() => [
  {
    to: '/reports/overdue/collection-due?range=upcoming',
    icon: 'i-heroicons-calendar-days',
    label: t('admin.reports.scheduleReportsTiles.upcoming.label'),
    description: t('admin.reports.scheduleReportsTiles.upcoming.description')
  },
  {
    to: '/reports/overdue/collection-due?range=today',
    icon: 'i-heroicons-calendar-days',
    label: t('admin.reports.scheduleReportsTiles.dueToday.label'),
    description: t('admin.reports.scheduleReportsTiles.dueToday.description')
  },
  {
    to: '/reports/overdue/collection-due?range=tomorrow',
    icon: 'i-heroicons-calendar-days',
    label: t('admin.reports.scheduleReportsTiles.dueTomorrow.label'),
    description: t('admin.reports.scheduleReportsTiles.dueTomorrow.description')
  },
  {
    to: '/reports/overdue/collection-due?range=week',
    icon: 'i-heroicons-calendar-days',
    label: t('admin.reports.scheduleReportsTiles.dueWeek.label'),
    description: t('admin.reports.scheduleReportsTiles.dueWeek.description')
  },
  {
    to: '/reports/overdue/collection-due?range=month',
    icon: 'i-heroicons-calendar',
    label: t('admin.reports.scheduleReportsTiles.dueMonth.label'),
    description: t('admin.reports.scheduleReportsTiles.dueMonth.description')
  },
  {
    to: '/reports/loan-portfolio/loans-by-status?status=CLOSED',
    icon: 'i-heroicons-check-circle',
    label: t('admin.reports.scheduleReportsTiles.completedSchedules.label'),
    description: t('admin.reports.scheduleReportsTiles.completedSchedules.description')
  }
])

const writeoffRestructureReportTiles = computed<ReportTile[]>(() => [
  {
    to: '/reports/writeoffs-restructures/writeoffs',
    icon: 'i-heroicons-trash',
    label: t('admin.reports.writeoffRestructureReportsTiles.writeoffs.label'),
    description: t('admin.reports.writeoffRestructureReportsTiles.writeoffs.description')
  },
  {
    to: '/reports/writeoffs-restructures/restructuring',
    icon: 'i-heroicons-arrow-path',
    label: t('admin.reports.writeoffRestructureReportsTiles.restructuring.label'),
    description: t('admin.reports.writeoffRestructureReportsTiles.restructuring.description')
  },
  {
    to: '/reports/writeoffs-restructures/refinancing',
    icon: 'i-heroicons-arrows-right-left',
    label: t('admin.reports.writeoffRestructureReportsTiles.refinancing.label'),
    description: t('admin.reports.writeoffRestructureReportsTiles.refinancing.description')
  },
  {
    to: '/reports/writeoffs-restructures/restructuring',
    icon: 'i-heroicons-calendar-days',
    label: t('admin.reports.writeoffRestructureReportsTiles.rescheduling.label'),
    description: t('admin.reports.writeoffRestructureReportsTiles.rescheduling.description')
  }
])

const dashboardReportTiles = computed<ReportTile[]>(() => [
  {
    to: '/reports/dashboard/summary',
    icon: 'i-heroicons-briefcase',
    label: t('admin.reports.dashboardReportsTiles.totalActiveLoans.label'),
    description: t('admin.reports.dashboardReportsTiles.totalActiveLoans.description')
  },
  {
    to: '/reports/dashboard/summary',
    icon: 'i-heroicons-scale',
    label: t('admin.reports.dashboardReportsTiles.totalOutstandingBalance.label'),
    description: t('admin.reports.dashboardReportsTiles.totalOutstandingBalance.description')
  },
  {
    to: '/reports/dashboard/summary',
    icon: 'i-heroicons-banknotes',
    label: t('admin.reports.dashboardReportsTiles.totalDisbursedToday.label'),
    description: t('admin.reports.dashboardReportsTiles.totalDisbursedToday.description')
  },
  {
    to: '/reports/dashboard/summary',
    icon: 'i-heroicons-inbox-arrow-down',
    label: t('admin.reports.dashboardReportsTiles.totalCollectedToday.label'),
    description: t('admin.reports.dashboardReportsTiles.totalCollectedToday.description')
  },
  {
    to: '/reports/dashboard/summary',
    icon: 'i-heroicons-exclamation-triangle',
    label: t('admin.reports.dashboardReportsTiles.totalOverdueAmount.label'),
    description: t('admin.reports.dashboardReportsTiles.totalOverdueAmount.description')
  },
  {
    to: '/reports/overdue/collection-due?range=today',
    icon: 'i-heroicons-calendar-days',
    label: t('admin.reports.dashboardReportsTiles.loansDueToday.label'),
    description: t('admin.reports.dashboardReportsTiles.loansDueToday.description')
  },
  {
    to: '/applications',
    icon: 'i-heroicons-document-text',
    label: t('admin.reports.dashboardReportsTiles.newLoanApplications.label'),
    description: t('admin.reports.dashboardReportsTiles.newLoanApplications.description')
  },
  {
    to: '/reports/receivables/outstanding',
    icon: 'i-heroicons-shield-exclamation',
    label: t('admin.reports.dashboardReportsTiles.portfolioAtRisk.label'),
    description: t('admin.reports.dashboardReportsTiles.portfolioAtRisk.description')
  },
  {
    to: '/reports/receivables/aging?bucket=DPD_90_PLUS',
    icon: 'i-heroicons-fire',
    label: t('admin.reports.dashboardReportsTiles.nonPerformingLoans.label'),
    description: t('admin.reports.dashboardReportsTiles.nonPerformingLoans.description')
  },
  {
    to: '/reports/dashboard/summary',
    icon: 'i-heroicons-calculator',
    label: t('admin.reports.dashboardReportsTiles.averageLoanAmount.label'),
    description: t('admin.reports.dashboardReportsTiles.averageLoanAmount.description')
  }
])

const riskComplianceReportTiles = computed<ReportTile[]>(() => [
  {
    to: '/reports/risk-compliance/vintage-analysis',
    icon: 'i-heroicons-calendar-days',
    label: t('admin.reports.riskComplianceReportsTiles.vintageAnalysis.label'),
    description: t('admin.reports.riskComplianceReportsTiles.vintageAnalysis.description')
  },
  {
    to: '/reports/risk-compliance/concentration-risk',
    icon: 'i-heroicons-chart-pie',
    label: t('admin.reports.riskComplianceReportsTiles.concentrationRisk.label'),
    description: t('admin.reports.riskComplianceReportsTiles.concentrationRisk.description')
  },
  {
    to: '/reports/risk-compliance/provisioning',
    icon: 'i-heroicons-shield-exclamation',
    label: t('admin.reports.riskComplianceReportsTiles.provisioning.label'),
    description: t('admin.reports.riskComplianceReportsTiles.provisioning.description')
  },
  {
    to: '/reports/risk-compliance/large-transactions',
    icon: 'i-heroicons-magnifying-glass-circle',
    label: t('admin.reports.riskComplianceReportsTiles.largeTransactions.label'),
    description: t('admin.reports.riskComplianceReportsTiles.largeTransactions.description')
  },
  {
    to: '/reports/risk-compliance/pricing',
    icon: 'i-heroicons-tag',
    label: t('admin.reports.riskComplianceReportsTiles.pricing.label'),
    description: t('admin.reports.riskComplianceReportsTiles.pricing.description')
  }
])

const operationalPerformanceReportTiles = computed<ReportTile[]>(() => [
  {
    to: '/reports/operational-performance/collector-productivity',
    icon: 'i-heroicons-user-group',
    label: t('admin.reports.operationalPerformanceReportsTiles.collectorProductivity.label'),
    description: t(
      'admin.reports.operationalPerformanceReportsTiles.collectorProductivity.description'
    )
  },
  {
    to: '/reports/operational-performance/approval-funnel',
    icon: 'i-heroicons-funnel',
    label: t('admin.reports.operationalPerformanceReportsTiles.approvalFunnel.label'),
    description: t('admin.reports.operationalPerformanceReportsTiles.approvalFunnel.description')
  },
  {
    to: '/reports/operational-performance/status-audit-trail',
    icon: 'i-heroicons-clipboard-document-list',
    label: t('admin.reports.operationalPerformanceReportsTiles.statusAuditTrail.label'),
    description: t('admin.reports.operationalPerformanceReportsTiles.statusAuditTrail.description')
  },
  {
    to: '/reports/operational-performance/data-quality',
    icon: 'i-heroicons-exclamation-circle',
    label: t('admin.reports.operationalPerformanceReportsTiles.dataQuality.label'),
    description: t('admin.reports.operationalPerformanceReportsTiles.dataQuality.description')
  }
])

const productProfitabilityReportTiles = computed<ReportTile[]>(() => [
  {
    to: '/reports/product-profitability/income-by-branch',
    icon: 'i-heroicons-building-office-2',
    label: t('admin.reports.productProfitabilityReportsTiles.incomeByBranch.label'),
    description: t('admin.reports.productProfitabilityReportsTiles.incomeByBranch.description')
  },
  {
    to: '/reports/product-profitability/budget-vs-actual',
    icon: 'i-heroicons-calculator',
    label: t('admin.reports.productProfitabilityReportsTiles.budgetVsActual.label'),
    description: t('admin.reports.productProfitabilityReportsTiles.budgetVsActual.description')
  }
])

// Global search across every category's tiles — the per-category search in
// ReportCategoryCard only filters within its own ~5-tile list, which stops helping
// once there are 20+ categories and you don't know which one a report lives in.
type SearchResultTile = ReportTile & { category: string }

const globalSearch = ref('')

const categorizedTileGroups = computed(() => [
  {
    category: t('admin.reports.generalLedgerReportsHeader'),
    tiles: generalLedgerReportTiles.value
  },
  { category: t('admin.reports.trialBalanceReportsHeader'), tiles: trialBalanceReportTiles.value },
  { category: t('admin.reports.financialStatementsHeader'), tiles: financialStatementTiles.value },
  {
    category: t('admin.reports.loanAccountingReportsHeader'),
    tiles: loanAccountingReportTiles.value
  },
  { category: t('admin.reports.receivablesReportsHeader'), tiles: receivablesReportTiles.value },
  { category: t('admin.reports.cashReportsHeader'), tiles: cashReportTiles.value },
  {
    category: t('admin.reports.branchAccountingReportsHeader'),
    tiles: branchAccountingReportTiles.value
  },
  { category: t('admin.reports.expenseReportsHeader'), tiles: expenseReportTiles.value },
  { category: t('admin.reports.revenueReportsHeader'), tiles: revenueReportTiles.value },
  {
    category: t('admin.reports.loanPortfolioReportsHeader'),
    tiles: loanPortfolioReportTiles.value
  },
  { category: t('admin.reports.repaymentReportsHeader'), tiles: repaymentReportTiles.value },
  { category: t('admin.reports.outstandingReportsHeader'), tiles: outstandingReportTiles.value },
  { category: t('admin.reports.overdueReportsHeader'), tiles: overdueReportTiles.value },
  { category: t('admin.reports.penaltyReportsHeader'), tiles: penaltyReportTiles.value },
  { category: t('admin.reports.interestReportsHeader'), tiles: interestReportTiles.value },
  { category: t('admin.reports.customerReportsHeader'), tiles: customerReportTiles.value },
  { category: t('admin.reports.scheduleReportsHeader'), tiles: scheduleReportTiles.value },
  {
    category: t('admin.reports.writeoffRestructureReportsHeader'),
    tiles: writeoffRestructureReportTiles.value
  },
  { category: t('admin.reports.dashboardReportsHeader'), tiles: dashboardReportTiles.value },
  {
    category: t('admin.reports.riskComplianceReportsHeader'),
    tiles: riskComplianceReportTiles.value
  },
  {
    category: t('admin.reports.operationalPerformanceReportsHeader'),
    tiles: operationalPerformanceReportTiles.value
  },
  {
    category: t('admin.reports.productProfitabilityReportsHeader'),
    tiles: productProfitabilityReportTiles.value
  }
])

const globalSearchResults = computed<SearchResultTile[]>(() => {
  const q = globalSearch.value.trim().toLowerCase()
  if (!q) return []
  return categorizedTileGroups.value.flatMap((group) =>
    group.tiles
      .filter(
        (tile) => tile.label.toLowerCase().includes(q) || tile.description.toLowerCase().includes(q)
      )
      .map((tile) => ({ ...tile, category: group.category }))
  )
})

const globalSearchColumns = computed<ColumnDef<SearchResultTile>[]>(() => [
  { key: 'category', label: t('admin.reports.reportsTable.columns.category') },
  { key: 'label', label: t('admin.reports.reportsTable.columns.name') },
  { key: 'description', label: t('admin.reports.reportsTable.columns.description') },
  {
    key: 'actions',
    label: '',
    type: 'link',
    value: () => t('admin.reports.reportsTable.open'),
    href: (row) => row.to
  }
])

const trendChartOptions = computed(() => {
  const gridColor = isDark.value ? '#374151' : '#e5e7eb'
  const textColor = isDark.value ? '#9ca3af' : '#6b7280'
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { position: 'top' as const, labels: { color: textColor, usePointStyle: true } },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'line'>) =>
            ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`
        }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: textColor } },
      y: {
        grid: { color: gridColor },
        ticks: {
          color: textColor,
          callback: (value: string | number) => formatCurrency(Number(value))
        }
      }
    }
  }
})
</script>
