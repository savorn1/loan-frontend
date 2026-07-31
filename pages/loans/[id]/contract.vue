<template>
  <div v-if="loan" class="space-y-6">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">{{ t('loans.contract.contractTermsTitle') }}</span>
          <StatusBadge :status="loan.status" />
        </div>
      </template>
      <dl class="grid grid-cols-2 sm:grid-cols-3 gap-y-3 text-sm">
        <dt class="text-gray-500">{{ t('loans.contract.fields.customer') }}</dt>
        <dd class="sm:col-span-2">
          <NuxtLink :to="`/customers/${loan.customerId}`" class="text-primary-500">{{
            loan.customerName
          }}</NuxtLink>
        </dd>
        <dt class="text-gray-500">{{ t('loans.contract.fields.principal') }}</dt>
        <dd class="sm:col-span-2">{{ formatCurrency(loan.principal) }}</dd>
        <dt class="text-gray-500">{{ t('loans.contract.fields.interestRate') }}</dt>
        <dd class="sm:col-span-2">{{ loan.interestRate }}%</dd>
        <dt class="text-gray-500">{{ t('loans.contract.fields.term') }}</dt>
        <dd class="sm:col-span-2">{{ t('loans.contract.months', { count: loan.termMonths }) }}</dd>
        <dt class="text-gray-500">{{ t('loans.contract.fields.monthlyInstallment') }}</dt>
        <dd class="sm:col-span-2">{{ formatCurrency(loan.monthlyInstallment) }}</dd>
        <dt class="text-gray-500">{{ t('loans.contract.fields.outstandingBalance') }}</dt>
        <dd class="sm:col-span-2 font-semibold">{{ formatCurrency(loan.outstandingBalance) }}</dd>
        <dt class="text-gray-500">{{ t('loans.contract.fields.maturityDate') }}</dt>
        <dd class="sm:col-span-2">{{ formatDate(loan.maturityDate) }}</dd>
        <dt class="text-gray-500">{{ t('loans.contract.fields.approved') }}</dt>
        <dd class="sm:col-span-2">{{ formatDateTime(loan.approvedAt) }}</dd>
        <dt class="text-gray-500">{{ t('loans.contract.fields.disbursed') }}</dt>
        <dd class="sm:col-span-2">{{ formatDateTime(loan.disbursedAt) }}</dd>
        <dt class="text-gray-500">{{ t('loans.contract.fields.closed') }}</dt>
        <dd class="sm:col-span-2">{{ formatDateTime(loan.closedAt) }}</dd>
        <dt class="text-gray-500">{{ t('loans.contract.fields.purpose') }}</dt>
        <dd class="sm:col-span-2">{{ loan.purpose || '—' }}</dd>
      </dl>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">{{ t('loans.contract.repaymentScheduleTitle') }}</span>
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
            :title="t('loans.contract.scheduleEmpty.title')"
            :description="t('loans.contract.scheduleEmpty.description')"
          />
        </template>
      </DataTable>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">{{ t('loans.contract.paymentsTitle') }}</span>
          <span v-if="totalPaid" class="text-sm text-gray-500">{{
            t('loans.contract.totalLabel', { amount: formatCurrency(totalPaid) })
          }}</span>
        </div>
      </template>
      <DataTable :rows="payments ?? []" :columns="paymentColumns" :loading="paymentsPending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-banknotes"
            :title="t('loans.contract.paymentsEmpty.title')"
            :description="t('loans.contract.paymentsEmpty.description')"
          />
        </template>
      </DataTable>
    </UCard>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-semibold">{{ t('loans.contract.collateralTitle') }}</span>
            <span v-if="totalPledged" class="text-sm text-gray-500">{{
              t('loans.contract.pledgedLabel', { amount: formatCurrency(totalPledged) })
            }}</span>
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
              :title="t('loans.contract.collateralEmpty.title')"
              :description="t('loans.contract.collateralEmpty.description')"
            />
          </template>
        </DataTable>
      </UCard>

      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('loans.contract.guarantorsTitle') }}</span>
        </template>
        <DataTable
          :rows="guarantors ?? []"
          :columns="guarantorColumns"
          :loading="guarantorsPending"
        >
          <template #empty-state>
            <EmptyState
              icon="i-heroicons-user-group"
              :title="t('loans.contract.guarantorsEmpty.title')"
              :description="t('loans.contract.guarantorsEmpty.description')"
            />
          </template>
        </DataTable>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <span class="font-semibold">{{ t('loans.contract.statusHistoryTitle') }}</span>
      </template>
      <DataTable :rows="statusHistory ?? []" :columns="statusColumns" :loading="statusPending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-clock"
            :title="t('loans.contract.statusHistoryEmpty.title')"
            :description="t('loans.contract.statusHistoryEmpty.description')"
          />
        </template>
      </DataTable>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">{{ t('loans.contract.disbursementsTitle') }}</span>
          <span v-if="totalDisbursed" class="text-sm text-gray-500">{{
            t('loans.contract.totalLabel', { amount: formatCurrency(totalDisbursed) })
          }}</span>
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
            :title="t('loans.contract.disbursementsEmpty.title')"
            :description="t('loans.contract.disbursementsEmpty.description')"
          />
        </template>
      </DataTable>
    </UCard>

    <UCard>
      <template #header>
        <span class="font-semibold">{{ t('loans.contract.restructuresTitle') }}</span>
      </template>
      <DataTable
        :rows="restructures ?? []"
        :columns="restructureColumns"
        :loading="restructuresPending"
      >
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-arrow-path-rounded-square"
            :title="t('loans.contract.restructuresEmpty.title')"
            :description="t('loans.contract.restructuresEmpty.description')"
          />
        </template>
      </DataTable>
    </UCard>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-semibold">{{ t('loans.contract.settlementTitle') }}</span>
            <StatusBadge v-if="settlement" :status="settlement.status" />
          </div>
        </template>
        <dl v-if="settlement" class="grid grid-cols-2 gap-y-3 text-sm">
          <dt class="text-gray-500">{{ t('loans.contract.settlementFields.amount') }}</dt>
          <dd class="font-semibold">{{ formatCurrency(settlement.settlementAmount) }}</dd>
          <dt class="text-gray-500">{{ t('loans.contract.settlementFields.date') }}</dt>
          <dd>{{ formatDate(settlement.settlementDate) }}</dd>
          <dt class="text-gray-500">{{ t('loans.contract.settlementFields.note') }}</dt>
          <dd>{{ settlement.note || '—' }}</dd>
        </dl>
        <EmptyState
          v-else
          icon="i-heroicons-flag"
          :title="t('loans.contract.settlementEmpty.title')"
          :description="t('loans.contract.settlementEmpty.description')"
        />
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-semibold">{{ t('loans.contract.writeoffTitle') }}</span>
            <StatusBadge v-if="writeoff" :status="writeoff.status" />
          </div>
        </template>
        <dl v-if="writeoff" class="grid grid-cols-2 gap-y-3 text-sm">
          <dt class="text-gray-500">{{ t('loans.contract.writeoffFields.amount') }}</dt>
          <dd class="font-semibold">{{ formatCurrency(writeoff.amount) }}</dd>
          <dt class="text-gray-500">{{ t('loans.contract.writeoffFields.date') }}</dt>
          <dd>{{ formatDate(writeoff.writeoffDate) }}</dd>
          <dt class="text-gray-500">{{ t('loans.contract.writeoffFields.reason') }}</dt>
          <dd>{{ writeoff.reason }}</dd>
        </dl>
        <EmptyState
          v-else
          icon="i-heroicons-no-symbol"
          :title="t('loans.contract.writeoffEmpty.title')"
          :description="t('loans.contract.writeoffEmpty.description')"
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

const { t } = useI18n()
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

const scheduleColumns = computed<ColumnDef<LoanScheduleDetailResponse>[]>(() => [
  { key: 'installmentNumber', label: t('loans.contract.scheduleColumns.installmentNumber') },
  { key: 'dueDate', label: t('loans.contract.scheduleColumns.due'), type: 'date' },
  { key: 'totalAmount', label: t('loans.contract.scheduleColumns.total'), type: 'currency' },
  {
    key: 'outstandingBalance',
    label: t('loans.contract.scheduleColumns.outstanding'),
    type: 'currency'
  },
  { key: 'status', label: t('loans.contract.scheduleColumns.status'), type: 'status' }
])

const paymentColumns = computed<ColumnDef<LoanPaymentResponse>[]>(() => [
  { key: 'paymentDate', label: t('loans.contract.paymentColumns.date'), type: 'date' },
  { key: 'amount', label: t('loans.contract.paymentColumns.amount'), type: 'currency' },
  { key: 'method', label: t('loans.contract.paymentColumns.method'), type: 'enum' },
  { key: 'reference', label: t('loans.contract.paymentColumns.reference') }
])

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

const collateralColumns = computed<ColumnDef<LoanCollateralResponse>[]>(() => [
  { key: 'type', label: t('loans.contract.collateralColumns.type'), type: 'enum' },
  { key: 'description', label: t('loans.contract.collateralColumns.description') },
  {
    key: 'estimatedValue',
    label: t('loans.contract.collateralColumns.value'),
    type: 'currency'
  },
  { key: 'status', label: t('loans.contract.collateralColumns.status'), type: 'status' }
])

const guarantorColumns = computed<ColumnDef<LoanGuarantorResponse>[]>(() => [
  { key: 'name', label: t('loans.contract.guarantorColumns.name') },
  { key: 'phone', label: t('loans.contract.guarantorColumns.phone') },
  {
    key: 'guaranteedAmount',
    label: t('loans.contract.guarantorColumns.amount'),
    type: 'currency'
  },
  { key: 'status', label: t('loans.contract.guarantorColumns.status'), type: 'status' }
])

const statusColumns = computed<ColumnDef<LoanStatusHistoryResponse>[]>(() => [
  { key: 'fromStatus', label: t('loans.contract.statusColumns.from'), type: 'status' },
  { key: 'toStatus', label: t('loans.contract.statusColumns.to'), type: 'status' },
  { key: 'note', label: t('loans.contract.statusColumns.note') },
  { key: 'changedBy', label: t('loans.contract.statusColumns.changedBy') },
  { key: 'changedAt', label: t('loans.contract.statusColumns.changedAt'), type: 'datetime' }
])

const disbursementColumns = computed<ColumnDef<LoanDisbursementResponse>[]>(() => [
  { key: 'disbursedDate', label: t('loans.contract.disbursementColumns.date'), type: 'date' },
  { key: 'amount', label: t('loans.contract.disbursementColumns.amount'), type: 'currency' },
  { key: 'method', label: t('loans.contract.disbursementColumns.method'), type: 'enum' },
  { key: 'reference', label: t('loans.contract.disbursementColumns.reference') }
])

const restructureColumns = computed<ColumnDef<LoanRestructureResponse>[]>(() => [
  { key: 'effectiveDate', label: t('loans.contract.restructureColumns.effective'), type: 'date' },
  {
    key: 'newTermMonths',
    label: t('loans.contract.restructureColumns.newTerm'),
    suffix: t('loans.contract.restructureColumns.newTermSuffix')
  },
  {
    key: 'newInterestRate',
    label: t('loans.contract.restructureColumns.newRate'),
    type: 'percent'
  },
  { key: 'reason', label: t('loans.contract.restructureColumns.reason') }
])
</script>
