<template>
  <div>
    <PageHeader title="Payment Methods" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">New Payment Method</UButton>
      </template>
    </PageHeader>

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search by name..."
          class="max-w-xs"
        >
          <template v-if="search" #trailing>
            <UButton
              color="gray"
              variant="link"
              icon="i-heroicons-x-mark"
              :padded="false"
              @click="search = ''"
            />
          </template>
        </UInput>
      </template>

      <DataTable v-model:sort="sort" :rows="rows" :columns="columns" :loading="pending">
        <template #actions-data="{ row }">
          <div class="flex gap-1 justify-end">
            <UButton size="2xs" variant="soft" icon="i-heroicons-pencil" @click="openEdit(row)" />
            <UButton
              size="2xs"
              color="red"
              variant="soft"
              icon="i-heroicons-trash"
              @click="confirmDelete = row"
            />
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            :icon="search ? 'i-heroicons-magnifying-glass' : 'i-heroicons-wallet'"
            :title="search ? 'No matches' : 'No payment methods yet'"
            :description="
              search
                ? `Nothing matches “${search}”.`
                : 'Add a payment method to start recording transactions against it.'
            "
          >
            <template v-if="!search" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">New Payment Method</UButton>
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
          <span class="font-semibold">New Payment Method</span>
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
          <span class="font-semibold">Edit Payment Method</span>
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
      title="Delete this payment method?"
      description="This permanently removes the payment method and cannot be undone."
      confirm-label="Delete"
      color="red"
      :loading="deleting"
      @update:model-value="
        (v: boolean) => {
          if (!v) confirmDelete = null
        }
      "
      @confirm="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { PaymentMethodRequest, PaymentMethodResponse } from '~/features/payments/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const api = useApi()

const {
  data: methods,
  pending,
  refresh
} = await useAsyncData('payment-methods', () => api<PaymentMethodResponse[]>('/payments/methods'))

const columns: ColumnDef<PaymentMethodResponse>[] = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'name', sortable: true },
  { key: 'type', type: 'enum', sortable: true },
  {
    key: 'isActive',
    label: 'Status',
    type: 'boolean',
    trueLabel: 'Active',
    falseLabel: 'Inactive',
    trueColor: 'teal',
    falseColor: 'gray',
    sortable: true
  },
  { key: 'createdAt', label: 'Created', type: 'datetime', sortable: true },
  { key: 'actions', label: '', class: 'text-right' }
]

const { search, page, pageSize, sort, total, rows } = useClientTable(methods, {
  searchFields: ['name'],
  pageSize: 10
})

const totalLabel = computed(() => {
  const count = methods.value?.length ?? 0
  return count === 1 ? '1 payment method' : `${count} payment methods`
})

const fields: FieldDef[] = [
  { name: 'name', required: true, wrapper: 'half' },
  {
    name: 'type',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: 'Cash', value: 'CASH' },
      { label: 'Bank transfer', value: 'BANK_TRANSFER' },
      { label: 'Credit card', value: 'CREDIT_CARD' },
      { label: 'Mobile wallet', value: 'MOBILE_WALLET' },
      { label: 'Cheque', value: 'CHEQUE' }
    ]
  },
  { name: 'isActive', label: 'Active', type: 'switch', default: true },
  { name: 'details', type: 'textarea' }
]

const {
  showCreate,
  creating,
  error,
  createForm,
  openCreate,
  onCreate,
  showEdit,
  editing,
  editError,
  editForm,
  openEdit,
  onEdit,
  deleting,
  confirmDelete,
  onDelete
} = useCrudModals<PaymentMethodResponse, PaymentMethodRequest>('/payments/methods', refresh, {
  entityName: 'Payment method',
  createDefaults: () => ({ name: '', type: undefined, isActive: true, details: '' }),
  toForm: (row) => ({
    name: row.name,
    type: row.type,
    isActive: row.isActive,
    details: row.details ?? ''
  }),
  toPayload: (values) => ({
    name: values.name,
    type: values.type,
    isActive: values.isActive,
    details: values.details || undefined
  })
})
</script>
