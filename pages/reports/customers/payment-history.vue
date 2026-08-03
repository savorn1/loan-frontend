<template>
  <div>
    <UButton to="/reports" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      {{ t('admin.reports.title') }}
    </UButton>
    <PageHeader
      :title="t('accounting.customerReports.paymentHistory.title')"
      :description="t('accounting.customerReports.paymentHistory.description')"
    />

    <UCard class="mb-6">
      <UFormGroup :label="t('accounting.customerReports.paymentHistory.customer')" class="max-w-xs">
        <USelectMenu
          v-model="customerId"
          :options="customerOptions"
          option-attribute="label"
          value-attribute="value"
          searchable
          :placeholder="t('accounting.customerReports.paymentHistory.customerPlaceholder')"
        />
      </UFormGroup>
    </UCard>

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-56"
          :placeholder="t('accounting.customerReports.paymentHistory.searchPlaceholder')"
        />
      </template>

      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable v-model:sort="sort" :rows="rows" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-inbox-arrow-down"
            :title="
              customerId
                ? t('accounting.customerReports.paymentHistory.emptyTitleNoActivity')
                : t('accounting.customerReports.paymentHistory.emptyTitlePick')
            "
            :description="
              customerId
                ? t('accounting.customerReports.paymentHistory.emptyDescriptionNoActivity')
                : t('accounting.customerReports.paymentHistory.emptyDescriptionPick')
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
import type { LoanResponse } from '~/features/loans/types'
import type { CustomerResponse } from '~/features/customers/types'
import type { PaymentResponse } from '~/features/payments/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

const { data: customersRaw } = await useAsyncData('customer-payment-history-customers', () =>
  api<PageResponse<CustomerResponse>>('/customers', { query: { size: 1000 } })
)
const customerOptions = computed(() =>
  (customersRaw.value?.content ?? []).map((c) => ({ label: c.fullName, value: c.id }))
)

const { data: loansRaw } = await useAsyncData('customer-payment-history-loans', () =>
  api<PageResponse<LoanResponse>>('/loans', { query: { size: 1000 } })
)
const loans = computed(() => loansRaw.value?.content ?? [])

const {
  data: paymentsRaw,
  pending,
  error: fetchError
} = await useAsyncData('customer-payment-history-payments', () =>
  api<PageResponse<PaymentResponse>>('/payments', { query: { size: 1000 } })
)
const payments = computed(() => paymentsRaw.value?.content ?? [])

const customerId = ref<number | undefined>(undefined)

const customerLoanIds = computed(
  () => new Set(loans.value.filter((l) => l.customerId === customerId.value).map((l) => l.id))
)

const filtered = computed(() => {
  if (!customerId.value) return []
  return payments.value.filter((p) => customerLoanIds.value.has(p.loanId))
})

const { search, page, pageSize, sort, total, rows } = useClientTable(filtered, {
  searchFields: ['loanId'],
  pageSize: 15
})

const columns = computed<ColumnDef<PaymentResponse>[]>(() => [
  {
    key: 'loanId',
    label: t('accounting.customerReports.paymentHistory.columns.loanId'),
    sortable: true
  },
  {
    key: 'installmentNumber',
    label: t('accounting.customerReports.paymentHistory.columns.installmentNumber'),
    sortable: true
  },
  {
    key: 'dueDate',
    label: t('accounting.customerReports.paymentHistory.columns.dueDate'),
    type: 'date',
    sortable: true
  },
  {
    key: 'paidAt',
    label: t('accounting.customerReports.paymentHistory.columns.paidAt'),
    type: 'date',
    sortable: true
  },
  {
    key: 'status',
    label: t('accounting.customerReports.paymentHistory.columns.status'),
    type: 'status',
    sortable: true
  },
  {
    key: 'amount',
    label: t('accounting.customerReports.paymentHistory.columns.amount'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'principalComponent',
    label: t('accounting.customerReports.paymentHistory.columns.principalComponent'),
    type: 'currency'
  },
  {
    key: 'interestComponent',
    label: t('accounting.customerReports.paymentHistory.columns.interestComponent'),
    type: 'currency'
  }
])
</script>
