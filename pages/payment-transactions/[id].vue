<template>
  <div v-if="transaction">
    <UButton
      to="/payment-transactions"
      variant="link"
      icon="i-heroicons-arrow-left"
      size="xs"
      class="mb-1 px-0"
    >
      {{ t('payments.transactions.detail.backToList') }}
    </UButton>
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-bold">
          {{ t('payments.transactions.detail.detailTitle', { paymentNo: transaction.paymentNo }) }}
        </h1>
        <StatusBadge :status="transaction.status" />
      </div>
      <div v-if="isAdmin && transaction.status === 'PENDING'" class="flex gap-2">
        <UButton
          color="green"
          :loading="actionLoading === 'SUCCESS'"
          @click="onSetStatus('SUCCESS')"
          >{{ t('payments.transactions.detail.markSuccess') }}</UButton
        >
        <UButton
          color="red"
          variant="soft"
          :loading="actionLoading === 'FAILED'"
          @click="onSetStatus('FAILED')"
          >{{ t('payments.transactions.detail.markFailed') }}</UButton
        >
      </div>
      <UButton
        v-else-if="isAdmin && transaction.status === 'SUCCESS'"
        color="gray"
        variant="soft"
        :loading="actionLoading === 'REFUNDED'"
        @click="onSetStatus('REFUNDED')"
      >
        {{ t('payments.transactions.detail.refund') }}
      </UButton>
    </div>

    <UCard class="max-w-xl">
      <template #header>
        <span class="font-semibold">{{ t('payments.transactions.detail.detailsTitle') }}</span>
      </template>
      <dl class="grid grid-cols-2 gap-y-3 text-sm">
        <dt class="text-gray-500">{{ t('payments.transactions.detail.customer') }}</dt>
        <dd>
          <NuxtLink :to="`/customers/${transaction.customerId}`" class="text-primary-500">{{
            transaction.customerName
          }}</NuxtLink>
        </dd>
        <dt class="text-gray-500">{{ t('payments.transactions.detail.paymentMethod') }}</dt>
        <dd>{{ transaction.paymentMethodName }}</dd>
        <dt class="text-gray-500">{{ t('payments.transactions.detail.paymentChannel') }}</dt>
        <dd>{{ transaction.paymentChannelName }}</dd>
        <dt class="text-gray-500">{{ t('payments.transactions.detail.paymentGateway') }}</dt>
        <dd>{{ transaction.paymentGatewayName }}</dd>
        <dt class="text-gray-500">{{ t('payments.transactions.detail.businessType') }}</dt>
        <dd>{{ transaction.businessType }}</dd>
        <dt class="text-gray-500">{{ t('payments.transactions.detail.businessReference') }}</dt>
        <dd>{{ transaction.businessReference || '—' }}</dd>
        <dt class="text-gray-500">{{ t('payments.transactions.detail.amount') }}</dt>
        <dd class="font-semibold">
          {{ transaction.currency }} {{ formatCurrency(transaction.amount) }}
        </dd>
        <dt class="text-gray-500">{{ t('payments.transactions.detail.referenceNo') }}</dt>
        <dd>{{ transaction.referenceNo || '—' }}</dd>
        <dt class="text-gray-500">{{ t('payments.transactions.detail.requested') }}</dt>
        <dd>{{ formatDateTime(transaction.requestedAt) }}</dd>
        <dt class="text-gray-500">{{ t('payments.transactions.detail.completed') }}</dt>
        <dd>{{ transaction.completedAt ? formatDateTime(transaction.completedAt) : '—' }}</dd>
      </dl>
    </UCard>

    <UCard class="max-w-xl mt-6">
      <template #header>
        <span class="font-semibold">{{ t('payments.transactions.detail.itemsTitle') }}</span>
      </template>
      <DataTable :rows="transaction.items" :columns="itemColumns">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-list-bullet"
            :title="t('payments.transactions.detail.emptyItemsTitle')"
            :description="t('payments.transactions.detail.emptyItemsDescription')"
          />
        </template>
      </DataTable>
    </UCard>
  </div>
  <div v-else class="flex justify-center py-16">
    <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
  </div>
</template>

<script setup lang="ts">
import type {
  PaymentTransactionItemResponse,
  PaymentTransactionResponse,
  TransactionStatus
} from '~/features/payments/types'
import type { ColumnDef } from '~/shared/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { t } = useI18n()
const { isAdmin } = storeToRefs(useAuth())

const transactionId = route.params.id as string

const { data: transaction, refresh } = await useAsyncData(
  `payment-transaction-${transactionId}`,
  () => api<PaymentTransactionResponse>(`/payments/transactions/${transactionId}`)
)

const itemColumns = computed<ColumnDef<PaymentTransactionItemResponse>[]>(() => [
  { key: 'referenceType', label: t('payments.transactions.detail.itemColumns.referenceType') },
  { key: 'referenceId', label: t('payments.transactions.detail.itemColumns.referenceId') },
  { key: 'amount', label: t('payments.transactions.detail.itemColumns.amount'), type: 'currency' }
])

const actionLoading = ref<TransactionStatus | null>(null)

const statusWordKeys: Record<'SUCCESS' | 'FAILED' | 'REFUNDED', string> = {
  SUCCESS: 'payments.transactions.detail.statusWords.success',
  FAILED: 'payments.transactions.detail.statusWords.failed',
  REFUNDED: 'payments.transactions.detail.statusWords.refunded'
}

async function onSetStatus(status: Extract<TransactionStatus, 'SUCCESS' | 'FAILED' | 'REFUNDED'>) {
  actionLoading.value = status
  try {
    await api(`/payments/transactions/${transactionId}/status`, { method: 'PUT', body: { status } })
    toast.add({
      title: t('payments.transactions.detail.statusUpdated', { status: t(statusWordKeys[status]) }),
      color: 'green'
    })
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    actionLoading.value = null
  }
}
</script>
