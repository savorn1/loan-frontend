<template>
  <div>
    <PageHeader title="Payment Transactions" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">New Transaction</UButton>
      </template>
    </PageHeader>

    <UCard class="mb-6">
      <div class="flex flex-wrap items-center gap-3">
        <USelectMenu v-model="statusFilter" :options="statusOptions" option-attribute="label" value-attribute="value" class="w-40" />
        <UButton v-if="statusFilter" variant="ghost" color="gray" icon="i-heroicons-x-mark" @click="statusFilter = ''">
          Clear filter
        </UButton>
      </div>
    </UCard>

    <UCard>
      <DataTable
        :rows="rows"
        :columns="columns"
        :loading="pending"
        v-model:sort="sort"
        @select="(row: PaymentTransactionResponse) => router.push(`/payment-transactions/${row.id}`)"
      >
        <template #empty-state>
          <EmptyState
            :icon="statusFilter ? 'i-heroicons-magnifying-glass' : 'i-heroicons-arrows-right-left'"
            :title="statusFilter ? 'No matches' : 'No transactions yet'"
            :description="statusFilter ? 'Try clearing the status filter.' : 'Record a transaction against a payment to get started.'"
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
import type { PaymentMethodResponse, PaymentResponse, PaymentTransactionRequest, PaymentTransactionResponse, TransactionStatus } from '~/features/payments/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const api = useApi()
const toast = useToast()
const router = useRouter()

const { data: transactions, pending, refresh } = await useAsyncData('payment-transactions', () => api<PaymentTransactionResponse[]>('/payments/transactions'))
const { data: paymentsRaw } = await useAsyncData('payment-transactions-payments', () => api<PaymentResponse[]>('/payments'))
const { data: methodsRaw } = await useAsyncData('payment-transactions-methods', () => api<PaymentMethodResponse[]>('/payments/methods'))

const paymentOptions = computed(() =>
  (paymentsRaw.value ?? []).map(p => ({ label: `#${p.id} — loan #${p.loanId} (${formatCurrency(p.amount)})`, value: p.id }))
)
const methodOptions = computed(() =>
  (methodsRaw.value ?? []).filter(m => m.isActive).map(m => ({ label: m.name, value: m.id }))
)

const columns: ColumnDef<PaymentTransactionResponse>[] = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'loanId', label: 'Loan', type: 'link', sortable: true, href: row => `/loans/${row.loanId}`, prefix: () => '#' },
  { key: 'paymentMethodName', label: 'Method', sortable: true },
  { key: 'amount', type: 'currency', sortable: true },
  { key: 'status', type: 'status', sortable: true },
  { key: 'processedAt', label: 'Processed', type: 'datetime', sortable: true },
  { key: 'createdAt', label: 'Created', type: 'datetime', sortable: true }
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
  statusFilter.value ? (transactions.value ?? []).filter(t => t.status === statusFilter.value) : transactions.value
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
  { name: 'paymentId', label: 'Payment', type: 'select', required: true, options: paymentOptions.value, placeholder: 'Select a payment' },
  { name: 'paymentMethodId', label: 'Payment method', type: 'select', required: true, options: methodOptions.value, placeholder: 'Select a method' },
  { name: 'amount', type: 'number', required: true, prefix: '$', min: 0.01, step: 0.01, wrapper: 'half' },
  { name: 'reference', wrapper: 'half' }
])

const createForm = ref<Record<string, any>>({})

function openCreate() {
  createForm.value = { paymentId: undefined, paymentMethodId: undefined, amount: undefined, reference: '' }
  error.value = ''
  showCreate.value = true
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    const payload: PaymentTransactionRequest = {
      paymentId: values.paymentId,
      paymentMethodId: values.paymentMethodId,
      amount: values.amount,
      reference: values.reference || undefined
    }
    const created = await api<PaymentTransactionResponse>('/payments/transactions', { method: 'POST', body: payload })
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
