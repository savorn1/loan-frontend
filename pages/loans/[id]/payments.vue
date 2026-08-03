<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">{{ t('loans.payments.title') }}</span>
          <UButton v-if="isAdmin" size="xs" icon="i-heroicons-plus" @click="openCreate">{{
            t('loans.payments.recordButton')
          }}</UButton>
        </div>
      </template>

      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable :rows="payments ?? []" :columns="columns" :loading="pending">
        <template #reversed-data="{ row }">
          <StatusBadge v-if="row.reversed" status="REVERSED" />
          <span v-else>—</span>
        </template>
        <template #actions-data="{ row }">
          <div class="flex items-center justify-end gap-1">
            <UButton
              v-if="row.allocations.length"
              size="2xs"
              variant="soft"
              @click="viewingAllocations = row"
            >
              {{ t('loans.payments.viewAllocationsButton') }}
            </UButton>
            <UButton
              v-if="isAdmin && !row.reversed"
              size="2xs"
              color="orange"
              variant="soft"
              icon="i-heroicons-arrow-uturn-left"
              @click="openReverse(row)"
            >
              {{ t('loans.payments.reverseButton') }}
            </UButton>
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-banknotes"
            :title="t('loans.payments.empty.title')"
            :description="t('loans.payments.empty.description')"
          >
            <template v-if="isAdmin" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">{{
                t('loans.payments.recordButton')
              }}</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div
        v-if="totalPaid"
        class="pt-4 mt-2 border-t border-gray-200 dark:border-gray-800 text-sm flex justify-between"
      >
        <span class="text-gray-500">{{ t('loans.payments.totalPaidLabel') }}</span>
        <span class="font-semibold">{{ formatCurrency(totalPaid) }}</span>
      </div>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('loans.payments.modalTitle') }}</span>
        </template>
        <DynamicForm
          v-model="createForm"
          :fields="fields"
          :loading="creating"
          :error="error"
          :submit-label="t('loans.payments.submitLabel')"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </UCard>
    </UModal>

    <UModal
      :model-value="!!viewingAllocations"
      @update:model-value="
        (v: boolean) => {
          if (!v) viewingAllocations = null
        }
      "
    >
      <UCard v-if="viewingAllocations">
        <template #header>
          <span class="font-semibold">{{ t('loans.payments.allocationModalTitle') }}</span>
        </template>
        <DataTable
          :rows="viewingAllocations.allocations"
          :columns="allocationColumns"
          export-filename="payment-allocations.csv"
        />
      </UCard>
    </UModal>

    <UModal v-model="showReverse">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('loans.payments.reverseModalTitle') }}</span>
        </template>
        <DynamicForm
          v-model="reverseForm"
          :fields="reverseFields"
          :loading="reversing"
          :error="reverseError"
          :submit-label="t('loans.payments.reverseButton')"
          cancelable
          @submit="onSubmitReverse"
          @cancel="showReverse = false"
        />
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type {
  LoanPaymentAllocationResponse,
  LoanPaymentRequest,
  LoanPaymentResponse
} from '~/features/loans/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const { t } = useI18n()
const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())

const loanId = route.params.id as string

const {
  data: payments,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData(`loan-${loanId}-loan-payments`, () =>
  api<LoanPaymentResponse[]>(`/loans/${loanId}/payments`)
)

const totalPaid = computed(() => (payments.value ?? []).reduce((sum, p) => sum + p.amount, 0))

const columns = computed<ColumnDef<LoanPaymentResponse>[]>(() => [
  { key: 'paymentDate', label: t('loans.payments.columns.date'), type: 'date' },
  { key: 'amount', label: t('loans.payments.columns.amount'), type: 'currency' },
  { key: 'method', label: t('loans.payments.columns.method'), type: 'enum' },
  { key: 'reference', label: t('loans.payments.columns.reference') },
  { key: 'reversed', label: t('loans.payments.columns.status') },
  { key: 'createdAt', label: t('loans.payments.columns.created'), type: 'datetime' },
  { key: 'actions', label: '' }
])

const allocationColumns = computed<ColumnDef<LoanPaymentAllocationResponse>[]>(() => [
  {
    key: 'installmentNumber',
    label: t('loans.payments.allocationColumns.installmentNumber')
  },
  {
    key: 'principalAllocated',
    label: t('loans.payments.allocationColumns.principal'),
    type: 'currency'
  },
  {
    key: 'interestAllocated',
    label: t('loans.payments.allocationColumns.interest'),
    type: 'currency'
  },
  {
    key: 'penaltyAllocated',
    label: t('loans.payments.allocationColumns.penalty'),
    type: 'currency'
  }
])

const fields = computed<FieldDef[]>(() => [
  {
    name: 'amount',
    label: t('loans.payments.fields.amount'),
    type: 'currency',
    required: true,
    wrapper: 'half'
  },
  {
    name: 'paymentDate',
    label: t('loans.payments.fields.date'),
    type: 'date',
    required: true,
    wrapper: 'half'
  },
  {
    name: 'method',
    label: t('loans.payments.fields.method'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: t('loans.payments.methodOptions.bankTransfer'), value: 'BANK_TRANSFER' },
      { label: t('loans.payments.methodOptions.cash'), value: 'CASH' },
      { label: t('loans.payments.methodOptions.cheque'), value: 'CHEQUE' },
      { label: t('loans.payments.methodOptions.mobileWallet'), value: 'MOBILE_WALLET' }
    ]
  },
  { name: 'reference', label: t('loans.payments.fields.reference'), wrapper: 'half' }
])

const showCreate = ref(false)
const creating = ref(false)
const error = ref('')
const createForm = ref<Record<string, any>>({})
const viewingAllocations = ref<LoanPaymentResponse | null>(null)

function openCreate() {
  createForm.value = { amount: undefined, paymentDate: '', method: undefined, reference: '' }
  error.value = ''
  showCreate.value = true
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    const payload: LoanPaymentRequest = {
      amount: values.amount,
      paymentDate: values.paymentDate,
      method: values.method,
      reference: values.reference || undefined
    }
    await api(`/loans/${loanId}/payments`, { method: 'POST', body: payload })
    toast.add({ title: t('loans.payments.toastRecorded'), color: 'green' })
    showCreate.value = false
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}

const showReverse = ref(false)
const reversing = ref(false)
const reverseError = ref('')
const reverseForm = ref<Record<string, any>>({ reason: '' })
const reverseTarget = ref<LoanPaymentResponse | null>(null)

const reverseFields = computed<FieldDef[]>(() => [
  { name: 'reason', label: t('loans.payments.reasonFieldLabel'), type: 'textarea', required: true }
])

function openReverse(row: LoanPaymentResponse) {
  reverseTarget.value = row
  reverseForm.value = { reason: '' }
  reverseError.value = ''
  showReverse.value = true
}

async function onSubmitReverse(values: Record<string, any>) {
  if (!reverseTarget.value) return
  reversing.value = true
  reverseError.value = ''
  try {
    await api(`/loans/${loanId}/payments/${reverseTarget.value.id}/reverse`, {
      method: 'POST',
      body: { reason: values.reason }
    })
    toast.add({ title: t('loans.payments.toastReversed'), color: 'green' })
    showReverse.value = false
    await refresh()
  } catch (err) {
    reverseError.value = apiErrorMessage(err)
  } finally {
    reversing.value = false
  }
}
</script>
