<template>
  <div>
    <PageHeader title="Loan Products" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" to="/loan-products/new">New Loan Product</UButton>
      </template>
    </PageHeader>

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center gap-3">
          <UInput
            v-model="search"
            icon="i-heroicons-magnifying-glass"
            placeholder="Search by name or code..."
            class="max-w-xs w-full sm:w-auto"
          >
            <template v-if="search" #trailing>
              <UButton color="gray" variant="link" icon="i-heroicons-x-mark" :padded="false" @click="search = ''" />
            </template>
          </UInput>
          <USelectMenu v-model="statusFilter" :options="statusOptions" option-attribute="label" value-attribute="value" class="w-40" />
        </div>
      </template>

      <DataTable
        :rows="rows"
        :columns="columns"
        :loading="pending"
        v-model:sort="sort"
        @select="(row: LoanProductResponse) => router.push(`/loan-products/${row.id}`)"
      >
        <template #empty-state>
          <EmptyState
            :icon="hasFilters ? 'i-heroicons-magnifying-glass' : 'i-heroicons-clipboard-document-list'"
            :title="hasFilters ? 'No matches' : 'No loan products yet'"
            :description="hasFilters ? 'Try a different search term or status filter.' : 'Define a loan product to configure its rates, fees, terms and eligibility rules.'"
          >
            <template v-if="!hasFilters" #action>
              <UButton icon="i-heroicons-plus" to="/loan-products/new">New Loan Product</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { LoanProductResponse, LoanProductStatus } from '~/features/loan-products/types'
import type { ColumnDef } from '~/shared/types'

const router = useRouter()
const api = useApi()

const { data: products, pending } = await useAsyncData('loan-products', () => api<LoanProductResponse[]>('/loan-products'))

const columns: ColumnDef<LoanProductResponse>[] = [
  { key: 'productCode', label: 'Code', sortable: true },
  { key: 'productName', label: 'Name', sortable: true },
  {
    key: 'minAmount',
    label: 'Amount range',
    type: 'currency',
    to: 'maxAmount',
    prefix: row => `${row.currency} `
  },
  {
    key: 'minTerm',
    label: 'Term range',
    to: 'maxTerm',
    suffix: row => ` ${formatEnum(row.termUnit).toLowerCase()}(s)`
  },
  {
    key: 'defaultInterestRate',
    label: 'Interest rate',
    type: 'percent',
    suffix: row => ` (${formatEnum(row.interestType)})`
  },
  { key: 'status', type: 'status', sortable: true },
  { key: 'createdAt', label: 'Created', type: 'datetime', sortable: true }
]

const statusOptions: { label: string; value: LoanProductStatus | '' }[] = [
  { label: 'All statuses', value: '' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' }
]
const statusFilter = ref<LoanProductStatus | ''>('')

const filteredByStatus = computed(() =>
  statusFilter.value ? (products.value ?? []).filter(p => p.status === statusFilter.value) : products.value
)

const { search, page, pageSize, sort, total, rows } = useClientTable(filteredByStatus, {
  searchFields: ['productName', 'productCode'],
  pageSize: 10
})

const hasFilters = computed(() => !!search.value || !!statusFilter.value)

const totalLabel = computed(() => {
  const count = products.value?.length ?? 0
  return count === 1 ? '1 loan product' : `${count} loan products`
})
</script>
