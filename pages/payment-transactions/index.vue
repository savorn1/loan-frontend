<template>
  <div>
    <PageHeader title="Payment Transactions" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">New Transaction</UButton>
      </template>
    </PageHeader>

    <UCard class="mb-6">
      <div class="flex flex-wrap items-center gap-3">
        <USelectMenu
          v-model="statusFilter"
          :options="statusOptions"
          option-attribute="label"
          value-attribute="value"
          class="w-40"
        />
        <UButton
          v-if="statusFilter"
          variant="ghost"
          color="gray"
          icon="i-heroicons-x-mark"
          @click="statusFilter = ''"
        >
          Clear filter
        </UButton>
      </div>
    </UCard>

    <UCard>
      <DataTable
        v-model:sort="sort"
        :rows="rows"
        :columns="columns"
        :loading="pending"
        @select="
          (row: PaymentTransactionResponse) => router.push(`/payment-transactions/${row.id}`)
        "
      >
        <template #empty-state>
          <EmptyState
            :icon="statusFilter ? 'i-heroicons-magnifying-glass' : 'i-heroicons-arrows-right-left'"
            :title="statusFilter ? 'No matches' : 'No transactions yet'"
            :description="
              statusFilter
                ? 'Try clearing the status filter.'
                : 'Record a transaction to get started.'
            "
          >
            <template v-if="!statusFilter" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">New Transaction</UButton>
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
          <span class="font-semibold">New Transaction</span>
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
  </div>
</template>

<script setup lang="ts">
import type { CustomerResponse } from '~/features/customers/types'
import type {
  PaymentChannelResponse,
  PaymentGatewayResponse,
  PaymentMethodResponse,
  PaymentTransactionRequest,
  PaymentTransactionResponse,
  TransactionStatus
} from '~/features/payments/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const api = useApi()
const toast = useToast()
const router = useRouter()

const {
  data: transactions,
  pending,
  refresh
} = await useAsyncData('payment-transactions', () =>
  api<PaymentTransactionResponse[]>('/payments/transactions')
)
const { data: methodsRaw } = await useAsyncData('payment-transactions-methods', () =>
  api<PaymentMethodResponse[]>('/payments/methods')
)
const { data: channelsRaw } = await useAsyncData('payment-transactions-channels', () =>
  api<PaymentChannelResponse[]>('/payments/channels')
)
const { data: gatewaysRaw } = await useAsyncData('payment-transactions-gateways', () =>
  api<PaymentGatewayResponse[]>('/payments/gateways')
)

// Async-searched via the backend's CustomerFilterRequest.search — not preloaded, since
// the customer list can be far larger than any dropdown should hold client-side.
async function searchCustomers(query: string) {
  const customers = await api<CustomerResponse[]>('/customers', {
    query: { search: query, size: 20 }
  })
  return customers.map((c) => ({ label: `${c.firstName} ${c.lastName} (#${c.id})`, value: c.id }))
}

const methodOptions = computed(() =>
  (methodsRaw.value ?? [])
    .filter((m) => m.status === 'ACTIVE')
    .map((m) => ({ label: m.name, value: m.id }))
)
const channelOptions = computed(() =>
  (channelsRaw.value ?? [])
    .filter((c) => c.status === 'ACTIVE')
    .map((c) => ({ label: c.name, value: c.id }))
)
const gatewayOptions = computed(() =>
  (gatewaysRaw.value ?? [])
    .filter((g) => g.status === 'ACTIVE')
    .map((g) => ({ label: g.name, value: g.id }))
)

const columns: ColumnDef<PaymentTransactionResponse>[] = [
  { key: 'paymentNo', label: 'Payment No', sortable: true },
  { key: 'customerName', label: 'Customer', sortable: true },
  { key: 'businessType', label: 'Business type', sortable: true },
  { key: 'amount', type: 'currency', sortable: true, prefix: (row) => `${row.currency} ` },
  { key: 'status', type: 'status', sortable: true },
  { key: 'requestedAt', label: 'Requested', type: 'datetime', sortable: true },
  { key: 'completedAt', label: 'Completed', type: 'datetime', sortable: true }
]

const statusOptions: { label: string; value: TransactionStatus | '' }[] = [
  { label: 'All statuses', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Success', value: 'SUCCESS' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Refunded', value: 'REFUNDED' }
]
const statusFilter = ref<TransactionStatus | ''>('')

const filteredByStatus = computed(() =>
  statusFilter.value
    ? (transactions.value ?? []).filter((t) => t.status === statusFilter.value)
    : transactions.value
)

const { page, pageSize, sort, total, rows } = useClientTable(filteredByStatus, { pageSize: 10 })

const totalLabel = computed(() => {
  const count = transactions.value?.length ?? 0
  return count === 1 ? '1 transaction' : `${count} transactions`
})

const showCreate = ref(false)
const creating = ref(false)
const error = ref('')

const fields = computed<FieldDef[]>(() => [
  {
    name: 'customerId',
    label: 'Customer',
    type: 'relationship',
    required: true,
    search: searchCustomers,
    placeholder: 'Search customers…'
  },
  {
    name: 'paymentMethodId',
    label: 'Payment method',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: methodOptions.value,
    placeholder: 'Select a method'
  },
  {
    name: 'paymentChannelId',
    label: 'Payment channel',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: channelOptions.value,
    placeholder: 'Select a channel'
  },
  {
    name: 'paymentGatewayId',
    label: 'Payment gateway',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: gatewayOptions.value,
    placeholder: 'Select a gateway'
  },
  {
    name: 'currency',
    type: 'select',
    required: true,
    default: 'USD',
    wrapper: 'half',
    options: [
      { label: 'USD', value: 'USD' },
      { label: 'KHR', value: 'KHR' }
    ]
  },
  {
    name: 'amount',
    type: 'currency',
    required: true,
    wrapper: 'half'
  },
  {
    name: 'businessType',
    label: 'Business type',
    required: true,
    wrapper: 'half',
    placeholder: 'e.g. LOAN_PAYMENT'
  },
  { name: 'businessReference', label: 'Business reference', wrapper: 'half' },
  { name: 'referenceNo', label: 'Reference no.', wrapper: 'half' }
])

const createForm = ref<Record<string, any>>({})

function openCreate() {
  createForm.value = {
    customerId: undefined,
    paymentMethodId: undefined,
    paymentChannelId: undefined,
    paymentGatewayId: undefined,
    currency: 'USD',
    amount: undefined,
    businessType: '',
    businessReference: '',
    referenceNo: ''
  }
  error.value = ''
  showCreate.value = true
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    const payload: PaymentTransactionRequest = {
      customerId: values.customerId,
      paymentMethodId: values.paymentMethodId,
      paymentChannelId: values.paymentChannelId,
      paymentGatewayId: values.paymentGatewayId,
      currency: values.currency,
      amount: values.amount,
      businessType: values.businessType,
      businessReference: values.businessReference || undefined,
      referenceNo: values.referenceNo || undefined
    }
    const created = await api<PaymentTransactionResponse>('/payments/transactions', {
      method: 'POST',
      body: payload
    })
    toast.add({ title: 'Transaction created', color: 'green' })
    showCreate.value = false
    await refresh()
    await router.push(`/payment-transactions/${created.id}`)
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}
</script>
