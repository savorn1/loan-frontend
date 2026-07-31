<template>
  <div>
    <PageHeader
      :title="t('accounting.trialBalance.title')"
      :description="t('accounting.trialBalance.description')"
    />

    <UCard class="mb-6">
      <UFormGroup :label="t('accounting.trialBalance.financialPeriod')" class="max-w-xs">
        <USelectMenu
          v-model="financialPeriodId"
          :options="periodOptions"
          option-attribute="label"
          value-attribute="value"
          :placeholder="t('accounting.trialBalance.financialPeriodPlaceholder')"
        />
      </UFormGroup>
    </UCard>

    <UCard class="mb-6">
      <template #header>
        <span class="font-semibold">{{ t('accounting.trialBalance.liveReport') }}</span>
      </template>
      <DataTable :rows="rows ?? []" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-scale"
            :title="
              financialPeriodId
                ? t('accounting.trialBalance.emptyTitleNoActivity')
                : t('accounting.trialBalance.emptyTitlePick')
            "
            :description="
              financialPeriodId
                ? t('accounting.trialBalance.emptyDescriptionNoActivity')
                : t('accounting.trialBalance.emptyDescriptionPick')
            "
          />
        </template>
      </DataTable>

      <div
        v-if="rows?.length"
        class="flex justify-end gap-6 pt-4 px-2 text-sm font-semibold border-t border-gray-200 dark:border-gray-800 mt-2"
      >
        <span>{{ t('accounting.trialBalance.totalDebit') }}: {{ formatCurrency(totalDebit) }}</span>
        <span>{{ t('accounting.trialBalance.totalCredit') }}: {{ formatCurrency(totalCredit) }}</span>
        <span :class="isBalanced ? 'text-teal-600 dark:text-teal-400' : 'text-red-500'">
          {{ isBalanced ? t('accounting.trialBalance.balanced') : t('accounting.trialBalance.outOfBalance') }}
        </span>
      </div>
      <p class="text-xs text-gray-500 mt-3">
        {{ t('accounting.trialBalance.periodOnlyNote') }}
      </p>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">{{ t('accounting.trialBalance.snapshots') }}</span>
          <UButton
            size="xs"
            icon="i-heroicons-camera"
            :loading="generating"
            :disabled="!financialPeriodId"
            @click="onGenerate"
          >
            {{ t('accounting.trialBalance.generateSnapshot') }}
          </UButton>
        </div>
      </template>
      <DataTable
        :rows="snapshots ?? []"
        :columns="snapshotColumns"
        :loading="snapshotsPending"
        @select="(row: TrialBalanceResponse) => router.push(`/trial-balance/snapshots/${row.id}`)"
      >
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-camera"
            :title="
              financialPeriodId
                ? t('accounting.trialBalance.snapshotsEmptyTitleNoActivity')
                : t('accounting.trialBalance.snapshotsEmptyTitlePick')
            "
            :description="
              financialPeriodId
                ? t('accounting.trialBalance.snapshotsEmptyDescriptionNoActivity')
                : t('accounting.trialBalance.snapshotsEmptyDescriptionPick')
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
  TrialBalanceResponse,
  TrialBalanceRowResponse
} from '~/features/accounting/types'
import type { ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()
const toast = useToast()
const router = useRouter()

const { data: periods } = await useAsyncData('trial-balance-periods', () =>
  api<FinancialPeriodResponse[]>('/financial-periods')
)
const periodOptions = computed(() =>
  (periods.value ?? []).map((p) => ({ label: p.periodName, value: p.id }))
)

const financialPeriodId = ref<number | undefined>(undefined)

const { data: rows, pending } = await useAsyncData(
  'trial-balance-rows',
  () => {
    if (!financialPeriodId.value) return Promise.resolve([])
    return api<TrialBalanceRowResponse[]>(
      `/trial-balance?financialPeriodId=${financialPeriodId.value}`
    )
  },
  { watch: [financialPeriodId] }
)

const columns = computed<ColumnDef<TrialBalanceRowResponse>[]>(() => [
  { key: 'accountNo', label: t('accounting.trialBalance.columns.accountNo'), sortable: true },
  { key: 'accountName', label: t('accounting.trialBalance.columns.accountName'), sortable: true },
  { key: 'totalDebit', label: t('accounting.trialBalance.columns.debit'), type: 'currency', sortable: true },
  { key: 'totalCredit', label: t('accounting.trialBalance.columns.credit'), type: 'currency', sortable: true },
  { key: 'balance', label: t('accounting.trialBalance.columns.balance'), type: 'currency', sortable: true }
])

const totalDebit = computed(() => (rows.value ?? []).reduce((sum, r) => sum + r.totalDebit, 0))
const totalCredit = computed(() => (rows.value ?? []).reduce((sum, r) => sum + r.totalCredit, 0))
const isBalanced = computed(() => Math.abs(totalDebit.value - totalCredit.value) < 0.005)

const {
  data: snapshots,
  pending: snapshotsPending,
  refresh: refreshSnapshots
} = await useAsyncData(
  'trial-balance-snapshots',
  () => {
    if (!financialPeriodId.value) return Promise.resolve([])
    return api<TrialBalanceResponse[]>(
      `/trial-balance/snapshots?financialPeriodId=${financialPeriodId.value}`
    )
  },
  { watch: [financialPeriodId] }
)

const snapshotColumns = computed<ColumnDef<TrialBalanceResponse>[]>(() => [
  { key: 'generatedAt', label: t('accounting.trialBalance.columns.generated'), type: 'datetime', sortable: true },
  { key: 'generatedBy', label: t('accounting.trialBalance.columns.by') },
  { key: 'totalDebit', label: t('accounting.trialBalance.columns.totalDebit'), type: 'currency' },
  { key: 'totalCredit', label: t('accounting.trialBalance.columns.totalCredit'), type: 'currency' }
])

const generating = ref(false)
async function onGenerate() {
  if (!financialPeriodId.value) return
  generating.value = true
  try {
    await api(`/trial-balance/snapshots?financialPeriodId=${financialPeriodId.value}`, {
      method: 'POST'
    })
    toast.add({ title: t('accounting.trialBalance.snapshotGenerated'), color: 'green' })
    await refreshSnapshots()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    generating.value = false
  }
}
</script>
