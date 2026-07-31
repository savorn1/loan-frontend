<template>
  <div>
    <PageHeader :title="t('admin.reports.title')" :description="t('admin.reports.description')" />

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
            {{ s.loanCount === 1 ? t('admin.reports.loanCount.one') : t('admin.reports.loanCount.other', { count: s.loanCount }) }}
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
            {{ b.loanCount === 1 ? t('admin.reports.loanCount.one') : t('admin.reports.loanCount.other', { count: b.loanCount }) }}
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
  PortfolioSummaryResponse
} from '~/features/reports/types'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

const { t } = useI18n()
const api = useApi()
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

const [
  { data: portfolio, pending: p1 },
  { data: disbursementTrend, pending: p2 },
  { data: parSummary, pending: p3 },
  { data: collectionTrend, pending: p4 },
  { data: statusBreakdownRaw, pending: p5 }
] = await Promise.all([
  useAsyncData('reports-portfolio', () => api<PortfolioSummaryResponse>('/loans/reports/portfolio-summary')),
  useAsyncData('reports-disbursement-trend', () =>
    api<DisbursementTrendPoint[]>('/loans/reports/disbursement-trend')
  ),
  useAsyncData('reports-par-summary', () => api<ParSummaryResponse>('/payments/reports/par-summary')),
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
          label: (ctx: TooltipItem<'line'>) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`
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
