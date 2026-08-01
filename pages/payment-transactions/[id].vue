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

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <UCard
        class="lg:col-span-1 overflow-hidden"
        :ui="{ body: { padding: 'px-0 py-0 sm:p-0' }, header: { padding: 'px-5 py-4 sm:px-5' } }"
      >
        <template #header>
          <span class="font-semibold">{{ t('payments.transactions.detail.amount') }}</span>
        </template>

        <div
          class="flex flex-col items-center gap-2 text-center px-5 py-6 bg-gradient-to-b from-primary-50/80 to-transparent dark:from-primary-400/10"
        >
          <div
            class="flex items-center justify-center w-11 h-11 rounded-full bg-primary-100 text-primary-600 dark:bg-primary-400/10 dark:text-primary-400"
          >
            <UIcon name="i-heroicons-banknotes" class="w-6 h-6" />
          </div>
          <p class="text-3xl font-bold tracking-tight tabular-nums">
            {{ transaction.currency }} {{ formatCurrency(transaction.amount) }}
          </p>
          <UBadge color="gray" variant="subtle" size="sm">{{ transaction.businessType }}</UBadge>
        </div>

        <dl class="divide-y divide-gray-100 dark:divide-gray-800 px-5 pb-1">
          <div class="flex items-center justify-between gap-4 py-3 text-sm">
            <dt class="flex items-center gap-2 text-gray-500">
              <UIcon name="i-heroicons-hashtag" class="w-4 h-4 shrink-0" />
              {{ t('payments.transactions.detail.referenceNo') }}
            </dt>
            <dd class="font-medium text-right truncate">{{ transaction.referenceNo || '—' }}</dd>
          </div>
          <div class="flex items-center justify-between gap-4 py-3 text-sm">
            <dt class="flex items-center gap-2 text-gray-500">
              <UIcon name="i-heroicons-document-text" class="w-4 h-4 shrink-0" />
              {{ t('payments.transactions.detail.businessReference') }}
            </dt>
            <dd class="font-medium text-right truncate">
              {{ transaction.businessReference || '—' }}
            </dd>
          </div>
          <div class="flex items-center justify-between gap-4 py-3 text-sm">
            <dt class="flex items-center gap-2 text-gray-500">
              <UIcon name="i-heroicons-clock" class="w-4 h-4 shrink-0" />
              {{ t('payments.transactions.detail.requested') }}
            </dt>
            <dd class="font-medium text-right">{{ formatDateTime(transaction.requestedAt) }}</dd>
          </div>
          <div class="flex items-center justify-between gap-4 py-3 text-sm">
            <dt class="flex items-center gap-2 text-gray-500">
              <UIcon name="i-heroicons-check-circle" class="w-4 h-4 shrink-0" />
              {{ t('payments.transactions.detail.completed') }}
            </dt>
            <dd class="font-medium text-right">
              {{ transaction.completedAt ? formatDateTime(transaction.completedAt) : '—' }}
            </dd>
          </div>
        </dl>
      </UCard>

      <UCard class="lg:col-span-2">
        <template #header>
          <span class="font-semibold">{{ t('payments.transactions.detail.detailsTitle') }}</span>
        </template>
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex items-start gap-3">
            <div
              class="flex items-center justify-center w-9 h-9 shrink-0 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
            >
              <UIcon name="i-heroicons-user" class="w-4.5 h-4.5" />
            </div>
            <div class="min-w-0">
              <dt class="text-xs uppercase tracking-wide text-gray-500">
                {{ t('payments.transactions.detail.customer') }}
              </dt>
              <dd class="mt-0.5">
                <NuxtLink
                  :to="`/customers/${transaction.customerId}`"
                  class="text-primary-500 font-medium hover:underline"
                  >{{ transaction.customerName }}</NuxtLink
                >
              </dd>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div
              class="flex items-center justify-center w-9 h-9 shrink-0 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
            >
              <UIcon name="i-heroicons-credit-card" class="w-4.5 h-4.5" />
            </div>
            <div class="min-w-0">
              <dt class="text-xs uppercase tracking-wide text-gray-500">
                {{ t('payments.transactions.detail.paymentMethod') }}
              </dt>
              <dd class="mt-0.5 font-medium">{{ transaction.paymentMethodName }}</dd>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div
              class="flex items-center justify-center w-9 h-9 shrink-0 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
            >
              <UIcon name="i-heroicons-device-phone-mobile" class="w-4.5 h-4.5" />
            </div>
            <div class="min-w-0">
              <dt class="text-xs uppercase tracking-wide text-gray-500">
                {{ t('payments.transactions.detail.paymentChannel') }}
              </dt>
              <dd class="mt-0.5 font-medium">{{ transaction.paymentChannelName }}</dd>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div
              class="flex items-center justify-center w-9 h-9 shrink-0 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
            >
              <UIcon name="i-heroicons-globe-alt" class="w-4.5 h-4.5" />
            </div>
            <div class="min-w-0">
              <dt class="text-xs uppercase tracking-wide text-gray-500">
                {{ t('payments.transactions.detail.paymentGateway') }}
              </dt>
              <dd class="mt-0.5 font-medium">{{ transaction.paymentGatewayName }}</dd>
            </div>
          </div>
        </dl>
      </UCard>
    </div>

    <UCard class="mt-6">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">{{ t('payments.transactions.detail.itemsTitle') }}</span>
          <UBadge v-if="transaction.items?.length" color="gray" variant="subtle">{{
            transaction.items.length
          }}</UBadge>
        </div>
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
  <div v-else-if="error" class="py-8">
    <ErrorState :title="t('common.errorState.title')" :description="apiErrorMessage(error)">
      <template #action>
        <UButton
          size="sm"
          variant="soft"
          icon="i-heroicons-arrow-path"
          :loading="pending"
          @click="refresh()"
        >
          {{ t('common.errorState.retry') }}
        </UButton>
      </template>
    </ErrorState>
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

const {
  data: transaction,
  error,
  pending,
  refresh
} = await useAsyncData(`payment-transaction-${transactionId}`, () =>
  api<PaymentTransactionResponse>(`/payments/transactions/${transactionId}`)
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
