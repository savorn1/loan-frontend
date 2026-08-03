<template>
  <div>
    <PageHeader :title="t('payments.transactions.title')" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">{{
          t('payments.transactions.newTransaction')
        }}</UButton>
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
        <DateRangeFilter v-model:from="dateFrom" v-model:to="dateTo" />
        <UButton
          v-if="hasFilters"
          variant="ghost"
          color="gray"
          icon="i-heroicons-x-mark"
          @click="((statusFilter = ''), (dateFrom = ''), (dateTo = ''))"
        >
          {{ t('common.clearFilters') }}
        </UButton>
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
        @select="
          (row: PaymentTransactionResponse) => router.push(`/payment-transactions/${row.id}`)
        "
      >
        <template #empty-state>
          <EmptyState
            :icon="hasFilters ? 'i-heroicons-magnifying-glass' : 'i-heroicons-arrows-right-left'"
            :title="hasFilters ? t('common.noMatches') : t('payments.transactions.emptyTitle')"
            :description="
              hasFilters
                ? t('payments.transactions.emptySearchDescription')
                : t('payments.transactions.emptyDescription')
            "
          >
            <template v-if="!hasFilters" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">{{
                t('payments.transactions.newTransaction')
              }}</UButton>
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
          <span class="font-semibold">{{ t('payments.transactions.newTransaction') }}</span>
        </template>
        <DynamicForm
          v-model="createForm"
          :fields="fields"
          :loading="creating"
          :error="error"
          :submit-label="t('common.create')"
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
import type { ColumnDef, FieldDef, PageResponse } from '~/shared/types'

const api = useApi()
const toast = useToast()
const router = useRouter()
const { t } = useI18n()

const {
  data: transactions,
  pending,
  error: fetchError,
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
  const result = await api<PageResponse<CustomerResponse>>('/customers', {
    query: { search: query, size: 20 }
  })
  return result.content.map((c) => ({
    label: `${c.firstName} ${c.lastName} (#${c.id})`,
    value: c.id
  }))
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

const columns = computed<ColumnDef<PaymentTransactionResponse>[]>(() => [
  { key: 'paymentNo', label: t('payments.transactions.columns.paymentNo'), sortable: true },
  { key: 'customerName', label: t('payments.transactions.columns.customer'), sortable: true },
  {
    key: 'businessType',
    label: t('payments.transactions.columns.businessType'),
    sortable: true
  },
  {
    key: 'amount',
    label: t('payments.transactions.columns.amount'),
    type: 'currency',
    sortable: true,
    prefix: (row) => `${row.currency} `
  },
  {
    key: 'status',
    label: t('payments.transactions.columns.status'),
    type: 'status',
    sortable: true
  },
  {
    key: 'requestedAt',
    label: t('payments.transactions.columns.requested'),
    type: 'datetime',
    sortable: true
  },
  {
    key: 'completedAt',
    label: t('payments.transactions.columns.completed'),
    type: 'datetime',
    sortable: true
  }
])

const statusOptions = computed<{ label: string; value: TransactionStatus | '' }[]>(() => [
  { label: t('payments.transactions.statusOptions.all'), value: '' },
  { label: t('payments.transactions.statusOptions.pending'), value: 'PENDING' },
  { label: t('payments.transactions.statusOptions.success'), value: 'SUCCESS' },
  { label: t('payments.transactions.statusOptions.failed'), value: 'FAILED' },
  { label: t('payments.transactions.statusOptions.refunded'), value: 'REFUNDED' }
])
const statusFilter = ref<TransactionStatus | ''>('')
const { from: dateFrom, to: dateTo, inRange } = useDateRangeFilter()

const filteredByStatus = computed(() =>
  (transactions.value ?? [])
    .filter((t) => !statusFilter.value || t.status === statusFilter.value)
    .filter((t) => inRange(t.requestedAt))
)

const { page, pageSize, sort, total, rows } = useClientTable(filteredByStatus, { pageSize: 10 })

const hasFilters = computed(() => !!statusFilter.value || !!dateFrom.value || !!dateTo.value)

const totalLabel = computed(() => {
  const count = transactions.value?.length ?? 0
  return count === 1
    ? t('payments.transactions.totalLabelOne')
    : t('payments.transactions.totalLabelOther', { count })
})

const showCreate = ref(false)
const creating = ref(false)
const error = ref('')

const fields = computed<FieldDef[]>(() => [
  {
    name: 'customerId',
    label: t('payments.transactions.fields.customer'),
    type: 'relationship',
    required: true,
    search: searchCustomers,
    placeholder: t('payments.transactions.fields.customerPlaceholder')
  },
  {
    name: 'paymentMethodId',
    label: t('payments.transactions.fields.paymentMethod'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: methodOptions.value,
    placeholder: t('payments.transactions.fields.paymentMethodPlaceholder')
  },
  {
    name: 'paymentChannelId',
    label: t('payments.transactions.fields.paymentChannel'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: channelOptions.value,
    placeholder: t('payments.transactions.fields.paymentChannelPlaceholder')
  },
  {
    name: 'paymentGatewayId',
    label: t('payments.transactions.fields.paymentGateway'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: gatewayOptions.value,
    placeholder: t('payments.transactions.fields.paymentGatewayPlaceholder')
  },
  {
    name: 'currency',
    label: t('payments.transactions.fields.currency'),
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
    label: t('payments.transactions.fields.amount'),
    type: 'currency',
    required: true,
    wrapper: 'half'
  },
  {
    name: 'businessType',
    label: t('payments.transactions.fields.businessType'),
    required: true,
    wrapper: 'half',
    placeholder: t('payments.transactions.fields.businessTypePlaceholder')
  },
  {
    name: 'businessReference',
    label: t('payments.transactions.fields.businessReference'),
    wrapper: 'half'
  },
  {
    name: 'referenceNo',
    label: t('payments.transactions.fields.referenceNo'),
    wrapper: 'half'
  }
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
    toast.add({ title: t('payments.transactions.created'), color: 'green' })
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
