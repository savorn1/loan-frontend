<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">Adjustments</span>
          <UButton v-if="isAdmin" size="xs" icon="i-heroicons-plus" @click="openCreate">Add adjustment</UButton>
        </div>
      </template>

      <DataTable :rows="adjustments ?? []" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-adjustments-horizontal"
            title="No adjustments"
            description="Manual balance corrections or write-offs for this loan will appear here."
          >
            <template v-if="isAdmin" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">Add adjustment</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">Add adjustment</span>
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
import type { LoanAdjustmentRequest, LoanAdjustmentResponse } from '~/features/loans/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())

const loanId = route.params.id as string

const { data: adjustments, pending, refresh } = await useAsyncData(
  `loan-${loanId}-adjustments`,
  () => api<LoanAdjustmentResponse[]>(`/loans/${loanId}/adjustments`)
)

const columns: ColumnDef<LoanAdjustmentResponse>[] = [
  { key: 'id', label: 'ID' },
  { key: 'createdAt', label: 'Date', type: 'datetime' },
  { key: 'type', type: 'badge', color: row => (row.type === 'CREDIT' ? 'teal' : 'orange') },
  { key: 'reason' },
  { key: 'amount', type: 'currency' }
]

const fields: FieldDef[] = [
  {
    name: 'type',
    type: 'select',
    required: true,
    options: [
      { label: 'Credit (reduces balance)', value: 'CREDIT' },
      { label: 'Debit (increases balance)', value: 'DEBIT' }
    ]
  },
  { name: 'amount', type: 'number', required: true, prefix: '$', min: 0.01, step: 0.01 },
  { name: 'reason', type: 'textarea', required: true }
]

const showCreate = ref(false)
const creating = ref(false)
const error = ref('')
const createForm = ref<Record<string, any>>({})

function openCreate() {
  createForm.value = { type: 'CREDIT', amount: undefined, reason: '' }
  error.value = ''
  showCreate.value = true
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    const payload: LoanAdjustmentRequest = {
      type: values.type,
      amount: values.amount,
      reason: values.reason
    }
    await api(`/loans/${loanId}/adjustments`, { method: 'POST', body: payload })
    toast.add({ title: 'Adjustment added', color: 'green' })
    showCreate.value = false
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}
</script>
