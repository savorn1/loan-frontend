<template>
  <div v-if="loan">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      <UCard class="lg:col-span-2">
        <template #header>
          <span class="font-semibold">{{ t('loans.overview.detailsTitle') }}</span>
        </template>

        <div v-if="loan.status === 'ACTIVE' || loan.status === 'CLOSED'" class="mb-5">
          <div class="flex items-center justify-between text-sm mb-1.5">
            <span class="text-gray-500">{{ t('loans.overview.paidOff') }}</span>
            <span class="font-medium text-gray-900 dark:text-white">{{ payoffPercent }}%</span>
          </div>
          <UProgress
            :value="payoffPercent"
            :color="loan.status === 'CLOSED' ? 'teal' : 'primary'"
            size="sm"
          />
        </div>

        <dl class="grid grid-cols-2 gap-y-3 text-sm">
          <dt class="text-gray-500">{{ t('loans.overview.fields.customer') }}</dt>
          <dd>
            <NuxtLink :to="`/customers/${loan.customerId}`" class="text-primary-500">{{
              loan.customerName
            }}</NuxtLink>
          </dd>
          <dt class="text-gray-500">{{ t('loans.overview.fields.principal') }}</dt>
          <dd>{{ formatCurrency(loan.principal) }}</dd>
          <dt class="text-gray-500">{{ t('loans.overview.fields.interestRate') }}</dt>
          <dd>{{ loan.interestRate }}%</dd>
          <dt class="text-gray-500">{{ t('loans.overview.fields.term') }}</dt>
          <dd>{{ t('loans.overview.months', { count: loan.termMonths }) }}</dd>
          <dt class="text-gray-500">{{ t('loans.overview.fields.monthlyInstallment') }}</dt>
          <dd>{{ formatCurrency(loan.monthlyInstallment) }}</dd>
          <dt class="text-gray-500">{{ t('loans.overview.fields.outstandingBalance') }}</dt>
          <dd class="font-semibold">{{ formatCurrency(loan.outstandingBalance) }}</dd>
          <dt class="text-gray-500">{{ t('loans.overview.fields.purpose') }}</dt>
          <dd>{{ loan.purpose || '—' }}</dd>
          <dt class="text-gray-500">{{ t('loans.overview.fields.maturityDate') }}</dt>
          <dd>{{ formatDate(loan.maturityDate) }}</dd>
          <dt class="text-gray-500">{{ t('loans.overview.fields.approved') }}</dt>
          <dd>{{ formatDateTime(loan.approvedAt) }}</dd>
          <dt class="text-gray-500">{{ t('loans.overview.fields.disbursed') }}</dt>
          <dd>{{ formatDateTime(loan.disbursedAt) }}</dd>
        </dl>
      </UCard>

      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('loans.overview.applyPaymentTitle') }}</span>
        </template>
        <!-- Directly reduces loan.outstandingBalance via loan-service. Distinct
             from the installment ledger in the "Payments" tab below, which is
             tracked separately in payment-service. -->
        <UForm :state="paymentForm" class="space-y-3" @submit="onApplyPayment">
          <UFormGroup :label="t('loans.overview.amount')" name="amount" required>
            <UInput
              v-model.number="paymentForm.amount"
              type="number"
              min="0.01"
              step="0.01"
              required
            />
          </UFormGroup>
          <UButton
            type="submit"
            block
            :loading="applyingPayment"
            :disabled="loan.status !== 'ACTIVE'"
          >
            {{ t('loans.overview.applyPaymentButton') }}
          </UButton>
          <p v-if="loan.status !== 'ACTIVE'" class="text-xs text-gray-500">
            {{ t('loans.overview.applyPaymentHint') }}
          </p>
        </UForm>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">{{ t('loans.overview.scheduleTitle') }}</span>
          <UButton
            v-if="isAdmin && loan.status === 'ACTIVE' && (payments ?? []).length === 0"
            size="xs"
            variant="soft"
            :loading="generatingSchedule"
            @click="onGenerateSchedule"
          >
            {{ t('loans.overview.generateScheduleButton') }}
          </UButton>
        </div>
      </template>
      <DataTable :rows="payments ?? []" :columns="paymentColumns" :loading="paymentsPending">
        <template #actions-data="{ row }">
          <UButton
            v-if="row.status !== 'PAID'"
            size="2xs"
            variant="soft"
            :loading="markingPaid === row.id"
            @click="onMarkPaid(row.id)"
          >
            {{ t('loans.overview.markPaidButton') }}
          </UButton>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-calendar-days"
            :title="t('loans.overview.empty.title')"
            :description="
              loan.status === 'ACTIVE'
                ? t('loans.overview.empty.descriptionActive')
                : t('loans.overview.empty.descriptionOther')
            "
          />
        </template>
      </DataTable>
    </UCard>
  </div>
  <div v-else class="flex justify-center py-16">
    <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
  </div>
</template>

<script setup lang="ts">
import type { ApplyLoanPaymentRequest, LoanResponse } from '~/features/loans/types'
import type { PaymentResponse } from '~/features/payments/types'
import type { ColumnDef } from '~/shared/types'

const { t } = useI18n()
const route = useRoute()
const api = useApi()
const toast = useToast()

const loanId = route.params.id as string

const { data: loan, refresh } = await useAsyncData(`loan-${loanId}`, () =>
  api<LoanResponse>(`/loans/${loanId}`)
)
const payoffPercent = computed(() => {
  if (!loan.value || !loan.value.principal) return 0
  const outstanding = loan.value.outstandingBalance ?? 0
  const paid = loan.value.principal - outstanding
  return Math.max(0, Math.min(100, Math.round((paid / loan.value.principal) * 100)))
})

const {
  data: payments,
  pending: paymentsPending,
  refresh: refreshPayments
} = await useAsyncData(`loan-${loanId}-payments`, () =>
  api<PaymentResponse[]>(`/payments/loan/${loanId}`)
)

const { isAdmin } = storeToRefs(useAuth())
const applyingPayment = ref(false)
const generatingSchedule = ref(false)
const markingPaid = ref<number | null>(null)
const paymentForm = reactive({ amount: 0 })

const paymentColumns = computed<ColumnDef<PaymentResponse>[]>(() => [
  { key: 'installmentNumber', label: t('loans.overview.columns.installmentNumber') },
  { key: 'dueDate', label: t('loans.overview.columns.due'), type: 'date' },
  { key: 'amount', label: t('loans.overview.columns.amount'), type: 'currency' },
  { key: 'status', label: t('loans.overview.columns.status'), type: 'status' },
  { key: 'paidAt', label: t('loans.overview.columns.paidOn'), type: 'date' },
  { key: 'createdAt', label: t('loans.overview.columns.created'), type: 'datetime' },
  { key: 'actions', label: '' }
])

async function onApplyPayment() {
  applyingPayment.value = true
  try {
    const payload: ApplyLoanPaymentRequest = { amount: paymentForm.amount }
    await api(`/loans/${loanId}/apply-payment`, { method: 'PUT', body: payload })
    toast.add({ title: t('loans.overview.toast.applied'), color: 'green' })
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
    await api('/payments/schedule', {
      method: 'POST',
      body: { loanId: Number(loanId), installments }
    })
    toast.add({ title: t('loans.overview.toast.scheduleGenerated'), color: 'green' })
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
    toast.add({ title: t('loans.overview.toast.markedPaid'), color: 'green' })
    await refreshPayments()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    markingPaid.value = null
  }
}
</script>
