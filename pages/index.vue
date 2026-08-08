<template>
  <div>
    <PageHeader
      :title="greeting"
      :description="`${dayGreeting} ${t('admin.dashboard.descriptionSuffix')}`"
    />

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      <template v-if="loading">
        <UCard v-for="i in 6" :key="i">
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
        <NuxtLink v-for="tile in statTiles" :key="tile.label" :to="tile.to" class="block">
          <UCard class="hover-lift cursor-pointer">
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
        </NuxtLink>
      </template>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
      <UCard class="lg:col-span-2">
        <template #header>
          <span class="font-semibold">{{ t('admin.dashboard.portfolioByStatusHeader') }}</span>
        </template>
        <div v-if="loading" class="flex items-center justify-center h-52">
          <USkeleton class="w-40 h-40 rounded-full" />
        </div>
        <div v-else class="flex items-center gap-6">
          <div class="w-36 h-36 shrink-0">
            <ClientOnly>
              <Doughnut :data="statusChartData" :options="statusChartOptions" />
            </ClientOnly>
          </div>
          <ul class="flex-1 space-y-2 min-w-0">
            <li
              v-for="bucket in statusBreakdown"
              :key="bucket.status"
              class="flex items-center justify-between text-sm"
            >
              <span class="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <span
                  class="w-2.5 h-2.5 rounded-full shrink-0"
                  :style="{ background: bucket.color }"
                />
                {{ bucket.label }}
              </span>
              <span class="font-medium text-gray-900 dark:text-white">{{ bucket.count }}</span>
            </li>
          </ul>
        </div>
      </UCard>

      <UCard class="lg:col-span-3">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-semibold">{{ t('admin.dashboard.dueNext7DaysHeader') }}</span>
            <UBadge v-if="upcomingPayments.length" color="orange" variant="subtle">{{
              upcomingPayments.length
            }}</UBadge>
          </div>
        </template>
        <DataTable
          :rows="upcomingPayments"
          :columns="upcomingColumns"
          :loading="pending"
          export-filename="upcoming-payments.csv"
        >
          <template #empty-state>
            <EmptyState
              icon="i-heroicons-calendar-days"
              :title="t('admin.dashboard.empty.dueSoonTitle')"
              :description="t('admin.dashboard.empty.dueSoonDescription')"
            />
          </template>
        </DataTable>
      </UCard>
    </div>

    <UCard class="mb-6">
      <template #header>
        <span class="font-semibold">{{ t('admin.dashboard.trendsHeader') }}</span>
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

    <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <UCard class="lg:col-span-3">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-semibold">{{ t('admin.dashboard.loansAwaitingReviewHeader') }}</span>
            <UBadge v-if="pendingLoans.length" color="orange" variant="subtle">{{
              pendingLoans.length
            }}</UBadge>
          </div>
        </template>
        <DataTable
          :rows="pendingLoans"
          :columns="columns"
          :loading="pending"
          export-filename="loans-awaiting-review.csv"
          numbered
          @select="(row: LoanResponse) => router.push(`/loans/${row.id}`)"
        >
          <template #empty-state>
            <EmptyState
              icon="i-heroicons-check-circle"
              :title="t('admin.dashboard.empty.caughtUpTitle')"
              :description="t('admin.dashboard.empty.caughtUpDescription')"
            />
          </template>
        </DataTable>
      </UCard>

      <UCard class="lg:col-span-2">
        <template #header>
          <span class="font-semibold">{{ t('admin.dashboard.recentActivityHeader') }}</span>
        </template>
        <div v-if="!recentActivity.length" class="py-6">
          <EmptyState
            icon="i-heroicons-clock"
            :title="t('admin.dashboard.empty.activityTitle')"
            :description="t('admin.dashboard.empty.activityDescription')"
          />
        </div>
        <ul v-else class="divide-y divide-gray-100 dark:divide-gray-800 -my-1">
          <li
            v-for="item in recentActivity"
            :key="`${item.kind}-${item.id}`"
            class="py-3 flex items-start gap-3"
          >
            <div class="shrink-0 rounded-full p-1.5 mt-0.5" :class="item.iconBg">
              <UIcon :name="item.icon" class="w-3.5 h-3.5" :class="item.iconColor" />
            </div>
            <div class="min-w-0 flex-1">
              <NuxtLink
                :to="item.to"
                class="text-sm text-gray-900 dark:text-white font-medium hover:text-primary-500 truncate block"
              >
                {{ item.label }}
              </NuxtLink>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ item.timestamp }}</p>
            </div>
            <StatusBadge :status="item.status" />
          </li>
        </ul>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  type TooltipItem
} from 'chart.js'
import { Doughnut, Line } from 'vue-chartjs'
import type { LoanResponse, LoanStatus, ApplicationResponse } from '~/features/loans/types'
import type { CustomerResponse } from '~/features/customers/types'
import type { PaymentResponse } from '~/features/payments/types'
import type { ColumnDef, PageResponse } from '~/shared/types'

ChartJS.register(ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

const { t, te, locale } = useI18n()
const api = useApi()
const router = useRouter()
const { username } = storeToRefs(useAuth())
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

// Fetched a large single page rather than paginated one-at-a-time — this page
// aggregates client-side across the whole dataset (status breakdown, trends,
// portfolio-at-risk), so it genuinely needs everything, not one page of it.
const [
  { data: customersRaw },
  { data: loansRaw, pending },
  { data: paymentsRaw },
  { data: applicationsRaw }
] = await Promise.all([
  useAsyncData('dash-customers', () =>
    api<PageResponse<CustomerResponse>>('/customers', { query: { size: 1000 } })
  ),
  useAsyncData('dash-loans', () =>
    api<PageResponse<LoanResponse>>('/loans', { query: { size: 1000 } })
  ),
  useAsyncData('dash-payments', () =>
    api<PageResponse<PaymentResponse>>('/payments', { query: { size: 1000 } })
  ),
  useAsyncData('dash-applications', () =>
    api<PageResponse<ApplicationResponse>>('/loans/applications', { query: { size: 1000 } })
  )
])

const customers = computed(() => customersRaw.value?.content ?? [])
const loans = computed(() => loansRaw.value?.content ?? [])
const payments = computed(() => paymentsRaw.value?.content ?? [])
const applications = computed(() => applicationsRaw.value?.content ?? [])

const loading = computed(
  () =>
    customersRaw.value === null &&
    loansRaw.value === null &&
    paymentsRaw.value === null &&
    applicationsRaw.value === null
)

const greeting = computed(() =>
  username.value
    ? t('admin.dashboard.greetingNamed', { name: username.value })
    : t('admin.dashboard.greetingAnon')
)

// Time-aware opener so the dashboard feels a little more alive than a static line.
const dayGreeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return t('admin.dashboard.morningGreeting')
  if (hour < 18) return t('admin.dashboard.afternoonGreeting')
  return t('admin.dashboard.eveningGreeting')
})

const pendingLoans = computed(() => (loans.value ?? []).filter((l) => l.status === 'PENDING'))

const outstandingBalance = computed(() =>
  (loans.value ?? [])
    .filter((l) => l.status === 'ACTIVE')
    .reduce((sum, l) => sum + (l.outstandingBalance ?? 0), 0)
)
const overduePayments = computed(() => (payments.value ?? []).filter((p) => p.status === 'OVERDUE'))
const overdueCount = computed(() => overduePayments.value.length)
const overdueAmount = computed(() =>
  overduePayments.value.reduce((sum, p) => sum + (p.amount ?? 0), 0)
)

const pendingApplicationsCount = computed(
  () =>
    (applications.value ?? []).filter(
      (a) => a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW'
    ).length
)

const portfolioAtRisk = computed(() =>
  outstandingBalance.value > 0 ? (overdueAmount.value / outstandingBalance.value) * 100 : 0
)

const statTiles = computed(() => [
  {
    label: t('admin.dashboard.statTiles.customers'),
    value: customers.value?.length ?? 0,
    to: '/customers',
    icon: 'i-heroicons-users',
    iconBg: 'bg-gradient-to-br from-sky-400 to-blue-500'
  },
  {
    label: t('admin.dashboard.statTiles.activeLoans'),
    value: (loans.value ?? []).filter((l) => l.status === 'ACTIVE').length,
    to: '/loans',
    icon: 'i-heroicons-banknotes',
    iconBg: 'bg-gradient-to-br from-indigo-400 to-violet-500'
  },
  {
    label: t('admin.dashboard.statTiles.outstandingBalance'),
    value: formatCurrency(outstandingBalance.value),
    to: '/loans',
    icon: 'i-heroicons-currency-dollar',
    iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-500'
  },
  {
    label: t('admin.dashboard.statTiles.pendingApplications'),
    value: pendingApplicationsCount.value,
    to: '/applications',
    icon: 'i-heroicons-document-text',
    iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500'
  },
  {
    label: t('admin.dashboard.statTiles.overduePayments'),
    value: overdueCount.value,
    to: '/collections',
    icon: 'i-heroicons-exclamation-triangle',
    iconBg:
      overdueCount.value > 0
        ? 'bg-gradient-to-br from-rose-400 to-red-500'
        : 'bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700'
  },
  {
    label: t('admin.dashboard.statTiles.portfolioAtRisk'),
    value: `${portfolioAtRisk.value.toFixed(1)}%`,
    to: '/loans',
    icon: 'i-heroicons-shield-exclamation',
    iconBg:
      portfolioAtRisk.value > 10
        ? 'bg-gradient-to-br from-rose-400 to-red-500'
        : 'bg-gradient-to-br from-fuchsia-400 to-pink-500'
  }
])

const STATUS_ORDER: LoanStatus[] = ['PENDING', 'APPROVED', 'ACTIVE', 'CLOSED', 'REJECTED']
const STATUS_CHART_COLOR: Record<LoanStatus, string> = {
  PENDING: '#f97316',
  APPROVED: '#14b8a6',
  ACTIVE: '#14b8a6',
  CLOSED: '#9ca3af',
  REJECTED: '#ef4444'
}

const statusBreakdown = computed(() => {
  const total = loans.value?.length ?? 0
  return STATUS_ORDER.map((status) => {
    const count = (loans.value ?? []).filter((l) => l.status === status).length
    const labelKey = `common.status.${status}`
    return {
      status,
      label: te(labelKey) ? t(labelKey) : status,
      count,
      pct: total > 0 ? (count / total) * 100 : 0,
      color: STATUS_CHART_COLOR[status]
    }
  })
})

const statusChartData = computed(() => ({
  labels: statusBreakdown.value.map((b) => b.label),
  datasets: [
    {
      data: statusBreakdown.value.map((b) => b.count),
      backgroundColor: statusBreakdown.value.map((b) => b.color),
      borderColor: isDark.value ? '#1f2937' : '#ffffff',
      borderWidth: 2,
      hoverOffset: 6
    }
  ]
}))

const statusChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '65%',
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: TooltipItem<'doughnut'>) => ` ${ctx.label}: ${ctx.parsed}`
      }
    }
  }
}))

const trendMonths = computed(() => {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString(locale.value, { month: 'short' })
    }
  })
})

const disbursementsTrend = computed(() => {
  const sums = new Map(trendMonths.value.map((m) => [m.key, 0]))
  for (const l of loans.value ?? []) {
    if (!l.disbursedAt) continue
    const d = new Date(l.disbursedAt)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (sums.has(key)) sums.set(key, (sums.get(key) ?? 0) + l.principal)
  }
  return trendMonths.value.map((m) => sums.get(m.key) ?? 0)
})

const collectionsTrend = computed(() => {
  const sums = new Map(trendMonths.value.map((m) => [m.key, 0]))
  for (const p of payments.value ?? []) {
    if (p.status !== 'PAID' || !p.paidAt) continue
    const d = new Date(p.paidAt)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (sums.has(key)) sums.set(key, (sums.get(key) ?? 0) + p.amount)
  }
  return trendMonths.value.map((m) => sums.get(m.key) ?? 0)
})

const trendChartData = computed(() => ({
  labels: trendMonths.value.map((m) => m.label),
  datasets: [
    {
      label: t('admin.dashboard.chartLegend.disbursed'),
      data: disbursementsTrend.value,
      borderColor: '#6366f1',
      backgroundColor: '#6366f1',
      tension: 0.35,
      pointRadius: 3
    },
    {
      label: t('admin.dashboard.chartLegend.collected'),
      data: collectionsTrend.value,
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

const upcomingPayments = computed(() => {
  const now = Date.now()
  const in7Days = now + 7 * 24 * 60 * 60 * 1000
  return (payments.value ?? [])
    .filter((p) => {
      if (p.status !== 'PENDING') return false
      const due = new Date(p.dueDate).getTime()
      return due >= now && due <= in7Days
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 8)
})

const upcomingColumns = computed<ColumnDef<PaymentResponse>[]>(() => [
  { key: 'loanId', label: t('admin.dashboard.columns.loan') },
  { key: 'amount', label: t('admin.dashboard.columns.amount'), type: 'currency' },
  { key: 'dueDate', label: t('admin.dashboard.columns.dueDate'), type: 'date' },
  { key: 'status', label: t('admin.dashboard.columns.status'), type: 'status' }
])

const columns = computed<ColumnDef<LoanResponse>[]>(() => [
  { key: 'customerName', label: t('admin.dashboard.columns.customer') },
  { key: 'principal', label: t('admin.dashboard.columns.principal'), type: 'currency' },
  { key: 'status', label: t('admin.dashboard.columns.status'), type: 'status' },
  { key: 'createdAt', label: t('admin.dashboard.columns.created'), type: 'datetime' }
])

type ActivityItem = {
  kind: 'loan' | 'payment'
  id: number
  label: string
  status: string
  createdAt: string
  timestamp: string
  to: string
  icon: string
  iconBg: string
  iconColor: string
}

const recentActivity = computed<ActivityItem[]>(() => {
  const loanItems: ActivityItem[] = (loans.value ?? []).map((l) => ({
    kind: 'loan',
    id: l.id,
    label: t('admin.dashboard.loanActivityLabel', { id: l.id, customer: l.customerName }),
    status: l.status,
    createdAt: l.createdAt,
    timestamp: formatDateTime(l.createdAt),
    to: `/loans/${l.id}`,
    icon: 'i-heroicons-banknotes',
    iconBg: 'bg-primary-50 dark:bg-primary-400/10',
    iconColor: 'text-primary-500 dark:text-primary-400'
  }))
  const paymentItems: ActivityItem[] = (payments.value ?? []).map((p) => ({
    kind: 'payment',
    id: p.id,
    label: t('admin.dashboard.paymentActivityLabel', { id: p.id, loanId: p.loanId }),
    status: p.status,
    createdAt: p.createdAt,
    timestamp: formatDateTime(p.createdAt),
    to: `/loans/${p.loanId}`,
    icon: 'i-heroicons-credit-card',
    iconBg: 'bg-gray-100 dark:bg-gray-800',
    iconColor: 'text-gray-500 dark:text-gray-400'
  }))
  return [...loanItems, ...paymentItems]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8)
})
</script>
