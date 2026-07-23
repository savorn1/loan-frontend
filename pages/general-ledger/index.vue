<template>
  <div>
    <PageHeader
      title="General Ledger"
      description="Balances and posted activity for a single GL account within a financial period."
    />

    <UCard class="mb-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormGroup label="GL account">
          <USelectMenu
            v-model="glAccountId"
            :options="glAccountOptions"
            option-attribute="label"
            value-attribute="value"
            placeholder="Select an account"
          />
        </UFormGroup>
        <UFormGroup label="Financial period">
          <USelectMenu
            v-model="financialPeriodId"
            :options="periodOptions"
            option-attribute="label"
            value-attribute="value"
            placeholder="Select a period"
          />
        </UFormGroup>
      </div>
    </UCard>

    <UCard v-if="ledger" class="mb-6">
      <dl class="grid grid-cols-2 sm:grid-cols-4 gap-y-3 text-sm">
        <dt class="text-gray-500">Opening balance</dt>
        <dd class="font-semibold">{{ formatCurrency(ledger.openingBalance) }}</dd>
        <dt class="text-gray-500">Period debit</dt>
        <dd>{{ formatCurrency(ledger.periodDebitTotal) }}</dd>
        <dt class="text-gray-500">Period credit</dt>
        <dd>{{ formatCurrency(ledger.periodCreditTotal) }}</dd>
        <dt class="text-gray-500">Closing balance</dt>
        <dd class="font-semibold">{{ formatCurrency(ledger.closingBalance) }}</dd>
      </dl>
    </UCard>

    <UCard>
      <DataTable :rows="ledger?.lines ?? []" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-book-open"
            :title="
              glAccountId && financialPeriodId ? 'No posted activity' : 'Pick an account and period'
            "
            :description="
              glAccountId && financialPeriodId
                ? 'This account has no posted journal entries in the selected period.'
                : 'Select a GL account and a financial period above to view its ledger.'
            "
          />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type {
  GlAccountResponse,
  FinancialPeriodResponse,
  GeneralLedgerResponse,
  LedgerLineResponse
} from '~/features/accounting/types'
import type { ColumnDef } from '~/shared/types'

const api = useApi()

const { data: glAccounts } = await useAsyncData('general-ledger-gl-accounts', () =>
  api<GlAccountResponse[]>('/gl-accounts')
)
const { data: periods } = await useAsyncData('general-ledger-periods', () =>
  api<FinancialPeriodResponse[]>('/financial-periods')
)

const glAccountOptions = computed(() =>
  (glAccounts.value ?? []).map((a) => ({ label: `${a.accountNo} — ${a.accountName}`, value: a.id }))
)
const periodOptions = computed(() =>
  (periods.value ?? []).map((p) => ({ label: p.periodName, value: p.id }))
)

const glAccountId = ref<number | undefined>(undefined)
const financialPeriodId = ref<number | undefined>(undefined)

const { data: ledger, pending } = await useAsyncData(
  'general-ledger-balance',
  () => {
    if (!glAccountId.value || !financialPeriodId.value) return Promise.resolve(null)
    return api<GeneralLedgerResponse>(
      `/gl-accounts/${glAccountId.value}/ledger?financialPeriodId=${financialPeriodId.value}`
    )
  },
  { watch: [glAccountId, financialPeriodId] }
)

const columns: ColumnDef<LedgerLineResponse>[] = [
  { key: 'transactionDate', label: 'Date', type: 'date' },
  { key: 'entryNo', label: 'Entry no.' },
  { key: 'description' },
  {
    key: 'entrySide',
    label: 'Side',
    type: 'badge',
    color: (row) => (row.entrySide === 'DEBIT' ? 'orange' : 'teal')
  },
  { key: 'amount', type: 'currency' },
  { key: 'runningBalance', label: 'Balance', type: 'currency' }
]
</script>
