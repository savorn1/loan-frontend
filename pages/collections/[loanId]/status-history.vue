<template>
  <UCard>
    <template #header>
      <span class="font-semibold">{{ t('collections.statusHistory.title') }}</span>
    </template>

    <UAlert
      v-if="fetchError"
      color="red"
      variant="subtle"
      class="mb-4"
      :title="apiErrorMessage(fetchError)"
    />

    <ol v-if="(history ?? []).length" class="space-y-4">
      <li v-for="entry in history" :key="entry.id" class="flex items-start gap-3">
        <div class="flex flex-col items-center pt-0.5">
          <UIcon name="i-heroicons-clock" class="w-4 h-4 text-gray-400" />
          <div class="w-px flex-1 bg-gray-200 dark:bg-gray-800 mt-1" />
        </div>
        <div class="pb-1">
          <div class="flex items-center gap-2 text-sm">
            <StatusBadge v-if="entry.fromStatus" :status="entry.fromStatus" />
            <UIcon
              v-if="entry.fromStatus"
              name="i-heroicons-arrow-right"
              class="w-3 h-3 text-gray-400"
            />
            <StatusBadge :status="entry.toStatus" />
          </div>
          <p class="text-xs text-gray-500 mt-1">
            {{ formatDateTime(entry.changedAt) }} · {{ entry.changedBy }}
          </p>
          <p v-if="entry.note" class="text-sm mt-1">{{ entry.note }}</p>
        </div>
      </li>
    </ol>

    <EmptyState
      v-else
      icon="i-heroicons-clock"
      :title="t('collections.statusHistory.empty.title')"
      :description="t('collections.statusHistory.empty.description')"
    />
  </UCard>
</template>

<script setup lang="ts">
import type { CollectionStatusHistoryResponse } from '~/features/collections/types'

const route = useRoute()
const api = useApi()
const { t } = useI18n()

const loanId = route.params.loanId as string

const { data: history, error: fetchError } = await useAsyncData(
  `collection-case-${loanId}-status-history`,
  () => api<CollectionStatusHistoryResponse[]>(`/payments/collections/${loanId}/status-history`)
)
</script>
