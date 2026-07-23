<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">Repayment schedule</span>
          <USelectMenu
            v-if="scheduleOptions.length > 1"
            v-model="selectedScheduleId"
            :options="scheduleOptions"
            option-attribute="label"
            value-attribute="value"
            class="w-56"
          />
        </div>
      </template>

      <div
        v-if="selectedSchedule"
        class="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4"
      >
        <span>Generated {{ formatDateTime(selectedSchedule.generatedAt) }}</span>
        <StatusBadge :status="selectedSchedule.status" />
        <span>{{ selectedSchedule.totalInstallments }} installments</span>
      </div>

      <DataTable :rows="details ?? []" :columns="columns" :loading="detailsPending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-calendar-days"
            title="No schedule generated"
            description="An amortization schedule is generated automatically once the loan is disbursed or restructured."
          />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
// Read-only — schedules and their installment lines are system-generated
// (on disbursement and on each restructure); this tab just lets you pick
// which generated run to view. Recording an actual payment happens on the
// Payments tab, which allocates it back against these installment lines.
import type { LoanScheduleResponse, LoanScheduleDetailResponse } from '~/features/loans/types'
import type { ColumnDef } from '~/shared/types'

const route = useRoute()
const api = useApi()

const loanId = route.params.id as string

const { data: schedules } = await useAsyncData(`loan-${loanId}-schedules`, () =>
  api<LoanScheduleResponse[]>(`/loans/${loanId}/schedules`)
)

const scheduleOptions = computed(() =>
  (schedules.value ?? [])
    .slice()
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))
    .map((s) => ({ label: `${formatDate(s.generatedAt)} · ${formatEnum(s.status)}`, value: s.id }))
)

const initialSchedule =
  (schedules.value ?? []).find((s) => s.status === 'ACTIVE') ?? (schedules.value ?? [])[0]
const selectedScheduleId = ref<number | undefined>(initialSchedule?.id)

const selectedSchedule = computed(
  () => (schedules.value ?? []).find((s) => s.id === selectedScheduleId.value) ?? null
)

const { data: details, pending: detailsPending } = await useAsyncData(
  `loan-${loanId}-schedule-details`,
  () =>
    selectedScheduleId.value
      ? api<LoanScheduleDetailResponse[]>(
          `/loans/${loanId}/schedules/${selectedScheduleId.value}/details`
        )
      : Promise.resolve([]),
  { watch: [selectedScheduleId] }
)

const columns: ColumnDef<LoanScheduleDetailResponse>[] = [
  { key: 'installmentNumber', label: '#' },
  { key: 'dueDate', label: 'Due', type: 'date' },
  { key: 'principalAmount', label: 'Principal', type: 'currency' },
  { key: 'interestAmount', label: 'Interest', type: 'currency' },
  { key: 'totalAmount', label: 'Total', type: 'currency' },
  { key: 'outstandingBalance', label: 'Outstanding', type: 'currency' },
  { key: 'status', type: 'status' }
]
</script>
