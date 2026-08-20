<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.financialStatements.cashFlow.title')"
      :description="t('accounting.financialStatements.cashFlow.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.financialStatementsHeader') },
        { label: t('accounting.financialStatements.cashFlow.title') }
      ]"
    />

    <UAlert
      icon="i-heroicons-information-circle"
      color="primary"
      variant="subtle"
      class="mb-6"
      :title="t('accounting.financialStatements.cashFlow.note')"
    />

    <UCard class="mb-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormGroup :label="t('accounting.financialStatements.cashFlow.cashAccount')">
          <USelectMenu
            v-model="cashAccountId"
            :options="glAccountOptions"
            option-attribute="label"
            value-attribute="value"
            :placeholder="t('accounting.financialStatements.cashFlow.cashAccountPlaceholder')"
          />
        </UFormGroup>
        <UFormGroup
          :label="t('common.dateRangeFilter.from') + ' – ' + t('common.dateRangeFilter.to')"
        >
          <DateRangeFilter v-model:from="dateFrom" v-model:to="dateTo" />
        </UFormGroup>
      </div>
    </UCard>

    <UAlert
      v-if="fetchError"
      color="red"
      variant="subtle"
      class="mb-4"
      :title="apiErrorMessage(fetchError)"
    />

    <UCard v-if="ledger" class="mb-6">
      <dl class="grid grid-cols-3 gap-y-3 text-sm">
        <dt class="text-gray-500">
          {{ t('accounting.financialStatements.cashFlow.openingBalance') }}
        </dt>
        <dd class="font-semibold col-span-2">{{ formatCurrency(ledger.openingBalance) }}</dd>
        <dt class="text-gray-500">{{ t('accounting.financialStatements.cashFlow.netChange') }}</dt>
        <dd class="font-semibold col-span-2">
          {{ formatCurrency(ledger.closingBalance - ledger.openingBalance) }}
        </dd>
        <dt class="text-gray-500">
          {{ t('accounting.financialStatements.cashFlow.closingBalance') }}
        </dt>
        <dd class="font-semibold col-span-2">{{ formatCurrency(ledger.closingBalance) }}</dd>
      </dl>
    </UCard>

    <UCard>
      <DataTable :rows="movementsByType" :columns="columns" :loading="pending" :exportable="false">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-banknotes"
            :title="
              cashAccountId
                ? t('accounting.financialStatements.cashFlow.emptyTitleNoActivity')
                : t('accounting.financialStatements.cashFlow.emptyTitlePick')
            "
            :description="
              cashAccountId
                ? t('accounting.financialStatements.cashFlow.emptyDescriptionNoActivity')
                : t('accounting.financialStatements.cashFlow.emptyDescriptionPick')
            "
          />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type {
  DateRangeLedgerResponse,
  GlAccountResponse,
  JournalEntryResponse,
  TransactionType
} from '~/features/accounting/types'
import type { ColumnDef } from '~/shared/types'

interface CashMovementRow {
  transactionType: TransactionType | 'UNKNOWN'
  amount: number
}

const { t } = useI18n()
const api = useApi()

const { data: glAccounts } = await useAsyncData('cash-flow-gl-accounts', () =>
  api<GlAccountResponse[]>('/gl-accounts')
)
const glAccountOptions = computed(() =>
  (glAccounts.value ?? []).map((a) => ({ label: `${a.accountNo} — ${a.accountName}`, value: a.id }))
)
const glAccountById = computed(() => new Map((glAccounts.value ?? []).map((a) => [a.id, a])))

const { data: entries } = await useAsyncData('cash-flow-journal-entries', () =>
  api<JournalEntryResponse[]>('/journal-entries')
)
const transactionTypeByEntryNo = computed(
  () =>
    new Map(
      (entries.value ?? [])
        .filter((e) => e.entryNo)
        .map((e) => [e.entryNo as string, e.transactionType])
    )
)

const cashAccountId = ref<number | undefined>(undefined)
const dateFrom = ref('')
const dateTo = ref('')

const {
  data: ledger,
  pending,
  error: fetchError
} = await useAsyncData(
  'cash-flow-ledger',
  () => {
    if (!cashAccountId.value) return Promise.resolve(null)
    return api<DateRangeLedgerResponse>(
      `/gl-accounts/${cashAccountId.value}/ledger-by-date-range`,
      {
        query: { dateFrom: dateFrom.value || undefined, dateTo: dateTo.value || undefined }
      }
    )
  },
  { watch: [cashAccountId, dateFrom, dateTo] }
)

const movementsByType = computed<CashMovementRow[]>(() => {
  if (!ledger.value || !cashAccountId.value) return []
  const normalBalance = glAccountById.value.get(cashAccountId.value)?.normalBalance ?? 'DEBIT'
  const totals = new Map<TransactionType | 'UNKNOWN', number>()
  for (const line of ledger.value.lines) {
    const type = transactionTypeByEntryNo.value.get(line.entryNo) ?? 'UNKNOWN'
    // A cash increase is a posting on the account's own normal-balance side.
    const signedAmount = line.entrySide === normalBalance ? line.amount : -line.amount
    totals.set(type, (totals.get(type) ?? 0) + signedAmount)
  }
  return [...totals.entries()].map(([transactionType, amount]) => ({ transactionType, amount }))
})

const columns = computed<ColumnDef<CashMovementRow>[]>(() => [
  {
    key: 'transactionType',
    label: t('accounting.financialStatements.cashFlow.columns.transactionType'),
    type: 'enum'
  },
  {
    key: 'amount',
    label: t('accounting.financialStatements.cashFlow.columns.amount'),
    type: 'currency'
  }
])
</script>
