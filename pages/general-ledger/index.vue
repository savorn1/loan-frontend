<template>
  <div>
    <PageHeader
      :title="t('accounting.generalLedger.title')"
      :description="t('accounting.generalLedger.description')"
    />

    <UCard class="mb-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormGroup :label="t('accounting.generalLedger.glAccount')">
          <USelectMenu
            v-model="glAccountId"
            :options="glAccountOptions"
            option-attribute="label"
            value-attribute="value"
            :placeholder="t('accounting.generalLedger.glAccountPlaceholder')"
          />
        </UFormGroup>
        <UFormGroup :label="t('accounting.generalLedger.financialPeriod')">
          <USelectMenu
            v-model="financialPeriodId"
            :options="periodOptions"
            option-attribute="label"
            value-attribute="value"
            :placeholder="t('accounting.generalLedger.financialPeriodPlaceholder')"
          />
        </UFormGroup>
      </div>
    </UCard>

    <UCard v-if="ledger" class="mb-6">
      <dl class="grid grid-cols-2 sm:grid-cols-4 gap-y-3 text-sm">
        <dt class="text-gray-500">{{ t('accounting.generalLedger.openingBalance') }}</dt>
        <dd class="font-semibold">{{ formatCurrency(ledger.openingBalance) }}</dd>
        <dt class="text-gray-500">{{ t('accounting.generalLedger.periodDebit') }}</dt>
        <dd>{{ formatCurrency(ledger.periodDebitTotal) }}</dd>
        <dt class="text-gray-500">{{ t('accounting.generalLedger.periodCredit') }}</dt>
        <dd>{{ formatCurrency(ledger.periodCreditTotal) }}</dd>
        <dt class="text-gray-500">{{ t('accounting.generalLedger.closingBalance') }}</dt>
        <dd class="font-semibold">{{ formatCurrency(ledger.closingBalance) }}</dd>
      </dl>
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
            icon="i-heroicons-book-open"
            :title="
              glAccountId && financialPeriodId
                ? t('accounting.generalLedger.emptyTitleNoActivity')
                : t('accounting.generalLedger.emptyTitlePick')
            "
            :description="
              glAccountId && financialPeriodId
                ? t('accounting.generalLedger.emptyDescriptionNoActivity')
                : t('accounting.generalLedger.emptyDescriptionPick')
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

const { t } = useI18n()
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

// Pre-filled when arriving from the General Ledger overview report's "View ledger" link.
const route = useRoute()
const glAccountId = ref<number | undefined>(
  route.query.glAccountId ? Number(route.query.glAccountId) : undefined
)
const financialPeriodId = ref<number | undefined>(
  route.query.financialPeriodId ? Number(route.query.financialPeriodId) : undefined
)

const {
  data: ledger,
  pending,
  error: fetchError
} = await useAsyncData(
  'general-ledger-balance',
  () => {
    if (!glAccountId.value || !financialPeriodId.value) return Promise.resolve(null)
    return api<GeneralLedgerResponse>(
      `/gl-accounts/${glAccountId.value}/ledger?financialPeriodId=${financialPeriodId.value}`
    )
  },
  { watch: [glAccountId, financialPeriodId] }
)

const columns = computed<ColumnDef<LedgerLineResponse>[]>(() => [
  { key: 'transactionDate', label: t('accounting.generalLedger.columns.date'), type: 'date' },
  { key: 'entryNo', label: t('accounting.generalLedger.columns.entryNo') },
  { key: 'description', label: t('accounting.generalLedger.columns.description') },
  {
    key: 'entrySide',
    label: t('accounting.generalLedger.columns.side'),
    type: 'badge',
    color: (row) => (row.entrySide === 'DEBIT' ? 'orange' : 'teal')
  },
  { key: 'amount', label: t('accounting.generalLedger.columns.amount'), type: 'currency' },
  { key: 'runningBalance', label: t('accounting.generalLedger.columns.balance'), type: 'currency' }
])
</script>
