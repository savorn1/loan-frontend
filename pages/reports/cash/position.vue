<template>
  <div>
    <UButton to="/reports" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      {{ t('admin.reports.backToReports') }}
    </UButton>
    <PageHeader
      :title="t('accounting.cashReports.position.title')"
      :description="t('accounting.cashReports.position.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.cashReportsHeader') },
        { label: t('accounting.cashReports.position.title') }
      ]"
    />

    <UCard class="mb-6">
      <UFormGroup :label="t('accounting.cashReports.position.asOfDate')" class="max-w-xs">
        <DatePicker v-model="asOfDate" :max="todayIso" />
      </UFormGroup>
    </UCard>

    <UAlert
      v-if="glAccounts && !account"
      color="red"
      variant="subtle"
      class="mb-4"
      :title="t('accounting.cashReports.position.accountNotFound')"
    />

    <UAlert
      v-if="fetchError"
      color="red"
      variant="subtle"
      class="mb-4"
      :title="apiErrorMessage(fetchError)"
    />

    <UCard v-if="ledger">
      <div class="text-sm text-gray-500 dark:text-gray-400">
        {{ t('accounting.cashReports.position.cashPosition') }}
      </div>
      <div class="text-3xl font-semibold text-gray-900 dark:text-white mt-1">
        {{ formatCurrency(ledger.closingBalance) }}
      </div>

      <dl
        class="grid grid-cols-2 gap-y-3 text-sm mt-6 pt-4 border-t border-gray-200 dark:border-gray-800"
      >
        <dt class="text-gray-500">
          {{ t('accounting.cashReports.position.totalReceiptsToDate') }}
        </dt>
        <dd class="font-semibold text-right">{{ formatCurrency(ledger.periodDebitTotal) }}</dd>
        <dt class="text-gray-500">
          {{ t('accounting.cashReports.position.totalPaymentsToDate') }}
        </dt>
        <dd class="font-semibold text-right">{{ formatCurrency(ledger.periodCreditTotal) }}</dd>
      </dl>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { DateRangeLedgerResponse, GlAccountResponse } from '~/features/accounting/types'

const { t } = useI18n()
const api = useApi()

function todayIsoDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const todayIso = todayIsoDate()

const { data: glAccounts } = await useAsyncData('cash-position-gl-accounts', () =>
  api<GlAccountResponse[]>('/gl-accounts')
)
const account = computed(() => (glAccounts.value ?? []).find((a) => a.accountNo === '1010'))

const asOfDate = ref(todayIso)

const { data: ledger, error: fetchError } = await useAsyncData(
  'cash-position-ledger',
  () => {
    if (!account.value || !asOfDate.value) return Promise.resolve(null)
    // dateFrom intentionally omitted — the "position" is the cumulative balance since inception.
    return api<DateRangeLedgerResponse>(`/gl-accounts/${account.value.id}/ledger-by-date-range`, {
      query: { dateTo: asOfDate.value }
    })
  },
  { watch: [account, asOfDate] }
)
</script>
