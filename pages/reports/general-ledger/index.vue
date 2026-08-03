<template>
  <div>
    <UButton to="/reports" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      {{ t('admin.reports.title') }}
    </UButton>
    <PageHeader
      :title="t('accounting.generalLedgerReports.generalLedger.title')"
      :description="t('accounting.generalLedgerReports.generalLedger.description')"
    />

    <UCard class="mb-6">
      <UFormGroup
        :label="t('accounting.generalLedgerReports.generalLedger.financialPeriod')"
        class="max-w-xs"
      >
        <USelectMenu
          v-model="financialPeriodId"
          :options="periodOptions"
          option-attribute="label"
          value-attribute="value"
          :placeholder="
            t('accounting.generalLedgerReports.generalLedger.financialPeriodPlaceholder')
          "
        />
      </UFormGroup>
    </UCard>

    <UCard>
      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable :rows="rows ?? []" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-book-open"
            :title="t('accounting.generalLedgerReports.generalLedger.emptyTitlePick')"
            :description="t('accounting.generalLedgerReports.generalLedger.emptyDescriptionPick')"
          />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { FinancialPeriodResponse, GeneralLedgerSummaryRow } from '~/features/accounting/types'
import type { ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

const { data: periods } = await useAsyncData('general-ledger-report-periods', () =>
  api<FinancialPeriodResponse[]>('/financial-periods')
)
const periodOptions = computed(() =>
  (periods.value ?? []).map((p) => ({ label: p.periodName, value: p.id }))
)

const financialPeriodId = ref<number | undefined>(undefined)

const {
  data: rows,
  pending,
  error: fetchError
} = await useAsyncData(
  'general-ledger-report-summary',
  () => {
    if (!financialPeriodId.value) return Promise.resolve(null)
    return api<GeneralLedgerSummaryRow[]>('/gl-accounts/ledger-summary', {
      query: { financialPeriodId: financialPeriodId.value }
    })
  },
  { watch: [financialPeriodId] }
)

const columns = computed<ColumnDef<GeneralLedgerSummaryRow>[]>(() => [
  { key: 'accountNo', label: t('accounting.generalLedgerReports.generalLedger.columns.accountNo') },
  {
    key: 'accountName',
    label: t('accounting.generalLedgerReports.generalLedger.columns.accountName')
  },
  {
    key: 'openingBalance',
    label: t('accounting.generalLedgerReports.generalLedger.columns.opening'),
    type: 'currency'
  },
  {
    key: 'periodDebitTotal',
    label: t('accounting.generalLedgerReports.generalLedger.columns.debit'),
    type: 'currency'
  },
  {
    key: 'periodCreditTotal',
    label: t('accounting.generalLedgerReports.generalLedger.columns.credit'),
    type: 'currency'
  },
  {
    key: 'closingBalance',
    label: t('accounting.generalLedgerReports.generalLedger.columns.closing'),
    type: 'currency'
  },
  {
    key: 'actions',
    label: '',
    type: 'link',
    value: () => t('accounting.generalLedgerReports.generalLedger.viewLedger'),
    href: (row) =>
      `/general-ledger?glAccountId=${row.glAccountId}&financialPeriodId=${financialPeriodId.value}`
  }
])
</script>
