<template>
  <div v-if="entry">
    <UButton
      to="/journal-entries"
      variant="link"
      icon="i-heroicons-arrow-left"
      size="xs"
      class="mb-1 px-0"
    >
      {{ t('accounting.journalEntries.backToList') }}
    </UButton>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-bold">
        {{
          t('accounting.journalEntries.detailTitle', { entryNo: entry.entryNo ?? `#${entry.id}` })
        }}
      </h1>
      <div class="flex gap-2">
        <UButton
          v-if="entry.status === 'DRAFT'"
          icon="i-heroicons-check-circle"
          :loading="posting"
          @click="onPost"
          >{{ t('accounting.journalEntries.post') }}</UButton
        >
        <UButton
          v-if="entry.status === 'POSTED'"
          color="orange"
          variant="soft"
          icon="i-heroicons-arrow-uturn-left"
          :loading="reversing"
          @click="onReverse"
        >
          {{ t('accounting.journalEntries.reverse') }}
        </UButton>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <UCard class="lg:col-span-1">
        <template #header>
          <span class="font-semibold">{{ t('accounting.journalEntries.details.title') }}</span>
        </template>
        <dl class="grid grid-cols-2 gap-y-3 text-sm">
          <dt class="text-gray-500">{{ t('accounting.journalEntries.details.status') }}</dt>
          <dd><StatusBadge :status="entry.status" /></dd>
          <dt class="text-gray-500">
            {{ t('accounting.journalEntries.details.transactionType') }}
          </dt>
          <dd>{{ formatEnum(entry.transactionType) }}</dd>
          <dt class="text-gray-500">{{ t('accounting.journalEntries.details.date') }}</dt>
          <dd>{{ formatDate(entry.transactionDate) }}</dd>
          <dt class="text-gray-500">
            {{ t('accounting.journalEntries.details.financialPeriod') }}
          </dt>
          <dd>{{ entry.financialPeriodName }}</dd>
          <dt class="text-gray-500">{{ t('accounting.journalEntries.details.currency') }}</dt>
          <dd>{{ entry.currency }}</dd>
          <dt class="text-gray-500">{{ t('accounting.journalEntries.details.reference') }}</dt>
          <dd>
            {{
              entry.referenceType
                ? `${entry.referenceType} · ${entry.referenceId}`
                : entry.referenceId || '—'
            }}
          </dd>
          <dt class="text-gray-500">{{ t('accounting.journalEntries.details.postedAt') }}</dt>
          <dd>{{ formatDateTime(entry.postedAt) }}</dd>
          <dt class="text-gray-500">{{ t('accounting.journalEntries.details.postedBy') }}</dt>
          <dd>{{ entry.postedBy ?? '—' }}</dd>
          <dt class="text-gray-500">{{ t('accounting.journalEntries.details.description') }}</dt>
          <dd class="col-span-1">{{ entry.description || '—' }}</dd>
        </dl>
      </UCard>

      <UCard class="lg:col-span-2">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-semibold">{{ t('accounting.journalEntries.linesCard.title') }}</span>
            <span class="text-xs text-gray-500">{{
              t('accounting.journalEntries.linesCard.debitsCredits', {
                debit: formatCurrency(totalDebit),
                credit: formatCurrency(totalCredit)
              })
            }}</span>
          </div>
        </template>
        <DataTable
          :rows="entry.lines"
          :columns="lineColumns"
          export-filename="journal-entry-lines.csv"
        />
      </UCard>
    </div>

    <UCard class="mt-6">
      <template #header>
        <span class="font-semibold">{{ t('accounting.journalEntries.auditLog.title') }}</span>
      </template>
      <DataTable
        :rows="auditLogs ?? []"
        :columns="auditColumns"
        export-filename="journal-entry-audit-log.csv"
      />
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
  JournalAuditLogResponse,
  JournalEntryLineResponse,
  JournalEntryResponse
} from '~/features/accounting/types'
import type { ColumnDef } from '~/shared/types'

const { t } = useI18n()
const route = useRoute()
const api = useApi()
const toast = useToast()

const entryId = route.params.id as string

const {
  data: entry,
  error,
  pending,
  refresh
} = await useAsyncData(`journal-entry-${entryId}`, () =>
  api<JournalEntryResponse>(`/journal-entries/${entryId}`)
)
const { data: auditLogs, refresh: refreshAuditLogs } = await useAsyncData(
  `journal-entry-${entryId}-audit-logs`,
  () => api<JournalAuditLogResponse[]>(`/journal-entries/${entryId}/audit-logs`)
)

const lineColumns = computed<ColumnDef<JournalEntryLineResponse>[]>(() => [
  { key: 'glAccountNo', label: t('accounting.journalEntries.columns.account') },
  {
    key: 'entrySide',
    label: t('accounting.journalEntries.columns.side'),
    type: 'badge',
    color: (row) => (row.entrySide === 'DEBIT' ? 'orange' : 'teal')
  },
  { key: 'amount', label: t('accounting.journalEntries.columns.amount'), type: 'currency' },
  { key: 'description', label: t('accounting.journalEntries.columns.description') }
])

const auditColumns = computed<ColumnDef<JournalAuditLogResponse>[]>(() => [
  {
    key: 'performedAt',
    label: t('accounting.journalEntries.auditLog.when'),
    type: 'datetime',
    sortable: true
  },
  { key: 'action', label: t('accounting.journalEntries.auditLog.action'), type: 'enum' },
  { key: 'performedBy', label: t('accounting.journalEntries.auditLog.by') },
  { key: 'details', label: t('accounting.journalEntries.auditLog.details') }
])

const totalDebit = computed(() =>
  (entry.value?.lines ?? [])
    .filter((l) => l.entrySide === 'DEBIT')
    .reduce((sum, l) => sum + l.amount, 0)
)
const totalCredit = computed(() =>
  (entry.value?.lines ?? [])
    .filter((l) => l.entrySide === 'CREDIT')
    .reduce((sum, l) => sum + l.amount, 0)
)

const posting = ref(false)
async function onPost() {
  posting.value = true
  try {
    await api(`/journal-entries/${entryId}/post`, { method: 'POST' })
    toast.add({ title: t('accounting.journalEntries.entryPosted'), color: 'green' })
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
    const reversal = await api<JournalEntryResponse>(`/journal-entries/${entryId}/reverse`, {
      method: 'POST'
    })
    toast.add({ title: t('accounting.journalEntries.entryReversed'), color: 'green' })
    await navigateTo(`/journal-entries/${reversal.id}`)
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    reversing.value = false
  }
}
</script>
