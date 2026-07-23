<template>
  <div v-if="transaction">
    <UButton to="/payment-transactions" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      Back to transactions
    </UButton>
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-bold">Transaction #{{ transaction.id }}</h1>
        <StatusBadge :status="transaction.status" />
      </div>
      <div class="flex gap-2" v-if="isAdmin && transaction.status === 'PENDING'">
        <UButton color="green" :loading="actionLoading === 'SUCCESS'" @click="onSetStatus('SUCCESS')">Mark success</UButton>
        <UButton color="red" variant="soft" :loading="actionLoading === 'FAILED'" @click="onSetStatus('FAILED')">Mark failed</UButton>
      </div>
      <UButton
        v-else-if="isAdmin && transaction.status === 'SUCCESS'"
        color="gray"
        variant="soft"
        :loading="actionLoading === 'REFUNDED'"
        @click="onSetStatus('REFUNDED')"
      >
        Refund
      </UButton>
    </div>

    <UCard class="max-w-xl">
      <template #header>
        <span class="font-semibold">Details</span>
      </template>
      <dl class="grid grid-cols-2 gap-y-3 text-sm">
        <dt class="text-gray-500">Loan</dt>
        <dd>
          <NuxtLink :to="`/loans/${transaction.loanId}`" class="text-primary-500">#{{ transaction.loanId }}</NuxtLink>
        </dd>
        <dt class="text-gray-500">Payment</dt>
        <dd>#{{ transaction.paymentId }}</dd>
        <dt class="text-gray-500">Method</dt>
        <dd>{{ transaction.paymentMethodName }}</dd>
        <dt class="text-gray-500">Amount</dt>
        <dd class="font-semibold">{{ formatCurrency(transaction.amount) }}</dd>
        <dt class="text-gray-500">Reference</dt>
        <dd>{{ transaction.reference || '—' }}</dd>
        <dt class="text-gray-500">Processed</dt>
        <dd>{{ formatDateTime(transaction.processedAt) }}</dd>
      </dl>
    </UCard>
  </div>
  <div v-else class="flex justify-center py-16">
    <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
  </div>
</template>

<script setup lang="ts">
import type { PaymentTransactionResponse, TransactionStatus } from '~/features/payments/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())

const transactionId = route.params.id as string

const { data: transaction, refresh } = await useAsyncData(`payment-transaction-${transactionId}`, () =>
  api<PaymentTransactionResponse>(`/payments/transactions/${transactionId}`)
)

const actionLoading = ref<TransactionStatus | null>(null)

async function onSetStatus(status: Extract<TransactionStatus, 'SUCCESS' | 'FAILED' | 'REFUNDED'>) {
  actionLoading.value = status
  try {
    await api(`/payments/transactions/${transactionId}/status`, { method: 'PUT', body: { status } })
    toast.add({ title: `Transaction marked ${status.toLowerCase()}`, color: 'green' })
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    actionLoading.value = null
  }
}
</script>
