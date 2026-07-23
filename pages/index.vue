<template>
  <div>
    <PageHeader
      :title="greeting"
      :description="`${dayGreeting} Here's what's happening across the loan book.`"
    />

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

    <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <UCard class="lg:col-span-3">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-semibold">Loans awaiting review</span>
            <UBadge v-if="pendingLoans.length" color="orange" variant="subtle">{{
              pendingLoans.length
            }}</UBadge>
          </div>
        </template>
        <DataTable
          :rows="pendingLoans"
          :columns="columns"
          :loading="pending"
          @select="(row: LoanResponse) => router.push(`/loans/${row.id}`)"
        >
          <template #empty-state>
            <EmptyState
              icon="i-heroicons-check-circle"
              title="All caught up"
              description="No loans are waiting for review right now."
            />
          </template>
        </DataTable>
      </UCard>

      <UCard class="lg:col-span-2">
        <template #header>
          <span class="font-semibold">Recent activity</span>
        </template>
        <div v-if="!recentActivity.length" class="py-6">
          <EmptyState
            icon="i-heroicons-clock"
            title="Nothing yet"
            description="Loan and payment activity will show up here."
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
import type { LoanResponse } from '~/features/loans/types'
import type { CustomerResponse } from '~/features/customers/types'
import type { PaymentResponse } from '~/features/payments/types'
import type { ColumnDef } from '~/shared/types'

const api = useApi()
const router = useRouter()
const { username } = storeToRefs(useAuth())

// Fetched in parallel (Promise.all) rather than three sequential awaits —
// each request no longer waits on the previous one to finish before starting.
const [{ data: customers }, { data: loans, pending }, { data: payments }] = await Promise.all([
  useAsyncData('dash-customers', () => api<CustomerResponse[]>('/customers')),
  useAsyncData('dash-loans', () => api<LoanResponse[]>('/loans')),
  useAsyncData('dash-payments', () => api<PaymentResponse[]>('/payments'))
])

const loading = computed(
  () => customers.value === null && loans.value === null && payments.value === null
)

const greeting = computed(() => `Welcome back${username.value ? `, ${username.value}` : ''} 👋`)

// Time-aware opener so the dashboard feels a little more alive than a static line.
const dayGreeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning!'
  if (hour < 18) return 'Good afternoon!'
  return 'Good evening!'
})

const pendingLoans = computed(() => (loans.value ?? []).filter((l) => l.status === 'PENDING'))

const outstandingBalance = computed(() =>
  (loans.value ?? [])
    .filter((l) => l.status === 'ACTIVE')
    .reduce((sum, l) => sum + (l.outstandingBalance ?? 0), 0)
)
const overdueCount = computed(
  () => (payments.value ?? []).filter((p) => p.status === 'OVERDUE').length
)

// Each tile gets its own soft gradient so the row reads as four friendly
// colored chips instead of four identical gray boxes.
const statTiles = computed(() => [
  {
    label: 'Customers',
    value: customers.value?.length ?? 0,
    to: '/customers',
    icon: 'i-heroicons-users',
    iconBg: 'bg-gradient-to-br from-sky-400 to-blue-500'
  },
  {
    label: 'Loans',
    value: loans.value?.length ?? 0,
    to: '/loans',
    icon: 'i-heroicons-banknotes',
    iconBg: 'bg-gradient-to-br from-indigo-400 to-violet-500'
  },
  {
    label: 'Outstanding balance',
    value: formatCurrency(outstandingBalance.value),
    to: '/loans',
    icon: 'i-heroicons-currency-dollar',
    iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-500'
  },
  {
    label: 'Overdue payments',
    value: overdueCount.value,
    to: '/payments',
    icon: 'i-heroicons-exclamation-triangle',
    iconBg:
      overdueCount.value > 0
        ? 'bg-gradient-to-br from-rose-400 to-red-500'
        : 'bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700'
  }
])

const columns: ColumnDef<LoanResponse>[] = [
  { key: 'id', label: 'ID' },
  { key: 'customerName', label: 'Customer' },
  { key: 'principal', type: 'currency' },
  { key: 'status', type: 'status' },
  { key: 'createdAt', label: 'Created', type: 'datetime' }
]

// Merges the most recent loans (by creation) and payments (by due date) into a
// single feed so the dashboard shows something richer than a single table.
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
    label: `Loan #${l.id} — ${l.customerName}`,
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
    label: `Payment #${p.id} on loan #${p.loanId}`,
    status: p.status,
    createdAt: p.createdAt,
    timestamp: formatDateTime(p.createdAt),
    to: `/loans/${p.loanId}`,
    icon: 'i-heroicons-credit-card',
    iconBg: 'bg-gray-100 dark:bg-gray-800',
    iconColor: 'text-gray-500 dark:text-gray-400'
  }))
  // Sort by the raw ISO createdAt (not the human-formatted `timestamp` string,
  // which doesn't sort chronologically once it's been through Intl formatting).
  return [...loanItems, ...paymentItems]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8)
})
</script>
