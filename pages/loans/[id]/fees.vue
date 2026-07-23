<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">Fees</span>
          <UButton v-if="isAdmin" size="xs" icon="i-heroicons-plus" @click="openCreate"
            >Add fee</UButton
          >
        </div>
      </template>

      <DataTable :rows="fees ?? []" :columns="columns" :loading="pending">
        <template #actions-data="{ row }">
          <div class="flex gap-1 justify-end">
            <UButton
              v-if="isAdmin && row.status === 'PENDING'"
              size="2xs"
              variant="soft"
              :loading="marking === row.id"
              @click="onMarkPaid(row.id)"
            >
              Mark paid
            </UButton>
            <UButton
              v-if="isAdmin && row.status === 'PENDING'"
              size="2xs"
              color="gray"
              variant="soft"
              :loading="waiving === row.id"
              @click="onWaive(row.id)"
            >
              Waive
            </UButton>
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-receipt-percent"
            title="No fees"
            description="Charges applied to this loan — processing, insurance, administration and other fees."
          >
            <template v-if="isAdmin" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">Add fee</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div
        v-if="totalFees"
        class="pt-4 mt-2 border-t border-gray-200 dark:border-gray-800 text-sm flex justify-between"
      >
        <span class="text-gray-500">Total fees</span>
        <span class="font-semibold">{{ formatCurrency(totalFees) }}</span>
      </div>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">Add fee</span>
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
import type { LoanFeeRequest, LoanFeeResponse } from '~/features/loans/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())

const loanId = route.params.id as string

const {
  data: fees,
  pending,
  refresh
} = await useAsyncData(`loan-${loanId}-fees`, () => api<LoanFeeResponse[]>(`/loans/${loanId}/fees`))

const totalFees = computed(() => (fees.value ?? []).reduce((sum, f) => sum + f.amount, 0))

const columns: ColumnDef<LoanFeeResponse>[] = [
  { key: 'type', type: 'enum' },
  { key: 'chargedDate', label: 'Charged', type: 'date' },
  { key: 'amount', type: 'currency' },
  { key: 'description' },
  { key: 'status', type: 'status' },
  { key: 'createdAt', label: 'Created', type: 'datetime' },
  { key: 'actions', label: '', class: 'text-right' }
]

const fields: FieldDef[] = [
  {
    name: 'type',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: 'Processing', value: 'PROCESSING' },
      { label: 'Insurance', value: 'INSURANCE' },
      { label: 'Administration', value: 'ADMINISTRATION' },
      { label: 'Other', value: 'OTHER' }
    ]
  },
  {
    name: 'amount',
    type: 'number',
    required: true,
    prefix: '$',
    min: 0.01,
    step: 0.01,
    wrapper: 'half'
  },
  { name: 'chargedDate', label: 'Charged date', type: 'date', required: true },
  { name: 'description', type: 'textarea' }
]

const showCreate = ref(false)
const creating = ref(false)
const error = ref('')
const marking = ref<number | null>(null)
const waiving = ref<number | null>(null)
const createForm = ref<Record<string, any>>({})

function openCreate() {
  createForm.value = { type: undefined, amount: undefined, chargedDate: '', description: '' }
  error.value = ''
  showCreate.value = true
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    const payload: LoanFeeRequest = {
      type: values.type,
      amount: values.amount,
      chargedDate: values.chargedDate,
      description: values.description || undefined
    }
    await api(`/loans/${loanId}/fees`, { method: 'POST', body: payload })
    toast.add({ title: 'Fee added', color: 'green' })
    showCreate.value = false
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}

async function onMarkPaid(id: number) {
  marking.value = id
  try {
    await api(`/loans/${loanId}/fees/${id}/pay`, { method: 'PUT' })
    toast.add({ title: 'Fee marked as paid', color: 'green' })
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    marking.value = null
  }
}

async function onWaive(id: number) {
  waiving.value = id
  try {
    await api(`/loans/${loanId}/fees/${id}/waive`, { method: 'PUT' })
    toast.add({ title: 'Fee waived', color: 'green' })
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    waiving.value = null
  }
}
</script>
