<template>
  <div v-if="loan" class="space-y-6">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">Contract terms</span>
          <StatusBadge :status="loan.status" />
        </div>
      </template>
      <dl class="grid grid-cols-2 sm:grid-cols-3 gap-y-3 text-sm">
        <dt class="text-gray-500">Customer</dt>
        <dd class="sm:col-span-2">
          <NuxtLink :to="`/customers/${loan.customerId}`" class="text-primary-500">{{
            loan.customerName
          }}</NuxtLink>
        </dd>
        <dt class="text-gray-500">Principal</dt>
        <dd class="sm:col-span-2">{{ formatCurrency(loan.principal) }}</dd>
        <dt class="text-gray-500">Interest rate</dt>
        <dd class="sm:col-span-2">{{ loan.interestRate }}%</dd>
        <dt class="text-gray-500">Term</dt>
        <dd class="sm:col-span-2">{{ loan.termMonths }} months</dd>
        <dt class="text-gray-500">Monthly installment</dt>
        <dd class="sm:col-span-2">{{ formatCurrency(loan.monthlyInstallment) }}</dd>
        <dt class="text-gray-500">Outstanding balance</dt>
        <dd class="sm:col-span-2 font-semibold">{{ formatCurrency(loan.outstandingBalance) }}</dd>
        <dt class="text-gray-500">Maturity date</dt>
        <dd class="sm:col-span-2">{{ formatDate(loan.maturityDate) }}</dd>
        <dt class="text-gray-500">Approved</dt>
        <dd class="sm:col-span-2">{{ formatDateTime(loan.approvedAt) }}</dd>
        <dt class="text-gray-500">Disbursed</dt>
        <dd class="sm:col-span-2">{{ formatDateTime(loan.disbursedAt) }}</dd>
        <dt class="text-gray-500">Closed</dt>
        <dd class="sm:col-span-2">{{ formatDateTime(loan.closedAt) }}</dd>
        <dt class="text-gray-500">Purpose</dt>
        <dd class="sm:col-span-2">{{ loan.purpose || '—' }}</dd>
      </dl>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">Repayment schedule</span>
          <StatusBadge v-if="activeSchedule" :status="activeSchedule.status" />
        </div>
      </template>
      <DataTable
        :rows="scheduleDetails ?? []"
        :columns="scheduleColumns"
        :loading="scheduleDetailsPending"
      >
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-calendar-days"
            title="No schedule generated"
            description="Generated on disbursement and each restructure — see the Schedule tab for prior versions."
          />
        </template>
      </DataTable>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">Payments</span>
          <span v-if="totalPaid" class="text-sm text-gray-500"
            >Total {{ formatCurrency(totalPaid) }}</span
          >
        </div>
      </template>
      <DataTable :rows="payments ?? []" :columns="paymentColumns" :loading="paymentsPending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-banknotes"
            title="No payments recorded"
            description="Payments recorded on the Payments tab appear here."
          />
        </template>
      </DataTable>
    </UCard>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-semibold">Collateral</span>
            <span v-if="totalPledged" class="text-sm text-gray-500"
              >{{ formatCurrency(totalPledged) }} pledged</span
            >
          </div>
        </template>
        <DataTable
          :rows="collaterals ?? []"
          :columns="collateralColumns"
          :loading="collateralsPending"
        >
          <template #empty-state>
            <EmptyState
              icon="i-heroicons-shield-check"
              title="No collateral pledged"
              description="Assets recorded on the Collateral tab appear here."
            />
          </template>
        </DataTable>
      </UCard>

      <UCard>
        <template #header>
          <span class="font-semibold">Guarantors</span>
        </template>
        <DataTable
          :rows="guarantors ?? []"
          :columns="guarantorColumns"
          :loading="guarantorsPending"
        >
          <template #empty-state>
            <EmptyState
              icon="i-heroicons-user-group"
              title="No guarantors"
              description="Guarantors recorded on the Guarantors tab appear here."
            />
          </template>
        </DataTable>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <span class="font-semibold">Status history</span>
      </template>
      <DataTable :rows="statusHistory ?? []" :columns="statusColumns" :loading="statusPending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-clock"
            title="No status changes yet"
            description="Every approve, reject, disburse or close action on this loan is logged here."
          />
        </template>
      </DataTable>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">Disbursements</span>
          <span v-if="totalDisbursed" class="text-sm text-gray-500"
            >Total {{ formatCurrency(totalDisbursed) }}</span
          >
        </div>
      </template>
      <DataTable
        :rows="disbursements ?? []"
        :columns="disbursementColumns"
        :loading="disbursementsPending"
      >
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-arrow-down-tray"
            title="No disbursements yet"
            description="Record each release of funds for this loan on the Disbursements tab."
          />
        </template>
      </DataTable>
    </UCard>

    <UCard>
      <template #header>
        <span class="font-semibold">Restructures</span>
      </template>
      <DataTable
        :rows="restructures ?? []"
        :columns="restructureColumns"
        :loading="restructuresPending"
      >
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-arrow-path-rounded-square"
            title="No restructures"
            description="Term or rate changes recorded on the Restructures tab appear here."
          />
        </template>
      </DataTable>
    </UCard>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-semibold">Settlement</span>
            <StatusBadge v-if="settlement" :status="settlement.status" />
          </div>
        </template>
        <dl v-if="settlement" class="grid grid-cols-2 gap-y-3 text-sm">
          <dt class="text-gray-500">Amount</dt>
          <dd class="font-semibold">{{ formatCurrency(settlement.settlementAmount) }}</dd>
          <dt class="text-gray-500">Date</dt>
          <dd>{{ formatDate(settlement.settlementDate) }}</dd>
          <dt class="text-gray-500">Note</dt>
          <dd>{{ settlement.note || '—' }}</dd>
        </dl>
        <EmptyState
          v-else
          icon="i-heroicons-flag"
          title="Not settled"
          description="This loan has no settlement on record."
        />
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-semibold">Write-off</span>
            <StatusBadge v-if="writeoff" :status="writeoff.status" />
          </div>
        </template>
        <dl v-if="writeoff" class="grid grid-cols-2 gap-y-3 text-sm">
          <dt class="text-gray-500">Amount</dt>
          <dd class="font-semibold">{{ formatCurrency(writeoff.amount) }}</dd>
          <dt class="text-gray-500">Date</dt>
          <dd>{{ formatDate(writeoff.writeoffDate) }}</dd>
          <dt class="text-gray-500">Reason</dt>
          <dd>{{ writeoff.reason }}</dd>
        </dl>
        <EmptyState
          v-else
          icon="i-heroicons-no-symbol"
          title="Not written off"
          description="This loan has no write-off on record."
        />
      </UCard>
    </div>
  </div>
  <div v-else class="flex justify-center py-16">
    <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
  </div>
</template>

<script setup lang="ts">
// Read-only rollup of a loan's contract terms plus every lifecycle table that
// hangs off it (status history, disbursements, restructures, settlement,
// write-off). Entry/edit for each stays on its own dedicated tab — this page
// just gives a single-glance summary of the full contract, front to back.
import type {
  LoanResponse,
  LoanStatusHistoryResponse,
  LoanDisbursementResponse,
  LoanRestructureResponse,
  LoanSettlementResponse,
  LoanWriteoffResponse,
  LoanCollateralResponse,
  LoanGuarantorResponse,
  LoanScheduleResponse,
  LoanScheduleDetailResponse,
  LoanPaymentResponse
} from '~/features/loans/types'
import type { ColumnDef } from '~/shared/types'

const route = useRoute()
const api = useApi()

const loanId = route.params.id as string

const { data: loan } = await useAsyncData(`loan-${loanId}`, () =>
  api<LoanResponse>(`/loans/${loanId}`)
)

const { data: schedules } = await useAsyncData(`loan-${loanId}-schedules`, () =>
  api<LoanScheduleResponse[]>(`/loans/${loanId}/schedules`)
)
const activeSchedule = computed(
  () =>
    (schedules.value ?? []).find((s) => s.status === 'ACTIVE') ?? (schedules.value ?? [])[0] ?? null
)
const { data: scheduleDetails, pending: scheduleDetailsPending } = await useAsyncData(
  `loan-${loanId}-schedule-details`,
  () =>
    activeSchedule.value
      ? api<LoanScheduleDetailResponse[]>(
          `/loans/${loanId}/schedules/${activeSchedule.value.id}/details`
        )
      : Promise.resolve([])
)

const { data: payments, pending: paymentsPending } = await useAsyncData(
  `loan-${loanId}-loan-payments`,
  () => api<LoanPaymentResponse[]>(`/loans/${loanId}/payments`)
)
const totalPaid = computed(() => (payments.value ?? []).reduce((sum, p) => sum + p.amount, 0))

const scheduleColumns: ColumnDef<LoanScheduleDetailResponse>[] = [
  { key: 'installmentNumber', label: '#' },
  { key: 'dueDate', label: 'Due', type: 'date' },
  { key: 'totalAmount', label: 'Total', type: 'currency' },
  { key: 'outstandingBalance', label: 'Outstanding', type: 'currency' },
  { key: 'status', type: 'status' }
]

const paymentColumns: ColumnDef<LoanPaymentResponse>[] = [
  { key: 'paymentDate', label: 'Date', type: 'date' },
  { key: 'amount', type: 'currency' },
  { key: 'method', type: 'enum' },
  { key: 'reference' }
]

const { data: collaterals, pending: collateralsPending } = await useAsyncData(
  `loan-${loanId}-collaterals`,
  () => api<LoanCollateralResponse[]>(`/loans/${loanId}/collaterals`)
)

const { data: guarantors, pending: guarantorsPending } = await useAsyncData(
  `loan-${loanId}-guarantors`,
  () => api<LoanGuarantorResponse[]>(`/loans/${loanId}/guarantors`)
)

const { data: statusHistory, pending: statusPending } = await useAsyncData(
  `loan-${loanId}-status-history`,
  () => api<LoanStatusHistoryResponse[]>(`/loans/${loanId}/status-history`)
)

const { data: disbursements, pending: disbursementsPending } = await useAsyncData(
  `loan-${loanId}-disbursements`,
  () => api<LoanDisbursementResponse[]>(`/loans/${loanId}/disbursements`)
)

const { data: restructures, pending: restructuresPending } = await useAsyncData(
  `loan-${loanId}-restructures`,
  () => api<LoanRestructureResponse[]>(`/loans/${loanId}/restructures`)
)

const { data: settlement } = await useAsyncData(`loan-${loanId}-settlement`, async () => {
  try {
    return await api<LoanSettlementResponse>(`/loans/${loanId}/settlement`)
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 404) return null
    throw err
  }
})

const { data: writeoff } = await useAsyncData(`loan-${loanId}-writeoff`, async () => {
  try {
    return await api<LoanWriteoffResponse>(`/loans/${loanId}/writeoff`)
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 404) return null
    throw err
  }
})

const totalDisbursed = computed(() =>
  (disbursements.value ?? []).reduce((sum, d) => sum + d.amount, 0)
)
const totalPledged = computed(() =>
  (collaterals.value ?? [])
    .filter((c) => c.status === 'PLEDGED')
    .reduce((sum, c) => sum + c.estimatedValue, 0)
)

const collateralColumns: ColumnDef<LoanCollateralResponse>[] = [
  { key: 'type', type: 'enum' },
  { key: 'description' },
  { key: 'estimatedValue', label: 'Value', type: 'currency' },
  { key: 'status', type: 'status' }
]

const guarantorColumns: ColumnDef<LoanGuarantorResponse>[] = [
  { key: 'name' },
  { key: 'phone' },
  { key: 'guaranteedAmount', label: 'Amount', type: 'currency' },
  { key: 'status', type: 'status' }
]

const statusColumns: ColumnDef<LoanStatusHistoryResponse>[] = [
  { key: 'fromStatus', label: 'From', type: 'status' },
  { key: 'toStatus', label: 'To', type: 'status' },
  { key: 'note' },
  { key: 'changedBy', label: 'Changed by' },
  { key: 'changedAt', label: 'Changed', type: 'datetime' }
]

const disbursementColumns: ColumnDef<LoanDisbursementResponse>[] = [
  { key: 'disbursedDate', label: 'Date', type: 'date' },
  { key: 'amount', type: 'currency' },
  { key: 'method', type: 'enum' },
  { key: 'reference' }
]

const restructureColumns: ColumnDef<LoanRestructureResponse>[] = [
  { key: 'effectiveDate', label: 'Effective', type: 'date' },
  { key: 'newTermMonths', label: 'New term', suffix: ' months' },
  { key: 'newInterestRate', label: 'New rate', type: 'percent' },
  { key: 'reason' }
]
</script>
