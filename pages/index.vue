<template>
  <div>
    <h1 class="text-xl font-bold mb-6">Dashboard</h1>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <NuxtLink v-for="tile in statTiles" :key="tile.label" :to="tile.to" class="block">
        <UCard class="transition-shadow hover:shadow-md cursor-pointer">
          <div class="flex items-center gap-4">
            <div class="shrink-0 rounded-lg p-2.5" :class="tile.iconBg">
              <UIcon :name="tile.icon" class="w-5 h-5" :class="tile.iconColor" />
            </div>
            <div class="min-w-0">
              <div class="text-sm text-gray-500 dark:text-gray-400">{{ tile.label }}</div>
              <div class="text-2xl font-semibold text-gray-900 dark:text-white">{{ tile.value }}</div>
            </div>
          </div>
        </UCard>
      </NuxtLink>
    </div>

    <UCard>
      <template #header>
        <span class="font-semibold">Loans awaiting review</span>
      </template>
      <UTable :rows="pendingLoans" :columns="columns" :loading="pending">
        <template #status-data="{ row }">
          <StatusBadge :status="row.status" />
        </template>
        <template #principal-data="{ row }">
          {{ formatCurrency(row.principal) }}
        </template>
      </UTable>
      <p v-if="!pending && pendingLoans.length === 0" class="text-sm text-gray-500 py-4 text-center">
        No loans pending approval.
      </p>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { LoanResponse } from '~/features/loans/types'
import type { CustomerResponse } from '~/features/customers/types'
import type { PaymentResponse } from '~/features/payments/types'

const api = useApi()

const { data: customers } = await useAsyncData('dash-customers', () => api<CustomerResponse[]>('/customers'))
const { data: loans, pending } = await useAsyncData('dash-loans', () => api<LoanResponse[]>('/loans'))
const { data: payments } = await useAsyncData('dash-payments', () => api<PaymentResponse[]>('/payments'))

const pendingLoans = computed(() => (loans.value ?? []).filter(l => l.status === 'PENDING'))

const outstandingBalance = computed(() =>
  (loans.value ?? [])
    .filter(l => l.status === 'ACTIVE')
    .reduce((sum, l) => sum + (l.outstandingBalance ?? 0), 0)
)
const overdueCount = computed(() => (payments.value ?? []).filter(p => p.status === 'OVERDUE').length)

const statTiles = computed(() => [
  {
    label: 'Customers',
    value: customers.value?.length ?? '—',
    to: '/customers',
    icon: 'i-heroicons-users',
    iconBg: 'bg-primary-50 dark:bg-primary-400/10',
    iconColor: 'text-primary-500 dark:text-primary-400'
  },
  {
    label: 'Loans',
    value: loans.value?.length ?? '—',
    to: '/loans',
    icon: 'i-heroicons-banknotes',
    iconBg: 'bg-primary-50 dark:bg-primary-400/10',
    iconColor: 'text-primary-500 dark:text-primary-400'
  },
  {
    label: 'Outstanding balance',
    value: formatCurrency(outstandingBalance.value),
    to: '/loans',
    icon: 'i-heroicons-currency-dollar',
    iconBg: 'bg-gray-100 dark:bg-gray-800',
    iconColor: 'text-gray-500 dark:text-gray-400'
  },
  {
    label: 'Overdue payments',
    value: overdueCount.value,
    to: '/payments',
    icon: 'i-heroicons-exclamation-triangle',
    iconBg: overdueCount.value > 0 ? 'bg-red-50 dark:bg-red-400/10' : 'bg-gray-100 dark:bg-gray-800',
    iconColor: overdueCount.value > 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
  }
])

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'customerName', label: 'Customer' },
  { key: 'principal', label: 'Principal' },
  { key: 'status', label: 'Status' }
]
</script>
