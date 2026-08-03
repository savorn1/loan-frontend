<template>
  <div>
    <UButton to="/reports" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      {{ t('admin.reports.title') }}
    </UButton>
    <PageHeader
      :title="t('accounting.loanAccountingReports.loansReceivable.title')"
      :description="t('accounting.loanAccountingReports.loansReceivable.description')"
    />

    <UCard class="mb-6">
      <UFormGroup
        :label="t('accounting.loanAccountingReports.loansReceivable.financialPeriod')"
        class="max-w-xs"
      >
        <USelectMenu
          v-model="financialPeriodId"
          :options="periodOptions"
          option-attribute="label"
          value-attribute="value"
          :placeholder="
            t('accounting.loanAccountingReports.loansReceivable.financialPeriodPlaceholder')
          "
        />
      </UFormGroup>
    </UCard>

    <UAlert
      v-if="glAccounts && !account"
      color="red"
      variant="subtle"
      class="mb-4"
      :title="t('accounting.loanAccountingReports.loansReceivable.accountNotFound')"
    />

    <UCard v-if="ledger" class="mb-6">
      <dl class="grid grid-cols-2 sm:grid-cols-4 gap-y-3 text-sm">
        <dt class="text-gray-500">
          {{ t('accounting.loanAccountingReports.loansReceivable.openingBalance') }}
        </dt>
        <dd class="font-semibold">{{ formatCurrency(ledger.openingBalance) }}</dd>
        <dt class="text-gray-500">
          {{ t('accounting.loanAccountingReports.loansReceivable.periodDebit') }}
        </dt>
        <dd>{{ formatCurrency(ledger.periodDebitTotal) }}</dd>
        <dt class="text-gray-500">
          {{ t('accounting.loanAccountingReports.loansReceivable.periodCredit') }}
        </dt>
        <dd>{{ formatCurrency(ledger.periodCreditTotal) }}</dd>
        <dt class="text-gray-500">
          {{ t('accounting.loanAccountingReports.loansReceivable.closingBalance') }}
        </dt>
        <dd class="font-semibold">{{ formatCurrency(ledger.closingBalance) }}</dd>
      </dl>
      <p class="text-xs text-gray-500 mt-3">
        {{ t('accounting.loanAccountingReports.loansReceivable.note') }}
      </p>
    </UCard>

    <UCard>
      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable :rows="ledger?.lines ?? []" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-banknotes"
            :title="
              financialPeriodId
                ? t('accounting.loanAccountingReports.loansReceivable.emptyTitleNoActivity')
                : t('accounting.loanAccountingReports.loansReceivable.emptyTitlePick')
            "
            :description="
              financialPeriodId
                ? t('accounting.loanAccountingReports.loansReceivable.emptyDescriptionNoActivity')
                : t('accounting.loanAccountingReports.loansReceivable.emptyDescriptionPick')
            "
          />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type {
  FinancialPeriodResponse,
  GeneralLedgerResponse,
  GlAccountResponse,
  LedgerLineResponse
} from '~/features/accounting/types'
import type { ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

const { data: periods } = await useAsyncData('loans-receivable-periods', () =>
  api<FinancialPeriodResponse[]>('/financial-periods')
)
const periodOptions = computed(() =>
  (periods.value ?? []).map((p) => ({ label: p.periodName, value: p.id }))
)

const { data: glAccounts } = await useAsyncData('loans-receivable-gl-accounts', () =>
  api<GlAccountResponse[]>('/gl-accounts')
)
const account = computed(() => (glAccounts.value ?? []).find((a) => a.accountNo === '1100'))

const financialPeriodId = ref<number | undefined>(undefined)

const {
  data: ledger,
  pending,
  error: fetchError
} = await useAsyncData(
  'loans-receivable-ledger',
  () => {
    if (!account.value || !financialPeriodId.value) return Promise.resolve(null)
    return api<GeneralLedgerResponse>(`/gl-accounts/${account.value.id}/ledger`, {
      query: { financialPeriodId: financialPeriodId.value }
    })
  },
  { watch: [account, financialPeriodId] }
)

const columns = computed<ColumnDef<LedgerLineResponse>[]>(() => [
  {
    key: 'transactionDate',
    label: t('accounting.loanAccountingReports.loansReceivable.columns.date'),
    type: 'date'
  },
  { key: 'entryNo', label: t('accounting.loanAccountingReports.loansReceivable.columns.entryNo') },
  {
    key: 'description',
    label: t('accounting.loanAccountingReports.loansReceivable.columns.description')
  },
  {
    key: 'entrySide',
    label: t('accounting.loanAccountingReports.loansReceivable.columns.side'),
    type: 'badge',
    color: (row) => (row.entrySide === 'DEBIT' ? 'orange' : 'teal')
  },
  {
    key: 'amount',
    label: t('accounting.loanAccountingReports.loansReceivable.columns.amount'),
    type: 'currency'
  },
  {
    key: 'runningBalance',
    label: t('accounting.loanAccountingReports.loansReceivable.columns.balance'),
    type: 'currency'
  }
])
</script>
