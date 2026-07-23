<template>
  <UCard>
    <template #header>
      <span class="font-semibold">Status history</span>
    </template>

    <ol v-if="(history ?? []).length" class="space-y-4">
      <li v-for="entry in history" :key="entry.id" class="flex items-start gap-3">
        <div class="flex flex-col items-center pt-0.5">
          <UIcon name="i-heroicons-clock" class="w-4 h-4 text-gray-400" />
          <div class="w-px flex-1 bg-gray-200 dark:bg-gray-800 mt-1" />
        </div>
        <div class="pb-1">
          <div class="flex items-center gap-2 text-sm">
            <StatusBadge v-if="entry.fromStatus" :status="entry.fromStatus" />
            <UIcon v-if="entry.fromStatus" name="i-heroicons-arrow-right" class="w-3 h-3 text-gray-400" />
            <StatusBadge :status="entry.toStatus" />
          </div>
          <p class="text-xs text-gray-500 mt-1">
            {{ formatDateTime(entry.changedAt) }}<template v-if="entry.changedBy"> · {{ entry.changedBy }}</template>
          </p>
          <p v-if="entry.note" class="text-sm mt-1">{{ entry.note }}</p>
        </div>
      </li>
    </ol>

    <EmptyState v-else icon="i-heroicons-clock" title="No status changes yet" description="Every approve, reject, disburse or close action on this loan is logged here." />
  </UCard>
</template>

<script setup lang="ts">
import type { LoanStatusHistoryResponse } from '~/features/loans/types'

const route = useRoute()
const api = useApi()

const loanId = route.params.id as string

const { data: history } = await useAsyncData(
  `loan-${loanId}-status-history`,
  () => api<LoanStatusHistoryResponse[]>(`/loans/${loanId}/status-history`)
)
</script>
