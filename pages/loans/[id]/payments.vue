<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">Payments</span>
          <UButton v-if="isAdmin" size="xs" icon="i-heroicons-plus" @click="openCreate"
            >Record payment</UButton
          >
        </div>
      </template>

      <DataTable :rows="payments ?? []" :columns="columns" :loading="pending">
        <template #actions-data="{ row }">
          <UButton
            v-if="row.allocations.length"
            size="2xs"
            variant="soft"
            @click="viewingAllocations = row"
          >
            View allocations
          </UButton>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-banknotes"
            title="No payments recorded"
            description="Record money received against this loan — it's automatically allocated across the repayment schedule."
          >
            <template v-if="isAdmin" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">Record payment</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div
        v-if="totalPaid"
        class="pt-4 mt-2 border-t border-gray-200 dark:border-gray-800 text-sm flex justify-between"
      >
        <span class="text-gray-500">Total paid</span>
        <span class="font-semibold">{{ formatCurrency(totalPaid) }}</span>
      </div>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">Record payment</span>
        </template>
        <DynamicForm
          v-model="createForm"
          :fields="fields"
          :loading="creating"
          :error="error"
          submit-label="Record"
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
          <span class="font-semibold">Allocation breakdown</span>
        </template>
        <DataTable :rows="viewingAllocations.allocations" :columns="allocationColumns" />
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

const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())

const loanId = route.params.id as string

const {
  data: payments,
  pending,
  refresh
} = await useAsyncData(`loan-${loanId}-loan-payments`, () =>
  api<LoanPaymentResponse[]>(`/loans/${loanId}/payments`)
)

const totalPaid = computed(() => (payments.value ?? []).reduce((sum, p) => sum + p.amount, 0))

const columns: ColumnDef<LoanPaymentResponse>[] = [
  { key: 'paymentDate', label: 'Date', type: 'date' },
  { key: 'amount', type: 'currency' },
  { key: 'method', type: 'enum' },
  { key: 'reference' },
  { key: 'createdAt', label: 'Created', type: 'datetime' },
  { key: 'actions', label: '' }
]

const allocationColumns: ColumnDef<LoanPaymentAllocationResponse>[] = [
  { key: 'installmentNumber', label: 'Installment #' },
  { key: 'principalAllocated', label: 'Principal', type: 'currency' },
  { key: 'interestAllocated', label: 'Interest', type: 'currency' },
  { key: 'penaltyAllocated', label: 'Penalty', type: 'currency' }
]

const fields: FieldDef[] = [
  {
    name: 'amount',
    type: 'number',
    required: true,
    prefix: '$',
    min: 0.01,
    step: 0.01,
    wrapper: 'half'
  },
  { name: 'paymentDate', label: 'Date', type: 'date', required: true, wrapper: 'half' },
  {
    name: 'method',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: 'Bank transfer', value: 'BANK_TRANSFER' },
      { label: 'Cash', value: 'CASH' },
      { label: 'Cheque', value: 'CHEQUE' },
      { label: 'Mobile wallet', value: 'MOBILE_WALLET' }
    ]
  },
  { name: 'reference', wrapper: 'half' }
]

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
    toast.add({ title: 'Payment recorded', color: 'green' })
    showCreate.value = false
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}
</script>
