<template>
  <div>
    <UAlert
      v-if="fetchError"
      color="red"
      variant="subtle"
      class="mb-4"
      :title="apiErrorMessage(fetchError)"
    />

    <UCard v-if="writeoff">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">{{ t('loans.writeoff.title') }}</span>
          <StatusBadge :status="writeoff.status" />
        </div>
      </template>

      <dl class="grid grid-cols-2 gap-y-3 text-sm mb-4">
        <dt class="text-gray-500">{{ t('loans.writeoff.labels.amount') }}</dt>
        <dd class="font-semibold">{{ formatCurrency(writeoff.amount) }}</dd>
        <dt class="text-gray-500">{{ t('loans.writeoff.labels.date') }}</dt>
        <dd>{{ formatDate(writeoff.writeoffDate) }}</dd>
        <dt class="text-gray-500">{{ t('loans.writeoff.labels.reason') }}</dt>
        <dd>{{ writeoff.reason }}</dd>
      </dl>

      <UButton
        v-if="isAdmin && writeoff.status === 'PENDING'"
        color="red"
        :loading="completing"
        @click="showCompleteConfirm = true"
      >
        {{ t('loans.writeoff.markCompleted') }}
      </UButton>
    </UCard>

    <UCard v-else>
      <template #header>
        <span class="font-semibold">{{ t('loans.writeoff.writeoffTitle') }}</span>
      </template>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {{ t('loans.writeoff.noWriteoff') }}
      </p>
      <DynamicForm
        v-if="isAdmin"
        v-model="createForm"
        :fields="fields"
        :loading="creating"
        :error="error"
        :submit-label="t('loans.writeoff.submit')"
        @submit="onCreate"
      />
    </UCard>

    <ConfirmModal
      v-model="showCompleteConfirm"
      :title="t('loans.writeoff.confirmComplete.title')"
      :description="t('loans.writeoff.confirmComplete.description')"
      :confirm-label="t('loans.writeoff.markCompleted')"
      color="red"
      :loading="completing"
      @confirm="onComplete"
    />

    <UCard v-if="writeoff && writeoff.status === 'COMPLETED'" class="mt-6">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">{{ t('loans.writeoffRecovery.title') }}</span>
          <UButton v-if="isAdmin" size="xs" icon="i-heroicons-plus" @click="openRecoveryForm">
            {{ t('loans.writeoffRecovery.add') }}
          </UButton>
        </div>
      </template>

      <UAlert
        v-if="recoveriesError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(recoveriesError)"
      />

      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {{
          t('loans.writeoffRecovery.summary', {
            recovered: formatCurrency(totalRecovered),
            writtenOff: formatCurrency(writeoff.amount)
          })
        }}
      </p>

      <DataTable
        :rows="recoveries ?? []"
        :columns="recoveryColumns"
        :loading="recoveriesPending"
        numbered
        refreshable
        @refresh="refreshRecoveries"
      >
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-arrow-uturn-left"
            :title="t('loans.writeoffRecovery.empty.title')"
            :description="t('loans.writeoffRecovery.empty.description')"
          >
            <template v-if="isAdmin" #action>
              <UButton icon="i-heroicons-plus" @click="openRecoveryForm">{{
                t('loans.writeoffRecovery.add')
              }}</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>
    </UCard>

    <UModal v-model="showRecoveryForm">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('loans.writeoffRecovery.add') }}</span>
        </template>
        <DynamicForm
          v-model="recoveryForm"
          :fields="recoveryFields"
          :loading="recoverySubmitting"
          :error="recoveryError"
          :submit-label="t('common.save')"
          cancelable
          @submit="onSubmitRecovery"
          @cancel="showRecoveryForm = false"
        />
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type {
  LoanWriteoffRecoveryRequest,
  LoanWriteoffRecoveryResponse,
  LoanWriteoffRequest,
  LoanWriteoffResponse
} from '~/features/loans/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())
const { t } = useI18n()

const loanId = route.params.id as string

const {
  data: writeoff,
  error: fetchError,
  refresh
} = await useAsyncData(`loan-${loanId}-writeoff`, async () => {
  try {
    return await api<LoanWriteoffResponse>(`/loans/${loanId}/writeoff`)
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 404) return null
    throw err
  }
})

const today = new Date().toISOString().slice(0, 10)

const fields = computed<FieldDef[]>(() => [
  { name: 'amount', label: t('loans.writeoff.fields.amount'), type: 'currency', required: true },
  {
    name: 'writeoffDate',
    label: t('loans.writeoff.fields.writeoffDate'),
    type: 'date',
    required: true,
    default: today
  },
  { name: 'reason', label: t('loans.writeoff.fields.reason'), type: 'textarea', required: true }
])

const creating = ref(false)
const completing = ref(false)
const showCompleteConfirm = ref(false)
const error = ref('')
const createForm = ref<Record<string, any>>({ amount: undefined, writeoffDate: today, reason: '' })

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    const payload: LoanWriteoffRequest = {
      amount: values.amount,
      writeoffDate: values.writeoffDate,
      reason: values.reason
    }
    await api(`/loans/${loanId}/writeoff`, { method: 'POST', body: payload })
    toast.add({ title: t('loans.writeoff.toast.recorded'), color: 'green' })
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}

async function onComplete() {
  completing.value = true
  try {
    await api(`/loans/${loanId}/writeoff/complete`, { method: 'PUT' })
    toast.add({ title: t('loans.writeoff.toast.completed'), color: 'green' })
    showCompleteConfirm.value = false
    await refresh()
    // The recovery list below is fetched with immediate: writeoff was COMPLETED at page
    // load — completing it just now means that initial fetch never ran, so force one now.
    await refreshRecoveries()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    completing.value = false
  }
}

// ── Write-off recovery — only meaningful once the write-off is COMPLETED;
// the loan stays CLOSED, recording a recovery doesn't reopen it. ──────────

const {
  data: recoveries,
  pending: recoveriesPending,
  error: recoveriesError,
  refresh: refreshRecoveries
} = await useAsyncData(
  `loan-${loanId}-writeoff-recoveries`,
  () => api<LoanWriteoffRecoveryResponse[]>(`/loans/${loanId}/writeoff/recoveries`),
  { immediate: writeoff.value?.status === 'COMPLETED' }
)

const totalRecovered = computed(() =>
  (recoveries.value ?? []).reduce((sum, r) => sum + r.amount, 0)
)

const recoveryColumns = computed<ColumnDef<LoanWriteoffRecoveryResponse>[]>(() => [
  { key: 'recoveryDate', label: t('loans.writeoffRecovery.columns.date'), type: 'date' },
  { key: 'amount', label: t('loans.writeoffRecovery.columns.amount'), type: 'currency' },
  { key: 'method', label: t('loans.writeoffRecovery.columns.method'), type: 'enum' },
  { key: 'reference', label: t('loans.writeoffRecovery.columns.reference') },
  { key: 'createdAt', label: t('loans.writeoffRecovery.columns.created'), type: 'datetime' }
])

const recoveryFields = computed<FieldDef[]>(() => [
  {
    name: 'amount',
    label: t('loans.writeoffRecovery.fields.amount'),
    type: 'currency',
    required: true
  },
  {
    name: 'recoveryDate',
    label: t('loans.writeoffRecovery.fields.recoveryDate'),
    type: 'date',
    required: true,
    default: today
  },
  {
    name: 'method',
    label: t('loans.writeoffRecovery.fields.method'),
    type: 'select',
    required: true,
    options: [
      { label: t('loans.disbursements.methodOptions.bankTransfer'), value: 'BANK_TRANSFER' },
      { label: t('loans.disbursements.methodOptions.cash'), value: 'CASH' },
      { label: t('loans.disbursements.methodOptions.cheque'), value: 'CHEQUE' },
      { label: t('loans.disbursements.methodOptions.mobileWallet'), value: 'MOBILE_WALLET' }
    ]
  },
  { name: 'reference', label: t('loans.writeoffRecovery.fields.reference'), type: 'text' }
])

const showRecoveryForm = ref(false)
const recoverySubmitting = ref(false)
const recoveryError = ref('')
const recoveryForm = ref<Record<string, any>>({})

function openRecoveryForm() {
  recoveryForm.value = { amount: undefined, recoveryDate: today, method: undefined, reference: '' }
  recoveryError.value = ''
  showRecoveryForm.value = true
}

async function onSubmitRecovery(values: Record<string, any>) {
  recoverySubmitting.value = true
  recoveryError.value = ''
  try {
    const payload: LoanWriteoffRecoveryRequest = {
      amount: values.amount,
      recoveryDate: values.recoveryDate,
      method: values.method,
      reference: values.reference || undefined
    }
    await api(`/loans/${loanId}/writeoff/recoveries`, { method: 'POST', body: payload })
    toast.add({ title: t('loans.writeoffRecovery.toast.recorded'), color: 'green' })
    showRecoveryForm.value = false
    await refreshRecoveries()
  } catch (err) {
    recoveryError.value = apiErrorMessage(err)
  } finally {
    recoverySubmitting.value = false
  }
}
</script>
