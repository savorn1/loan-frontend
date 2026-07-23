<template>
  <div v-if="entry">
    <UButton to="/journal-entries" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      Back to journal entries
    </UButton>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-bold">Journal Entry {{ entry.entryNo ?? `#${entry.id}` }}</h1>
      <div class="flex gap-2">
        <UButton v-if="entry.status === 'DRAFT'" icon="i-heroicons-check-circle" :loading="posting" @click="onPost">Post</UButton>
        <UButton v-if="entry.status === 'POSTED'" color="orange" variant="soft" icon="i-heroicons-arrow-uturn-left" :loading="reversing" @click="onReverse">
          Reverse
        </UButton>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <UCard class="lg:col-span-1">
        <template #header>
          <span class="font-semibold">Details</span>
        </template>
        <dl class="grid grid-cols-2 gap-y-3 text-sm">
          <dt class="text-gray-500">Status</dt>
          <dd><StatusBadge :status="entry.status" /></dd>
          <dt class="text-gray-500">Transaction type</dt>
          <dd>{{ formatEnum(entry.transactionType) }}</dd>
          <dt class="text-gray-500">Date</dt>
          <dd>{{ formatDate(entry.transactionDate) }}</dd>
          <dt class="text-gray-500">Financial period</dt>
          <dd>{{ entry.financialPeriodName }}</dd>
          <dt class="text-gray-500">Currency</dt>
          <dd>{{ entry.currency }}</dd>
          <dt class="text-gray-500">Reference</dt>
          <dd>{{ entry.referenceType ? `${entry.referenceType} · ${entry.referenceId}` : (entry.referenceId || '—') }}</dd>
          <dt class="text-gray-500">Posted at</dt>
          <dd>{{ formatDateTime(entry.postedAt) }}</dd>
          <dt class="text-gray-500">Posted by</dt>
          <dd>{{ entry.postedBy ?? '—' }}</dd>
          <dt class="text-gray-500">Description</dt>
          <dd class="col-span-1">{{ entry.description || '—' }}</dd>
        </dl>
      </UCard>

      <UCard class="lg:col-span-2">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-semibold">Lines</span>
            <span class="text-xs text-gray-500">Debits {{ formatCurrency(totalDebit) }} · Credits {{ formatCurrency(totalCredit) }}</span>
          </div>
        </template>
        <DataTable :rows="entry.lines" :columns="lineColumns" />
      </UCard>
    </div>

    <UCard class="mt-6">
      <template #header>
        <span class="font-semibold">Audit log</span>
      </template>
      <DataTable :rows="auditLogs ?? []" :columns="auditColumns" />
    </UCard>
  </div>
  <div v-else class="flex justify-center py-16">
    <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
  </div>
</template>

<script setup lang="ts">
import type { JournalAuditLogResponse, JournalEntryLineResponse, JournalEntryResponse } from '~/features/accounting/types'
import type { ColumnDef } from '~/shared/types'

const route = useRoute()
const api = useApi()
const toast = useToast()

const entryId = route.params.id as string

const { data: entry, refresh } = await useAsyncData(`journal-entry-${entryId}`, () =>
  api<JournalEntryResponse>(`/journal-entries/${entryId}`)
)
const { data: auditLogs, refresh: refreshAuditLogs } = await useAsyncData(`journal-entry-${entryId}-audit-logs`, () =>
  api<JournalAuditLogResponse[]>(`/journal-entries/${entryId}/audit-logs`)
)

const lineColumns: ColumnDef<JournalEntryLineResponse>[] = [
  { key: 'glAccountNo', label: 'Account' },
  { key: 'entrySide', label: 'Side', type: 'badge', color: row => (row.entrySide === 'DEBIT' ? 'orange' : 'teal') },
  { key: 'amount', type: 'currency' },
  { key: 'description' }
]

const auditColumns: ColumnDef<JournalAuditLogResponse>[] = [
  { key: 'performedAt', label: 'When', type: 'datetime', sortable: true },
  { key: 'action', type: 'enum' },
  { key: 'performedBy', label: 'By' },
  { key: 'details' }
]

const totalDebit = computed(() => (entry.value?.lines ?? []).filter(l => l.entrySide === 'DEBIT').reduce((sum, l) => sum + l.amount, 0))
const totalCredit = computed(() => (entry.value?.lines ?? []).filter(l => l.entrySide === 'CREDIT').reduce((sum, l) => sum + l.amount, 0))

const posting = ref(false)
async function onPost() {
  posting.value = true
  try {
    await api(`/journal-entries/${entryId}/post`, { method: 'POST' })
    toast.add({ title: 'Journal entry posted', color: 'green' })
    await Promise.all([refresh(), refreshAuditLogs()])
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    posting.value = false
  }
}

const reversing = ref(false)
async function onReverse() {
  reversing.value = true
  try {
    const reversal = await api<JournalEntryResponse>(`/journal-entries/${entryId}/reverse`, { method: 'POST' })
    toast.add({ title: 'Journal entry reversed', color: 'green' })
    await navigateTo(`/journal-entries/${reversal.id}`)
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    reversing.value = false
  }
}
</script>
