<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">Disbursements</span>
          <UButton v-if="isAdmin" size="xs" icon="i-heroicons-plus" @click="openCreate">Add disbursement</UButton>
        </div>
      </template>

      <DataTable :rows="disbursements ?? []" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-arrow-down-tray"
            title="No disbursements yet"
            description="Record each release of funds for this loan — a single disbursement or several staged releases."
          >
            <template v-if="isAdmin" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">Add disbursement</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="totalDisbursed" class="pt-4 mt-2 border-t border-gray-200 dark:border-gray-800 text-sm flex justify-between">
        <span class="text-gray-500">Total disbursed</span>
        <span class="font-semibold">{{ formatCurrency(totalDisbursed) }}</span>
      </div>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">Add disbursement</span>
        </template>
        <DynamicForm
          v-model="createForm"
          :fields="fields"
          :loading="creating"
          :error="error"
          submit-label="Add"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { LoanDisbursementRequest, LoanDisbursementResponse } from '~/features/loans/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())

const loanId = route.params.id as string

const { data: disbursements, pending, refresh } = await useAsyncData(
  `loan-${loanId}-disbursements`,
  () => api<LoanDisbursementResponse[]>(`/loans/${loanId}/disbursements`)
)

const totalDisbursed = computed(() => (disbursements.value ?? []).reduce((sum, d) => sum + d.amount, 0))

const columns: ColumnDef<LoanDisbursementResponse>[] = [
  { key: 'disbursedDate', label: 'Date', type: 'date' },
  { key: 'amount', type: 'currency' },
  { key: 'method', type: 'enum' },
  { key: 'reference' },
  { key: 'createdAt', label: 'Created', type: 'datetime' }
]

const fields: FieldDef[] = [
  { name: 'amount', type: 'number', required: true, prefix: '$', min: 0.01, step: 0.01, wrapper: 'half' },
  { name: 'disbursedDate', label: 'Date', type: 'date', required: true, wrapper: 'half' },
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

function openCreate() {
  createForm.value = { amount: undefined, disbursedDate: '', method: undefined, reference: '' }
  error.value = ''
  showCreate.value = true
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    const payload: LoanDisbursementRequest = {
      amount: values.amount,
      disbursedDate: values.disbursedDate,
      method: values.method,
      reference: values.reference || undefined
    }
    await api(`/loans/${loanId}/disbursements`, { method: 'POST', body: payload })
    toast.add({ title: 'Disbursement recorded', color: 'green' })
    showCreate.value = false
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}
</script>
