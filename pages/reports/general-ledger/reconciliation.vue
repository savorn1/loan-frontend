<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.generalLedgerReports.reconciliation.title')"
      :description="t('accounting.generalLedgerReports.reconciliation.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.generalLedgerReportsHeader') },
        { label: t('accounting.generalLedgerReports.reconciliation.title') }
      ]"
    />

    <UCard>
      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <template v-if="data">
        <UAlert
          :color="data.matched ? 'green' : 'amber'"
          variant="subtle"
          class="mb-4"
          :icon="data.matched ? 'i-heroicons-check-circle' : 'i-heroicons-exclamation-triangle'"
          :title="
            data.matched
              ? t('accounting.generalLedgerReports.reconciliation.matched')
              : t('accounting.generalLedgerReports.reconciliation.mismatched')
          "
        />

        <dl class="grid grid-cols-2 gap-y-3 text-sm mb-4">
          <dt class="text-gray-500">
            {{ t('accounting.generalLedgerReports.reconciliation.glAccount') }}
          </dt>
          <dd class="font-semibold">{{ data.glAccountNo }}</dd>
          <dt class="text-gray-500">
            {{ t('accounting.generalLedgerReports.reconciliation.glBalance') }}
          </dt>
          <dd>{{ formatCurrency(data.glBalance) }}</dd>
          <dt class="text-gray-500">
            {{ t('accounting.generalLedgerReports.reconciliation.loanServiceTotal') }}
          </dt>
          <dd>{{ formatCurrency(data.loanServiceOutstandingTotal) }}</dd>
          <dt class="font-semibold pt-2 border-t border-gray-200 dark:border-gray-800">
            {{ t('accounting.generalLedgerReports.reconciliation.variance') }}
          </dt>
          <dd
            class="font-semibold pt-2 border-t border-gray-200 dark:border-gray-800"
            :class="data.matched ? '' : 'text-amber-600 dark:text-amber-400'"
          >
            {{ formatCurrency(data.variance) }}
          </dd>
        </dl>

        <p class="text-xs text-gray-400 dark:text-gray-500 mb-4">
          {{ t('accounting.generalLedgerReports.reconciliation.explanation') }}
        </p>
      </template>

      <UButton variant="soft" icon="i-heroicons-arrow-path" :loading="pending" @click="refresh()">
        {{ t('accounting.generalLedgerReports.reconciliation.refresh') }}
      </UButton>
    </UCard>

    <UCard class="mt-6">
      <template #header>
        <span class="font-semibold">{{
          t('accounting.generalLedgerReports.reconciliation.historyTitle')
        }}</span>
      </template>
      <UAlert
        v-if="historyError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(historyError)"
      />
      <DataTable :rows="history ?? []" :columns="historyColumns" :loading="historyPending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-clock"
            :title="t('accounting.generalLedgerReports.reconciliation.historyEmpty.title')"
            :description="
              t('accounting.generalLedgerReports.reconciliation.historyEmpty.description')
            "
          />
        </template>
      </DataTable>
    </UCard>

    <UCard class="mt-6">
      <template #header>
        <span class="font-semibold">{{
          t('accounting.generalLedgerReports.reconciliation.postingsTitle')
        }}</span>
      </template>
      <p class="text-xs text-gray-400 dark:text-gray-500 mb-4">
        {{ t('accounting.generalLedgerReports.reconciliation.postingsDescription') }}
      </p>
      <UAlert
        v-if="postingsError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(postingsError)"
      />
      <DataTable :rows="postings ?? []" :columns="postingColumns" :loading="postingsPending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-list-bullet"
            :title="t('accounting.generalLedgerReports.reconciliation.postingsEmpty.title')"
            :description="
              t('accounting.generalLedgerReports.reconciliation.postingsEmpty.description')
            "
          />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type {
  LoansReceivableReconciliationResponse,
  ReconciliationPostingResponse,
  ReconciliationSnapshotResponse
} from '~/features/accounting/types'
import type { ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

const {
  data,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData('reconciliation-loans-receivable', () =>
  api<LoansReceivableReconciliationResponse>('/reconciliation/loans-receivable')
)

const {
  data: history,
  pending: historyPending,
  error: historyError
} = await useAsyncData('reconciliation-loans-receivable-history', () =>
  api<ReconciliationSnapshotResponse[]>('/reconciliation/loans-receivable/history')
)

const {
  data: postings,
  pending: postingsPending,
  error: postingsError
} = await useAsyncData('reconciliation-loans-receivable-postings', () =>
  api<ReconciliationPostingResponse[]>('/reconciliation/loans-receivable/postings')
)

const historyColumns = computed<ColumnDef<ReconciliationSnapshotResponse>[]>(() => [
  {
    key: 'checkedAt',
    label: t('accounting.generalLedgerReports.reconciliation.columns.checkedAt'),
    type: 'datetime'
  },
  {
    key: 'glBalance',
    label: t('accounting.generalLedgerReports.reconciliation.glBalance'),
    type: 'currency'
  },
  {
    key: 'loanServiceOutstandingTotal',
    label: t('accounting.generalLedgerReports.reconciliation.loanServiceTotal'),
    type: 'currency'
  },
  {
    key: 'variance',
    label: t('accounting.generalLedgerReports.reconciliation.variance'),
    type: 'currency'
  },
  {
    key: 'matched',
    label: t('accounting.generalLedgerReports.reconciliation.columns.matched'),
    type: 'boolean',
    trueLabel: t('accounting.generalLedgerReports.reconciliation.matchedShort'),
    trueColor: 'green',
    falseLabel: t('accounting.generalLedgerReports.reconciliation.mismatchedShort'),
    falseColor: 'amber'
  }
])

const postingColumns = computed<ColumnDef<ReconciliationPostingResponse>[]>(() => [
  {
    key: 'transactionDate',
    label: t('accounting.generalLedgerReports.reconciliation.columns.date'),
    type: 'date'
  },
  { key: 'entryNo', label: t('accounting.generalLedgerReports.reconciliation.columns.entryNo') },
  {
    key: 'transactionType',
    label: t('accounting.generalLedgerReports.reconciliation.columns.transactionType'),
    type: 'enum'
  },
  {
    key: 'entrySide',
    label: t('accounting.generalLedgerReports.reconciliation.columns.side'),
    type: 'enum'
  },
  {
    key: 'amount',
    label: t('accounting.generalLedgerReports.reconciliation.columns.amount'),
    type: 'currency'
  },
  {
    key: 'referenceType',
    label: t('accounting.generalLedgerReports.reconciliation.columns.reference'),
    value: (row) => (row.referenceType ? `${row.referenceType} #${row.referenceId}` : '—')
  }
])
</script>
