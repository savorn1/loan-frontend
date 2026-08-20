<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.customerReports.growth.title')"
      :description="t('accounting.customerReports.growth.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.customerReportsHeader') },
        { label: t('accounting.customerReports.growth.title') }
      ]"
    />

    <UCard>
      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable :rows="rows" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-user-plus"
            :title="t('accounting.customerReports.growth.emptyTitle')"
            :description="t('accounting.customerReports.growth.emptyDescription')"
          />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { CustomerResponse } from '~/features/customers/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

interface GrowthRow {
  month: string
  newCustomers: number
  cumulativeTotal: number
}

const { t } = useI18n()
const api = useApi()

const {
  data: customersRaw,
  pending,
  error: fetchError
} = await useAsyncData('customer-growth', () =>
  api<PageResponse<CustomerResponse>>('/customers', { query: { size: 1000 } })
)
const customers = computed(() => customersRaw.value?.content ?? [])

const rows = computed<GrowthRow[]>(() => {
  const byMonth = new Map<string, number>()
  for (const c of customers.value) {
    const month = c.createdAt.slice(0, 7)
    byMonth.set(month, (byMonth.get(month) ?? 0) + 1)
  }
  const months = [...byMonth.keys()].sort()
  let cumulative = 0
  return months.map((month) => {
    const newCustomers = byMonth.get(month) ?? 0
    cumulative += newCustomers
    return { month, newCustomers, cumulativeTotal: cumulative }
  })
})

const columns = computed<ColumnDef<GrowthRow>[]>(() => [
  { key: 'month', label: t('accounting.customerReports.growth.columns.month') },
  { key: 'newCustomers', label: t('accounting.customerReports.growth.columns.newCustomers') },
  {
    key: 'cumulativeTotal',
    label: t('accounting.customerReports.growth.columns.cumulativeTotal')
  }
])
</script>
