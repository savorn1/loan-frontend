<template>
  <div>
    <UButton to="/reports" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      {{ t('admin.reports.backToReports') }}
    </UButton>
    <PageHeader
      :title="t('accounting.productProfitabilityReports.budgetVsActual.title')"
      :description="t('accounting.productProfitabilityReports.budgetVsActual.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.productProfitabilityReportsHeader') },
        { label: t('accounting.productProfitabilityReports.budgetVsActual.title') }
      ]"
    />

    <UCard class="mb-6">
      <UFormGroup
        :label="t('accounting.productProfitabilityReports.budgetVsActual.financialPeriod')"
        class="max-w-xs w-full sm:w-auto"
      >
        <USelectMenu
          v-model="financialPeriodId"
          :options="periodOptions"
          option-attribute="label"
          value-attribute="value"
          :placeholder="
            t('accounting.productProfitabilityReports.budgetVsActual.financialPeriodPlaceholder')
          "
        />
      </UFormGroup>
    </UCard>

    <UCard class="mb-6">
      <template #header>
        <span class="font-semibold">{{
          t('accounting.productProfitabilityReports.budgetVsActual.manageHeader')
        }}</span>
      </template>

      <div class="flex flex-wrap items-end gap-3 mb-4">
        <UFormGroup
          class="w-full sm:w-auto"
          :label="t('accounting.productProfitabilityReports.budgetVsActual.glAccount')"
        >
          <USelectMenu
            v-model="newGlAccountId"
            :options="glAccountOptions"
            option-attribute="label"
            value-attribute="value"
            size="sm"
            class="w-full sm:w-64"
            :placeholder="
              t('accounting.productProfitabilityReports.budgetVsActual.glAccountPlaceholder')
            "
          />
        </UFormGroup>
        <UFormGroup
          class="w-full sm:w-auto"
          :label="t('accounting.productProfitabilityReports.budgetVsActual.budgetAmount')"
        >
          <UInput v-model.number="newBudgetAmount" type="number" size="sm" class="w-full sm:w-40" />
        </UFormGroup>
        <UButton
          size="sm"
          icon="i-heroicons-plus"
          :disabled="!financialPeriodId || !newGlAccountId || !newBudgetAmount"
          :loading="adding"
          @click="onAdd"
        >
          {{ t('accounting.productProfitabilityReports.budgetVsActual.addLine') }}
        </UButton>
      </div>

      <DataTable
        :rows="budgetLines ?? []"
        :columns="budgetLineColumns"
        :loading="linesPending"
        :exportable="false"
      >
        <template #actions-data="{ row }">
          <UButton
            size="xs"
            variant="soft"
            color="red"
            icon="i-heroicons-trash"
            :loading="deletingId === row.id"
            @click="onDelete(row)"
          >
            {{ t('common.delete') }}
          </UButton>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-banknotes"
            :title="
              financialPeriodId
                ? t('accounting.productProfitabilityReports.budgetVsActual.linesEmptyTitle')
                : t('accounting.productProfitabilityReports.budgetVsActual.linesEmptyTitlePick')
            "
          />
        </template>
      </DataTable>
    </UCard>

    <UCard>
      <template #header>
        <span class="font-semibold">{{
          t('accounting.productProfitabilityReports.budgetVsActual.reportHeader')
        }}</span>
      </template>

      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable
        :rows="report ?? []"
        :columns="reportColumns"
        :loading="reportPending"
        export-filename="budget-vs-actual.csv"
      >
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-chart-bar"
            :title="
              financialPeriodId
                ? t('accounting.productProfitabilityReports.budgetVsActual.reportEmptyTitle')
                : t('accounting.productProfitabilityReports.budgetVsActual.reportEmptyTitlePick')
            "
          />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { FinancialPeriodResponse, GlAccountResponse } from '~/features/accounting/types'
import type {
  BudgetLineRequest,
  BudgetLineResponse,
  BudgetVsActualRow
} from '~/features/reports/types'
import type { ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()
const toast = useToast()

const { data: periods } = await useAsyncData('budget-periods', () =>
  api<FinancialPeriodResponse[]>('/financial-periods')
)
const periodOptions = computed(() =>
  (periods.value ?? []).map((p) => ({ label: p.periodName, value: p.id }))
)

const { data: glAccounts } = await useAsyncData('budget-gl-accounts', () =>
  api<GlAccountResponse[]>('/gl-accounts')
)
const glAccountOptions = computed(() =>
  (glAccounts.value ?? [])
    .filter((a) => a.allowPosting)
    .map((a) => ({ label: `${a.accountNo} — ${a.accountName}`, value: a.id }))
)

const financialPeriodId = ref<number | undefined>(undefined)
const newGlAccountId = ref<number | undefined>(undefined)
const newBudgetAmount = ref<number | undefined>(undefined)

const {
  data: budgetLines,
  pending: linesPending,
  refresh: refreshLines
} = await useAsyncData(
  'budget-lines',
  () => {
    if (!financialPeriodId.value) return Promise.resolve([])
    return api<BudgetLineResponse[]>('/budgets', {
      query: { financialPeriodId: financialPeriodId.value }
    })
  },
  { watch: [financialPeriodId] }
)

const {
  data: report,
  pending: reportPending,
  error: fetchError,
  refresh: refreshReport
} = await useAsyncData(
  'budget-vs-actual-report',
  () => {
    if (!financialPeriodId.value) return Promise.resolve([])
    return api<BudgetVsActualRow[]>('/reports/budget-vs-actual', {
      query: { financialPeriodId: financialPeriodId.value }
    })
  },
  { watch: [financialPeriodId] }
)

const adding = ref(false)
async function onAdd() {
  if (!financialPeriodId.value || !newGlAccountId.value || !newBudgetAmount.value) return
  adding.value = true
  try {
    const payload: BudgetLineRequest = {
      financialPeriodId: financialPeriodId.value,
      glAccountId: newGlAccountId.value,
      budgetAmount: newBudgetAmount.value
    }
    await api('/budgets', { method: 'POST', body: payload })
    toast.add({
      title: t('accounting.productProfitabilityReports.budgetVsActual.lineAdded'),
      color: 'green'
    })
    newGlAccountId.value = undefined
    newBudgetAmount.value = undefined
    await Promise.all([refreshLines(), refreshReport()])
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    adding.value = false
  }
}

const deletingId = ref<number | null>(null)
async function onDelete(row: BudgetLineResponse) {
  deletingId.value = row.id
  try {
    await api(`/budgets/${row.id}`, { method: 'DELETE' })
    toast.add({
      title: t('accounting.productProfitabilityReports.budgetVsActual.lineDeleted'),
      color: 'green'
    })
    await Promise.all([refreshLines(), refreshReport()])
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    deletingId.value = null
  }
}

const budgetLineColumns = computed<ColumnDef<BudgetLineResponse>[]>(() => [
  {
    key: 'accountNo',
    label: t('accounting.productProfitabilityReports.budgetVsActual.columns.accountNo')
  },
  {
    key: 'accountName',
    label: t('accounting.productProfitabilityReports.budgetVsActual.columns.accountName')
  },
  {
    key: 'budgetAmount',
    label: t('accounting.productProfitabilityReports.budgetVsActual.columns.budgetAmount'),
    type: 'currency'
  },
  { key: 'actions', label: '' }
])

const reportColumns = computed<ColumnDef<BudgetVsActualRow>[]>(() => [
  {
    key: 'accountNo',
    label: t('accounting.productProfitabilityReports.budgetVsActual.columns.accountNo')
  },
  {
    key: 'accountName',
    label: t('accounting.productProfitabilityReports.budgetVsActual.columns.accountName')
  },
  {
    key: 'budgetAmount',
    label: t('accounting.productProfitabilityReports.budgetVsActual.columns.budgetAmount'),
    type: 'currency'
  },
  {
    key: 'actualAmount',
    label: t('accounting.productProfitabilityReports.budgetVsActual.columns.actualAmount'),
    type: 'currency'
  },
  {
    key: 'variance',
    label: t('accounting.productProfitabilityReports.budgetVsActual.columns.variance'),
    type: 'currency'
  },
  {
    key: 'variancePercent',
    label: t('accounting.productProfitabilityReports.budgetVsActual.columns.variancePercent'),
    type: 'percent'
  }
])
</script>
