<template>
  <div>
    <UAlert
      v-if="fetchError"
      color="red"
      variant="subtle"
      class="mb-4"
      :title="apiErrorMessage(fetchError)"
    />

    <UCard v-if="quote">
      <template #header>
        <span class="font-semibold">{{ t('loans.payoff.title') }}</span>
      </template>

      <dl class="grid grid-cols-2 gap-y-3 text-sm mb-4">
        <dt class="text-gray-500">{{ t('loans.payoff.labels.remainingPrincipal') }}</dt>
        <dd>{{ formatCurrency(quote.remainingPrincipal) }}</dd>
        <dt class="text-gray-500">{{ t('loans.payoff.labels.accruedInterest') }}</dt>
        <dd>{{ formatCurrency(quote.accruedInterest) }}</dd>
        <dt class="text-gray-500">{{ t('loans.payoff.labels.outstandingFees') }}</dt>
        <dd>{{ formatCurrency(quote.outstandingFees) }}</dd>
        <dt class="text-gray-500">{{ t('loans.payoff.labels.outstandingPenalties') }}</dt>
        <dd>{{ formatCurrency(quote.outstandingPenalties) }}</dd>
        <dt class="text-gray-500">{{ t('loans.payoff.labels.asOf') }}</dt>
        <dd>{{ formatDate(quote.asOfDate) }}</dd>
        <dt class="font-semibold pt-2 border-t border-gray-200 dark:border-gray-800">
          {{ t('loans.payoff.labels.total') }}
        </dt>
        <dd class="font-semibold text-lg pt-2 border-t border-gray-200 dark:border-gray-800">
          {{ formatCurrency(quote.totalPayoffAmount) }}
        </dd>
      </dl>

      <p class="text-xs text-gray-400 dark:text-gray-500 mb-4">
        {{ t('loans.payoff.disclaimer') }}
      </p>

      <UButton v-if="isAdmin" color="primary" :loading="refreshingQuote" @click="openConfirm">
        {{ t('loans.payoff.payoffNow') }}
      </UButton>
    </UCard>

    <UCard v-else-if="!pending && !fetchError">
      <p class="text-sm text-gray-500 dark:text-gray-400">
        {{ t('loans.payoff.notAvailable') }}
      </p>
    </UCard>

    <UModal v-model="showForm">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('loans.payoff.confirmTitle') }}</span>
        </template>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {{
            t('loans.payoff.confirmDescription', {
              amount: formatCurrency(quote?.totalPayoffAmount ?? 0)
            })
          }}
        </p>
        <DynamicForm
          v-model="payoffForm"
          :fields="fields"
          :loading="submitting"
          :error="error"
          :submit-label="t('loans.payoff.confirmSubmit')"
          cancelable
          @submit="onPayoff"
          @cancel="showForm = false"
        />
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { LoanPayoffQuoteResponse, LoanPayoffRequest } from '~/features/loans/types'
import type { FieldDef } from '~/shared/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())
const { t } = useI18n()

const loanId = route.params.id as string

const {
  data: quote,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData(`loan-${loanId}-payoff-quote`, async () => {
  try {
    return await api<LoanPayoffQuoteResponse>(`/loans/${loanId}/payoff-quote`)
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status
    // 409: loan isn't ACTIVE — a payoff quote genuinely doesn't apply, not an error to surface.
    if (status === 409) return null
    throw err
  }
})

const fields = computed<FieldDef[]>(() => [
  {
    name: 'method',
    label: t('loans.payoff.fields.method'),
    type: 'select',
    required: true,
    options: [
      { label: t('loans.disbursements.methodOptions.bankTransfer'), value: 'BANK_TRANSFER' },
      { label: t('loans.disbursements.methodOptions.cash'), value: 'CASH' },
      { label: t('loans.disbursements.methodOptions.cheque'), value: 'CHEQUE' },
      { label: t('loans.disbursements.methodOptions.mobileWallet'), value: 'MOBILE_WALLET' }
    ]
  },
  { name: 'reference', label: t('loans.payoff.fields.reference'), type: 'text' }
])

const showForm = ref(false)
const submitting = ref(false)
const refreshingQuote = ref(false)
const error = ref('')
const payoffForm = ref<Record<string, any>>({ method: undefined, reference: '' })

async function openConfirm() {
  // The quote card can sit on screen for a while before someone clicks this — refetch so the
  // amount they're about to confirm matches what payoff() will actually charge (which always
  // recomputes fresh server-side regardless of what the UI shows, but the two should agree).
  refreshingQuote.value = true
  try {
    await refresh()
  } finally {
    refreshingQuote.value = false
  }
  payoffForm.value = { method: undefined, reference: '' }
  error.value = ''
  showForm.value = true
}

async function onPayoff(values: Record<string, any>) {
  submitting.value = true
  error.value = ''
  try {
    const payload: LoanPayoffRequest = {
      method: values.method,
      reference: values.reference || undefined
    }
    await api(`/loans/${loanId}/payoff`, { method: 'POST', body: payload })
    toast.add({ title: t('loans.payoff.toast.paidOff'), color: 'green' })
    showForm.value = false
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    submitting.value = false
  }
}
</script>
