<template>
  <div v-if="entry">
    <UButton to="/journal-entries" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      Back to journal entries
    </UButton>
    <h1 class="text-xl font-bold mb-6">Journal Entry #{{ entry.id }}</h1>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <UCard class="lg:col-span-1">
        <template #header>
          <span class="font-semibold">Details</span>
        </template>
        <dl class="grid grid-cols-2 gap-y-3 text-sm">
          <dt class="text-gray-500">Date</dt>
          <dd>{{ formatDate(entry.entryDate) }}</dd>
          <dt class="text-gray-500">Reference</dt>
          <dd>{{ entry.reference || '—' }}</dd>
          <dt class="text-gray-500">Total debit</dt>
          <dd class="font-semibold">{{ formatCurrency(entry.totalDebit) }}</dd>
          <dt class="text-gray-500">Total credit</dt>
          <dd class="font-semibold">{{ formatCurrency(entry.totalCredit) }}</dd>
          <dt class="text-gray-500">Description</dt>
          <dd class="col-span-1">{{ entry.description }}</dd>
        </dl>
      </UCard>

      <UCard class="lg:col-span-2">
        <template #header>
          <span class="font-semibold">Lines</span>
        </template>
        <DataTable :rows="entry.lines" :columns="lineColumns" />
      </UCard>
    </div>
  </div>
  <div v-else class="flex justify-center py-16">
    <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
  </div>
</template>

<script setup lang="ts">
import type { JournalEntryLineResponse, JournalEntryResponse } from '~/features/accounting/types'
import type { ColumnDef } from '~/shared/types'

const route = useRoute()
const api = useApi()

const entryId = route.params.id as string

const { data: entry } = await useAsyncData(`journal-entry-${entryId}`, () =>
  api<JournalEntryResponse>(`/accounting/journal-entries/${entryId}`)
)

const lineColumns: ColumnDef<JournalEntryLineResponse>[] = [
  { key: 'account' },
  { key: 'type', type: 'badge', color: row => (row.type === 'DEBIT' ? 'orange' : 'teal') },
  { key: 'amount', type: 'currency' }
]
</script>
