<template>
  <div v-if="loan">
    <UButton to="/loans" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      Back to loans
    </UButton>
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-bold">Loan #{{ loan.id }}</h1>
        <StatusBadge :status="loan.status" />
      </div>
      <div class="flex gap-2" v-if="isAdmin">
        <UButton v-if="loan.status === 'PENDING'" color="green" @click="confirmAction = 'approve'">
          Approve
        </UButton>
        <UButton v-if="loan.status === 'PENDING'" color="red" variant="soft" @click="confirmAction = 'reject'">
          Reject
        </UButton>
        <UButton v-if="loan.status === 'APPROVED'" color="primary" @click="confirmAction = 'disburse'">
          Disburse
        </UButton>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      <UCard class="lg:col-span-2">
        <template #header>
          <span class="font-semibold">Details</span>
        </template>

        <div v-if="loan.status === 'ACTIVE' || loan.status === 'CLOSED'" class="mb-5">
          <div class="flex items-center justify-between text-sm mb-1.5">
            <span class="text-gray-500">Paid off</span>
            <span class="font-medium text-gray-900 dark:text-white">{{ payoffPercent }}%</span>
          </div>
          <UProgress :value="payoffPercent" :color="loan.status === 'CLOSED' ? 'green' : 'primary'" size="sm" />
        </div>

        <dl class="grid grid-cols-2 gap-y-3 text-sm">
          <dt class="text-gray-500">Customer</dt>
          <dd>
            <NuxtLink :to="`/customers/${loan.customerId}`" class="text-primary-500">{{ loan.customerName }}</NuxtLink>
          </dd>
          <dt class="text-gray-500">Principal</dt>
          <dd>{{ formatCurrency(loan.principal) }}</dd>
          <dt class="text-gray-500">Interest rate</dt>
          <dd>{{ loan.interestRate }}%</dd>
          <dt class="text-gray-500">Term</dt>
          <dd>{{ loan.termMonths }} months</dd>
          <dt class="text-gray-500">Monthly installment</dt>
          <dd>{{ formatCurrency(loan.monthlyInstallment) }}</dd>
          <dt class="text-gray-500">Outstanding balance</dt>
          <dd class="font-semibold">{{ formatCurrency(loan.outstandingBalance) }}</dd>
          <dt class="text-gray-500">Purpose</dt>
          <dd>{{ loan.purpose || '—' }}</dd>
          <dt class="text-gray-500">Maturity date</dt>
          <dd>{{ formatDate(loan.maturityDate) }}</dd>
          <dt class="text-gray-500">Approved</dt>
          <dd>{{ formatDateTime(loan.approvedAt) }}</dd>
          <dt class="text-gray-500">Disbursed</dt>
          <dd>{{ formatDateTime(loan.disbursedAt) }}</dd>
        </dl>
      </UCard>

      <UCard>
        <template #header>
          <span class="font-semibold">Apply payment to balance</span>
        </template>
        <!-- Directly reduces loan.outstandingBalance via loan-service. Distinct
             from the installment ledger in the "Payments" tab below, which is
             tracked separately in payment-service. -->
        <UForm :state="paymentForm" class="space-y-3" @submit="onApplyPayment">
          <UFormGroup label="Amount" name="amount" required>
            <UInput v-model.number="paymentForm.amount" type="number" min="0.01" step="0.01" required />
          </UFormGroup>
          <UButton type="submit" block :loading="applyingPayment" :disabled="loan.status !== 'ACTIVE'">
            Apply payment
          </UButton>
          <p v-if="loan.status !== 'ACTIVE'" class="text-xs text-gray-500">Only available for active loans.</p>
        </UForm>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">Payment schedule</span>
          <UButton
            v-if="isAdmin && loan.status === 'ACTIVE' && (payments ?? []).length === 0"
            size="xs"
            variant="soft"
            :loading="generatingSchedule"
            @click="onGenerateSchedule"
          >
            Generate schedule
          </UButton>
        </div>
      </template>
      <UTable :rows="payments ?? []" :columns="paymentColumns" :loading="paymentsPending">
        <template #status-data="{ row }">
          <StatusBadge :status="row.status" />
        </template>
        <template #amount-data="{ row }">{{ formatCurrency(row.amount) }}</template>
        <template #dueDate-data="{ row }">{{ formatDate(row.dueDate) }}</template>
        <template #paidAt-data="{ row }">{{ formatDate(row.paidAt) }}</template>
        <template #actions-data="{ row }">
          <UButton v-if="row.status !== 'PAID'" size="2xs" variant="soft" :loading="markingPaid === row.id" @click="onMarkPaid(row.id)">
            Mark paid
          </UButton>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-calendar-days"
            title="No payment schedule yet"
            :description="loan.status === 'ACTIVE' ? 'Generate an amortization schedule to start tracking installments.' : 'A schedule is generated automatically once the loan is disbursed.'"
          />
        </template>
      </UTable>
    </UCard>

    <ConfirmModal
      :model-value="!!confirmAction"
      :title="confirmMeta.title"
      :description="confirmMeta.description"
      :confirm-label="confirmMeta.confirmLabel"
      :color="confirmMeta.color"
      :loading="!!actionLoading"
      @update:model-value="(v: boolean) => { if (!v) confirmAction = null }"
      @confirm="doAction"
    />
  </div>
  <div v-else class="flex justify-center py-16">
    <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
  </div>
</template>

<script setup lang="ts">
import type { ApplyLoanPaymentRequest, LoanResponse } from '~/features/loans/types'
import type { PaymentResponse } from '~/features/payments/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())

const loanId = route.params.id as string

const { data: loan, refresh } = await useAsyncData(`loan-${loanId}`, () => api<LoanResponse>(`/loans/${loanId}`))
const payoffPercent = computed(() => {
  if (!loan.value || !loan.value.principal) return 0
  const outstanding = loan.value.outstandingBalance ?? 0
  const paid = loan.value.principal - outstanding
  return Math.max(0, Math.min(100, Math.round((paid / loan.value.principal) * 100)))
})

const { data: payments, pending: paymentsPending, refresh: refreshPayments } = await useAsyncData(
  `loan-${loanId}-payments`,
  () => api<PaymentResponse[]>(`/payments/loan/${loanId}`)
)

const actionLoading = ref<string | null>(null)
const applyingPayment = ref(false)
const generatingSchedule = ref(false)
const markingPaid = ref<number | null>(null)
const paymentForm = reactive({ amount: 0 })

type LoanAction = 'approve' | 'reject' | 'disburse'
const confirmAction = ref<LoanAction | null>(null)

const CONFIRM_META: Record<LoanAction, { title: string; description: string; confirmLabel: string; color: 'green' | 'red' | 'primary' }> = {
  approve: {
    title: 'Approve this loan?',
    description: 'The loan moves to APPROVED and becomes eligible for disbursement.',
    confirmLabel: 'Approve',
    color: 'green'
  },
  reject: {
    title: 'Reject this loan?',
    description: 'This is final — a rejected loan cannot be approved later.',
    confirmLabel: 'Reject',
    color: 'red'
  },
  disburse: {
    title: 'Disburse this loan?',
    description: 'Funds are marked as released, the amortization schedule is generated, and the loan becomes ACTIVE. This cannot be undone.',
    confirmLabel: 'Disburse',
    color: 'primary'
  }
}

const confirmMeta = computed(() => CONFIRM_META[confirmAction.value ?? 'approve'])

const paymentColumns = [
  { key: 'installmentNumber', label: '#' },
  { key: 'dueDate', label: 'Due' },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
  { key: 'paidAt', label: 'Paid on' },
  { key: 'actions', label: '' }
]

async function doAction() {
  const action = confirmAction.value
  if (!action) return
  actionLoading.value = action
  try {
    await api(`/loans/${loanId}/${action}`, { method: 'PUT' })
    toast.add({ title: `Loan ${action}d`, color: 'green' })
    confirmAction.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    actionLoading.value = null
  }
}

async function onApplyPayment() {
  applyingPayment.value = true
  try {
    const payload: ApplyLoanPaymentRequest = { amount: paymentForm.amount }
    await api(`/loans/${loanId}/apply-payment`, { method: 'PUT', body: payload })
    toast.add({ title: 'Payment applied', color: 'green' })
    paymentForm.amount = 0
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    applyingPayment.value = false
  }
}

async function onGenerateSchedule() {
  if (!loan.value) return
  generatingSchedule.value = true
  try {
    const installments = generateAmortizationSchedule(loan.value)
    await api('/payments/schedule', { method: 'POST', body: { loanId: Number(loanId), installments } })
    toast.add({ title: 'Schedule generated', color: 'green' })
    await refreshPayments()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    generatingSchedule.value = false
  }
}

async function onMarkPaid(paymentId: number) {
  markingPaid.value = paymentId
  try {
    await api(`/payments/${paymentId}/pay`, { method: 'PUT' })
    toast.add({ title: 'Payment marked as paid', color: 'green' })
    await refreshPayments()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    markingPaid.value = null
  }
}
</script>
