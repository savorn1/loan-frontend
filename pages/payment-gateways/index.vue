<template>
  <div>
    <PageHeader title="Payment Gateways" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">New Payment Gateway</UButton>
      </template>
    </PageHeader>

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search by name or code..."
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
            :icon="search ? 'i-heroicons-magnifying-glass' : 'i-heroicons-globe-alt'"
            :title="search ? 'No matches' : 'No payment gateways yet'"
            :description="
              search
                ? `Nothing matches “${search}”.`
                : 'Add a payment gateway (external provider) that a payment channel can connect through.'
            "
          >
            <template v-if="!search" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">New Payment Gateway</UButton>
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
          <span class="font-semibold">New Payment Gateway</span>
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
          <span class="font-semibold">Edit Payment Gateway</span>
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
      title="Delete this payment gateway?"
      description="This permanently removes the payment gateway and cannot be undone."
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
import type { PaymentGatewayRequest, PaymentGatewayResponse } from '~/features/payments/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const api = useApi()

const {
  data: gateways,
  pending,
  refresh
} = await useAsyncData('payment-gateways', () =>
  api<PaymentGatewayResponse[]>('/payments/gateways')
)

const columns: ColumnDef<PaymentGatewayResponse>[] = [
  { key: 'code', sortable: true },
  { key: 'name', sortable: true },
  { key: 'provider', sortable: true },
  { key: 'status', type: 'status', sortable: true },
  { key: 'createdAt', label: 'Created', type: 'datetime', sortable: true },
  { key: 'actions', label: '', class: 'text-right' }
]

const { search, page, pageSize, sort, total, rows } = useClientTable(gateways, {
  searchFields: ['name', 'code'],
  pageSize: 10
})

const totalLabel = computed(() => {
  const count = gateways.value?.length ?? 0
  return count === 1 ? '1 payment gateway' : `${count} payment gateways`
})

const fields: FieldDef[] = [
  { name: 'code', required: true, wrapper: 'half' },
  { name: 'name', required: true, wrapper: 'half' },
  { name: 'provider', required: true, wrapper: 'half' },
  {
    name: 'status',
    type: 'select',
    required: true,
    default: 'ACTIVE',
    wrapper: 'half',
    options: [
      { label: 'Active', value: 'ACTIVE' },
      { label: 'Inactive', value: 'INACTIVE' }
    ]
  },
  { name: 'apiUrl', label: 'API URL', type: 'url', required: true }
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
} = useCrudModals<PaymentGatewayResponse, PaymentGatewayRequest>('/payments/gateways', refresh, {
  entityName: 'Payment gateway',
  createDefaults: () => ({ code: '', name: '', provider: '', apiUrl: '', status: 'ACTIVE' }),
  toForm: (row) => ({
    code: row.code,
    name: row.name,
    provider: row.provider,
    apiUrl: row.apiUrl,
    status: row.status
  }),
  toPayload: (values) => ({
    code: values.code,
    name: values.name,
    provider: values.provider,
    apiUrl: values.apiUrl,
    status: values.status
  })
})
</script>
