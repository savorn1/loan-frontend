<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.productProfitabilityReports.incomeByBranch.title')"
      :description="t('accounting.productProfitabilityReports.incomeByBranch.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.productProfitabilityReportsHeader') },
        { label: t('accounting.productProfitabilityReports.incomeByBranch.title') }
      ]"
    />

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center gap-3">
          <UFormGroup
            class="w-full sm:w-auto"
            :label="t('accounting.productProfitabilityReports.incomeByBranch.dateFrom')"
          >
            <UInput v-model="dateFrom" type="date" size="sm" class="w-full sm:w-40" />
          </UFormGroup>
          <UFormGroup
            class="w-full sm:w-auto"
            :label="t('accounting.productProfitabilityReports.incomeByBranch.dateTo')"
          >
            <UInput v-model="dateTo" type="date" size="sm" class="w-full sm:w-40" />
          </UFormGroup>
        </div>
      </template>

      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable :rows="rows" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-building-office-2"
            :title="t('accounting.productProfitabilityReports.incomeByBranch.emptyTitle')"
            :description="
              t('accounting.productProfitabilityReports.incomeByBranch.emptyDescription')
            "
          />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { BranchResponse } from '~/features/branches/types'
import type { IncomeByBranchResponse, IncomeByBranchRow } from '~/features/reports/types'
import type { ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

const dateFrom = ref('')
const dateTo = ref('')

const [{ data: report, pending, error: fetchError }, { data: branches }] = await Promise.all([
  useAsyncData(
    'product-income-by-branch',
    () =>
      api<IncomeByBranchResponse>('/reports/income-by-branch', {
        query: { dateFrom: dateFrom.value || undefined, dateTo: dateTo.value || undefined }
      }),
    { watch: [dateFrom, dateTo] }
  ),
  useAsyncData('product-income-by-branch-branches', () => api<BranchResponse[]>('/branches'))
])

const branchNameById = computed(() => new Map((branches.value ?? []).map((b) => [b.id, b.name])))
const rows = computed(() => report.value?.rows ?? [])

const columns = computed<ColumnDef<IncomeByBranchRow>[]>(() => [
  {
    key: 'branchId',
    label: t('accounting.productProfitabilityReports.incomeByBranch.columns.branch'),
    value: (row) =>
      row.branchId != null ? (branchNameById.value.get(row.branchId) ?? String(row.branchId)) : '—'
  },
  {
    key: 'totalIncome',
    label: t('accounting.productProfitabilityReports.incomeByBranch.columns.totalIncome'),
    type: 'currency'
  },
  {
    key: 'totalExpense',
    label: t('accounting.productProfitabilityReports.incomeByBranch.columns.totalExpense'),
    type: 'currency'
  },
  {
    key: 'netIncome',
    label: t('accounting.productProfitabilityReports.incomeByBranch.columns.netIncome'),
    type: 'currency'
  }
])
</script>
