<template>
  <div v-if="snapshot">
    <UButton
      to="/trial-balance"
      variant="link"
      icon="i-heroicons-arrow-left"
      size="xs"
      class="mb-1 px-0"
    >
      {{ t('accounting.trialBalance.backToList') }}
    </UButton>
    <h1 class="text-xl font-bold mb-6">
      {{ t('accounting.trialBalance.snapshotTitle', { period: snapshot.financialPeriodName }) }}
    </h1>

    <UCard class="mb-6">
      <dl class="grid grid-cols-2 sm:grid-cols-4 gap-y-3 text-sm">
        <dt class="text-gray-500">{{ t('accounting.trialBalance.generatedAt') }}</dt>
        <dd>{{ formatDateTime(snapshot.generatedAt) }}</dd>
        <dt class="text-gray-500">{{ t('accounting.trialBalance.generatedBy') }}</dt>
        <dd>{{ snapshot.generatedBy }}</dd>
        <dt class="text-gray-500">{{ t('accounting.trialBalance.totalDebit') }}</dt>
        <dd class="font-semibold">{{ formatCurrency(snapshot.totalDebit) }}</dd>
        <dt class="text-gray-500">{{ t('accounting.trialBalance.totalCredit') }}</dt>
        <dd class="font-semibold">{{ formatCurrency(snapshot.totalCredit) }}</dd>
      </dl>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">{{ t('accounting.trialBalance.accounts') }}</span>
          <span
            class="text-xs font-semibold"
            :class="isBalanced ? 'text-teal-600 dark:text-teal-400' : 'text-red-500'"
          >
            {{ isBalanced ? t('accounting.trialBalance.balanced') : t('accounting.trialBalance.outOfBalance') }}
          </span>
        </div>
      </template>
      <DataTable :rows="snapshot.lines" :columns="columns" />
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
import type { TrialBalanceResponse, TrialBalanceRowResponse } from '~/features/accounting/types'
import type { ColumnDef } from '~/shared/types'

const { t } = useI18n()
const route = useRoute()
const api = useApi()

const snapshotId = route.params.id as string

const {
  data: snapshot,
  error,
  pending,
  refresh
} = await useAsyncData(`trial-balance-snapshot-${snapshotId}`, () =>
  api<TrialBalanceResponse>(`/trial-balance/snapshots/${snapshotId}`)
)

const columns = computed<ColumnDef<TrialBalanceRowResponse>[]>(() => [
  { key: 'accountNo', label: t('accounting.trialBalance.columns.accountNo'), sortable: true },
  { key: 'accountName', label: t('accounting.trialBalance.columns.accountName'), sortable: true },
  { key: 'totalDebit', label: t('accounting.trialBalance.columns.debit'), type: 'currency', sortable: true },
  { key: 'totalCredit', label: t('accounting.trialBalance.columns.credit'), type: 'currency', sortable: true },
  { key: 'balance', label: t('accounting.trialBalance.columns.balance'), type: 'currency', sortable: true }
])

const isBalanced = computed(() => {
  if (!snapshot.value) return true
  return Math.abs(snapshot.value.totalDebit - snapshot.value.totalCredit) < 0.005
})
</script>
