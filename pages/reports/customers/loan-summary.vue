<template>
  <div>
    <UButton
      to="/reports"
      variant="link"
      icon="i-heroicons-arrow-left"
      size="xs"
      class="mb-1 px-0"
    >
      {{ t('admin.reports.title') }}
    </UButton>
    <PageHeader
      :title="t('accounting.customerReports.loanSummary.title')"
      :description="t('accounting.customerReports.loanSummary.description')"
    />

    <UCard class="mb-6">
      <UFormGroup :label="t('accounting.customerReports.loanSummary.customer')" class="max-w-xs">
        <USelectMenu
          v-model="customerId"
          :options="customerOptions"
          option-attribute="label"
          value-attribute="value"
          searchable
          :placeholder="t('accounting.customerReports.loanSummary.customerPlaceholder')"
        />
      </UFormGroup>
    </UCard>

    <UAlert
      v-if="fetchError"
      color="red"
      variant="subtle"
      class="mb-4"
      :title="apiErrorMessage(fetchError)"
    />

    <template v-if="!customerId">
      <UCard>
        <EmptyState
          icon="i-heroicons-user"
          :title="t('accounting.customerReports.loanSummary.emptyTitlePick')"
          :description="t('accounting.customerReports.loanSummary.emptyDescriptionPick')"
        />
      </UCard>
    </template>
    <template v-else>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <UCard>
          <div class="text-sm text-gray-500 dark:text-gray-400">
            {{ t('accounting.customerReports.loanSummary.totalLoans') }}
          </div>
          <div class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{{ customerLoans.length }}</div>
        </UCard>
        <UCard>
          <div class="text-sm text-gray-500 dark:text-gray-400">
            {{ t('accounting.customerReports.loanSummary.totalPrincipal') }}
          </div>
          <div class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{{ formatCurrency(totalPrincipal) }}</div>
        </UCard>
        <UCard>
          <div class="text-sm text-gray-500 dark:text-gray-400">
            {{ t('accounting.customerReports.loanSummary.totalOutstanding') }}
          </div>
          <div class="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{{ formatCurrency(totalOutstanding) }}</div>
        </UCard>
      </div>

      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('accounting.customerReports.loanSummary.statusBreakdownHeader') }}</span>
        </template>
        <DataTable :rows="statusBreakdown" :columns="columns" :loading="pending" :exportable="false" />
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { LoanResponse } from '~/features/loans/types'
import type { CustomerResponse } from '~/features/customers/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

interface StatusRow {
  status: string
  loanCount: number
  totalPrincipal: number
}

const { t } = useI18n()
const api = useApi()

const { data: customersRaw } = await useAsyncData('customer-loan-summary-customers', () =>
  api<PageResponse<CustomerResponse>>('/customers', { query: { size: 1000 } })
)
const customerOptions = computed(() => (customersRaw.value?.content ?? []).map((c) => ({ label: c.fullName, value: c.id })))

const {
  data: loansRaw,
  pending,
  error: fetchError
} = await useAsyncData('customer-loan-summary-loans', () => api<PageResponse<LoanResponse>>('/loans', { query: { size: 1000 } }))
const loans = computed(() => loansRaw.value?.content ?? [])

const customerId = ref<number | undefined>(undefined)

const customerLoans = computed(() => loans.value.filter((l) => l.customerId === customerId.value))
const totalPrincipal = computed(() => customerLoans.value.reduce((sum, l) => sum + l.principal, 0))
const totalOutstanding = computed(() => customerLoans.value.reduce((sum, l) => sum + (l.outstandingBalance ?? 0), 0))

const statusBreakdown = computed<StatusRow[]>(() => {
  const byStatus = new Map<string, StatusRow>()
  for (const loan of customerLoans.value) {
    const existing = byStatus.get(loan.status) ?? { status: loan.status, loanCount: 0, totalPrincipal: 0 }
    existing.loanCount += 1
    existing.totalPrincipal += loan.principal
    byStatus.set(loan.status, existing)
  }
  return [...byStatus.values()]
})

const columns = computed<ColumnDef<StatusRow>[]>(() => [
  { key: 'status', label: t('accounting.customerReports.loanSummary.columns.status'), type: 'status' },
  { key: 'loanCount', label: t('accounting.customerReports.loanSummary.columns.loanCount') },
  { key: 'totalPrincipal', label: t('accounting.customerReports.loanSummary.columns.totalPrincipal'), type: 'currency' }
])
</script>
