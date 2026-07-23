<template>
  <div>
    <PageHeader title="Loan Products" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">New Loan Product</UButton>
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
      >
        <template #actions-data="{ row }">
          <div class="flex gap-1 justify-end">
            <UButton size="2xs" variant="soft" icon="i-heroicons-pencil" @click="openEdit(row)" />
            <UButton size="2xs" color="red" variant="soft" icon="i-heroicons-trash" @click="confirmDelete = row" />
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            :icon="hasFilters ? 'i-heroicons-magnifying-glass' : 'i-heroicons-clipboard-document-list'"
            :title="hasFilters ? 'No matches' : 'No loan products yet'"
            :description="hasFilters ? 'Try a different search term or status filter.' : 'Define a loan product\'s amount range, term range and eligibility window.'"
          >
            <template v-if="!hasFilters" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">New Loan Product</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">New Loan Product</span>
        </template>
        <DynamicForm
          v-model="createForm"
          :fields="fields"
          :loading="creating"
          :error="error"
          submit-label="Create"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </UCard>
    </UModal>

    <UModal v-model="showEdit">
      <UCard>
        <template #header>
          <span class="font-semibold">Edit Loan Product</span>
        </template>
        <DynamicForm
          v-model="editForm"
          :fields="fields"
          :loading="editing"
          :error="editError"
          submit-label="Save changes"
          cancelable
          @submit="onEdit"
          @cancel="showEdit = false"
        />
      </UCard>
    </UModal>

    <ConfirmModal
      :model-value="confirmDelete !== null"
      title="Delete this loan product?"
      :description="`This permanently removes ${confirmDelete?.name ?? 'this loan product'} and cannot be undone.`"
      confirm-label="Delete"
      color="red"
      :loading="deleting"
      @update:model-value="(v: boolean) => { if (!v) confirmDelete = null }"
      @confirm="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { LoanProductRequest, LoanProductResponse, LoanProductStatus } from '~/features/loan-products/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const api = useApi()

const { data: products, pending, refresh } = await useAsyncData('loan-products', () => api<LoanProductResponse[]>('/loan-products'))

const columns: ColumnDef<LoanProductResponse>[] = [
  { key: 'code', sortable: true },
  { key: 'name', sortable: true },
  { key: 'loanType', label: 'Type', type: 'enum', sortable: true },
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
    to: 'maxTerm'
  },
  { key: 'effectiveFrom', label: 'Effective from', type: 'date', sortable: true },
  { key: 'status', type: 'status', sortable: true },
  { key: 'actions', label: '', class: 'text-right' }
]

const statusOptions: { label: string; value: LoanProductStatus | '' }[] = [
  { label: 'All statuses', value: '' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Inactive', value: 'INACTIVE' }
]
const statusFilter = ref<LoanProductStatus | ''>('')

const filteredByStatus = computed(() =>
  statusFilter.value ? (products.value ?? []).filter(p => p.status === statusFilter.value) : products.value
)

const { search, page, pageSize, sort, total, rows } = useClientTable(filteredByStatus, {
  searchFields: ['name', 'code'],
  pageSize: 10
})

const hasFilters = computed(() => !!search.value || !!statusFilter.value)

const totalLabel = computed(() => {
  const count = products.value?.length ?? 0
  return count === 1 ? '1 loan product' : `${count} loan products`
})

const fields: FieldDef[] = [
  { name: 'name', label: 'Product name', required: true, wrapper: 'half' },
  { name: 'code', label: 'Product code', required: true, hint: 'e.g. PL, HL', wrapper: 'half' },
  {
    name: 'loanType',
    label: 'Loan type',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: 'Personal', value: 'PERSONAL' },
      { label: 'Home', value: 'HOME' },
      { label: 'Auto', value: 'AUTO' },
      { label: 'Business', value: 'BUSINESS' },
      { label: 'Education', value: 'EDUCATION' },
      { label: 'Other', value: 'OTHER' }
    ]
  },
  {
    name: 'currency',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: 'USD', value: 'USD' },
      { label: 'KHR', value: 'KHR' }
    ]
  },
  { name: 'minAmount', label: 'Min amount', type: 'number', required: true, min: 0, step: 0.01, wrapper: 'half' },
  { name: 'maxAmount', label: 'Max amount', type: 'number', required: true, min: 0, step: 0.01, wrapper: 'half' },
  { name: 'minTerm', label: 'Min term (months)', type: 'number', required: true, min: 1, wrapper: 'half' },
  { name: 'maxTerm', label: 'Max term (months)', type: 'number', required: true, min: 1, wrapper: 'half' },
  {
    name: 'status',
    type: 'select',
    required: true,
    default: 'DRAFT',
    wrapper: 'half',
    options: [
      { label: 'Draft', value: 'DRAFT' },
      { label: 'Published', value: 'PUBLISHED' },
      { label: 'Inactive', value: 'INACTIVE' }
    ]
  },
  { name: 'effectiveFrom', label: 'Effective from', type: 'date', required: true, wrapper: 'half' },
  { name: 'effectiveTo', label: 'Effective to', type: 'date', hint: 'Leave blank for open-ended', wrapper: 'half' },
  { name: 'description', type: 'textarea' }
]

const {
  showCreate, creating, error, createForm, openCreate, onCreate,
  showEdit, editing, editError, editForm, openEdit, onEdit,
  deleting, confirmDelete, onDelete
} = useCrudModals<LoanProductResponse, LoanProductRequest>('/loan-products', refresh, {
  entityName: 'Loan product',
  createDefaults: () => ({
    name: '',
    code: '',
    loanType: undefined,
    currency: 'USD',
    minAmount: undefined,
    maxAmount: undefined,
    minTerm: undefined,
    maxTerm: undefined,
    status: 'DRAFT',
    effectiveFrom: '',
    effectiveTo: '',
    description: ''
  }),
  toForm: row => ({
    name: row.name,
    code: row.code,
    loanType: row.loanType,
    currency: row.currency,
    minAmount: row.minAmount,
    maxAmount: row.maxAmount,
    minTerm: row.minTerm,
    maxTerm: row.maxTerm,
    status: row.status,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo ?? '',
    description: row.description ?? ''
  }),
  toPayload: values => ({
    name: values.name,
    code: values.code,
    loanType: values.loanType,
    currency: values.currency,
    minAmount: values.minAmount,
    maxAmount: values.maxAmount,
    minTerm: values.minTerm,
    maxTerm: values.maxTerm,
    status: values.status,
    effectiveFrom: values.effectiveFrom,
    effectiveTo: values.effectiveTo || undefined,
    description: values.description || undefined
  })
})
</script>
