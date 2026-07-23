<template>
  <div>
    <PageHeader title="Trial Balance" description="Posted debit/credit totals per GL account for a financial period." />

    <UCard class="mb-6">
      <UFormGroup label="Financial period" class="max-w-xs">
        <USelectMenu
          v-model="financialPeriodId"
          :options="periodOptions"
          option-attribute="label"
          value-attribute="value"
          placeholder="Select a period"
        />
      </UFormGroup>
    </UCard>

    <UCard class="mb-6">
      <template #header>
        <span class="font-semibold">Live report</span>
      </template>
      <DataTable :rows="rows ?? []" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-scale"
            :title="financialPeriodId ? 'No posted activity' : 'Pick a financial period'"
            :description="financialPeriodId ? 'No accounts have posted journal entries in the selected period.' : 'Select a financial period above to view its trial balance.'"
          />
        </template>
      </DataTable>

      <div v-if="rows?.length" class="flex justify-end gap-6 pt-4 px-2 text-sm font-semibold border-t border-gray-200 dark:border-gray-800 mt-2">
        <span>Total debit: {{ formatCurrency(totalDebit) }}</span>
        <span>Total credit: {{ formatCurrency(totalCredit) }}</span>
        <span :class="isBalanced ? 'text-teal-600 dark:text-teal-400' : 'text-red-500'">
          {{ isBalanced ? 'Balanced' : 'Out of balance' }}
        </span>
      </div>
      <p class="text-xs text-gray-500 mt-3">This period's activity only — no carryforward from prior periods. Generate a snapshot below for the cumulative, ending-balance view.</p>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">Snapshots</span>
          <UButton
            size="xs"
            icon="i-heroicons-camera"
            :loading="generating"
            :disabled="!financialPeriodId"
            @click="onGenerate"
          >
            Generate snapshot
          </UButton>
        </div>
      </template>
      <DataTable :rows="snapshots ?? []" :columns="snapshotColumns" :loading="snapshotsPending" @select="(row: TrialBalanceResponse) => router.push(`/trial-balance/snapshots/${row.id}`)">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-camera"
            :title="financialPeriodId ? 'No snapshots yet' : 'Pick a financial period'"
            :description="financialPeriodId ? 'Generate a snapshot to freeze this period for audit purposes.' : 'Select a financial period above to see its snapshots.'"
          />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { FinancialPeriodResponse, TrialBalanceResponse, TrialBalanceRowResponse } from '~/features/accounting/types'
import type { ColumnDef } from '~/shared/types'

const api = useApi()
const toast = useToast()
const router = useRouter()

const { data: periods } = await useAsyncData('trial-balance-periods', () => api<FinancialPeriodResponse[]>('/financial-periods'))
const periodOptions = computed(() => (periods.value ?? []).map(p => ({ label: p.periodName, value: p.id })))

const financialPeriodId = ref<number | undefined>(undefined)

const { data: rows, pending } = await useAsyncData(
  'trial-balance-rows',
  () => {
    if (!financialPeriodId.value) return Promise.resolve([])
    return api<TrialBalanceRowResponse[]>(`/trial-balance?financialPeriodId=${financialPeriodId.value}`)
  },
  { watch: [financialPeriodId] }
)

const columns: ColumnDef<TrialBalanceRowResponse>[] = [
  { key: 'accountNo', label: 'Account no.', sortable: true },
  { key: 'accountName', label: 'Account name', sortable: true },
  { key: 'totalDebit', label: 'Debit', type: 'currency', sortable: true },
  { key: 'totalCredit', label: 'Credit', type: 'currency', sortable: true },
  { key: 'balance', type: 'currency', sortable: true }
]

const totalDebit = computed(() => (rows.value ?? []).reduce((sum, r) => sum + r.totalDebit, 0))
const totalCredit = computed(() => (rows.value ?? []).reduce((sum, r) => sum + r.totalCredit, 0))
const isBalanced = computed(() => Math.abs(totalDebit.value - totalCredit.value) < 0.005)

const { data: snapshots, pending: snapshotsPending, refresh: refreshSnapshots } = await useAsyncData(
  'trial-balance-snapshots',
  () => {
    if (!financialPeriodId.value) return Promise.resolve([])
    return api<TrialBalanceResponse[]>(`/trial-balance/snapshots?financialPeriodId=${financialPeriodId.value}`)
  },
  { watch: [financialPeriodId] }
)

const snapshotColumns: ColumnDef<TrialBalanceResponse>[] = [
  { key: 'generatedAt', label: 'Generated', type: 'datetime', sortable: true },
  { key: 'generatedBy', label: 'By' },
  { key: 'totalDebit', label: 'Total debit', type: 'currency' },
  { key: 'totalCredit', label: 'Total credit', type: 'currency' }
]

const generating = ref(false)
async function onGenerate() {
  if (!financialPeriodId.value) return
  generating.value = true
  try {
    await api(`/trial-balance/snapshots?financialPeriodId=${financialPeriodId.value}`, { method: 'POST' })
    toast.add({ title: 'Trial balance snapshot generated', color: 'green' })
    await refreshSnapshots()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    generating.value = false
  }
}
</script>
