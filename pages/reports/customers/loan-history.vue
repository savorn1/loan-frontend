<template>
  <div>
    <UButton to="/reports" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      {{ t('admin.reports.backToReports') }}
    </UButton>
    <PageHeader
      :title="t('accounting.customerReports.loanHistory.title')"
      :description="t('accounting.customerReports.loanHistory.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.customerReportsHeader') },
        { label: t('accounting.customerReports.loanHistory.title') }
      ]"
    />

    <UCard class="mb-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormGroup :label="t('accounting.customerReports.loanHistory.customer')">
          <USelectMenu
            v-model="customerId"
            :options="customerOptions"
            option-attribute="label"
            value-attribute="value"
            searchable
            :placeholder="t('accounting.customerReports.loanHistory.customerPlaceholder')"
          />
        </UFormGroup>
        <UFormGroup :label="t('accounting.customerReports.loanHistory.columns.status')">
          <USelectMenu
            v-model="statusFilter"
            :options="statusFilterOptions"
            option-attribute="label"
            value-attribute="value"
          />
        </UFormGroup>
      </div>
    </UCard>

    <UCard>
      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable
        v-model:sort="sort"
        :rows="rows"
        :columns="columns"
        :loading="pending"
        numbered
        :row-number-start="(page - 1) * pageSize"
      >
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-banknotes"
            :title="
              customerId
                ? t('accounting.customerReports.loanHistory.emptyTitleNoActivity')
                : t('accounting.customerReports.loanHistory.emptyTitlePick')
            "
            :description="
              customerId
                ? t('accounting.customerReports.loanHistory.emptyDescriptionNoActivity')
                : t('accounting.customerReports.loanHistory.emptyDescriptionPick')
            "
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
import type { LoanResponse, LoanStatus } from '~/features/loans/types'
import type { CustomerResponse } from '~/features/customers/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()
const route = useRoute()

const { data: customersRaw } = await useAsyncData('customer-loan-history-customers', () =>
  api<PageResponse<CustomerResponse>>('/customers', { query: { size: 1000 } })
)
const customerOptions = computed(() =>
  (customersRaw.value?.content ?? []).map((c) => ({ label: c.fullName, value: c.id }))
)

const {
  data: loansRaw,
  pending,
  error: fetchError
} = await useAsyncData('customer-loan-history-loans', () =>
  api<PageResponse<LoanResponse>>('/loans', { query: { size: 1000 } })
)
const loans = computed(() => loansRaw.value?.content ?? [])

const customerId = ref<number | undefined>(undefined)

// Pre-filled when arriving from a status-specific tile (e.g. "Customer Active Loans" on /reports).
const statusFilter = ref<LoanStatus | ''>((route.query.status as LoanStatus) || '')
const statusFilterOptions = computed(() => [
  { label: t('accounting.customerReports.loanHistory.statusFilterAll'), value: '' },
  { label: formatEnum('PENDING'), value: 'PENDING' },
  { label: formatEnum('APPROVED'), value: 'APPROVED' },
  { label: formatEnum('REJECTED'), value: 'REJECTED' },
  { label: formatEnum('ACTIVE'), value: 'ACTIVE' },
  { label: formatEnum('CLOSED'), value: 'CLOSED' }
])

const filtered = computed(() => {
  if (!customerId.value) return []
  return loans.value.filter(
    (l) =>
      l.customerId === customerId.value && (!statusFilter.value || l.status === statusFilter.value)
  )
})

const { page, pageSize, sort, total, rows } = useClientTable(filtered, { pageSize: 15 })

const columns = computed<ColumnDef<LoanResponse>[]>(() => [
  {
    key: 'principal',
    label: t('accounting.customerReports.loanHistory.columns.principal'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'outstandingBalance',
    label: t('accounting.customerReports.loanHistory.columns.outstandingBalance'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'status',
    label: t('accounting.customerReports.loanHistory.columns.status'),
    type: 'status',
    sortable: true
  },
  {
    key: 'createdAt',
    label: t('accounting.customerReports.loanHistory.columns.created'),
    type: 'datetime',
    sortable: true
  }
])
</script>
