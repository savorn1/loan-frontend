<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">Penalties</span>
          <UButton v-if="isAdmin" size="xs" icon="i-heroicons-plus" @click="openCreate">Add penalty</UButton>
        </div>
      </template>

      <DataTable :rows="penalties ?? []" :columns="columns" :loading="pending">
        <template #actions-data="{ row }">
          <div class="flex gap-1 justify-end">
            <UButton v-if="isAdmin && row.status === 'PENDING'" size="2xs" variant="soft" :loading="marking === row.id" @click="onMarkPaid(row.id)">
              Mark paid
            </UButton>
            <UButton v-if="isAdmin && row.status === 'PENDING'" size="2xs" color="gray" variant="soft" :loading="waiving === row.id" @click="onWaive(row.id)">
              Waive
            </UButton>
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-exclamation-triangle"
            title="No penalties"
            description="This loan has no penalties or late fees on record."
          >
            <template v-if="isAdmin" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">Add penalty</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">Add penalty</span>
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
import type { LoanPenaltyRequest, LoanPenaltyResponse } from '~/features/loans/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())

const loanId = route.params.id as string

const { data: penalties, pending, refresh } = await useAsyncData(
  `loan-${loanId}-penalties`,
  () => api<LoanPenaltyResponse[]>(`/loans/${loanId}/penalties`)
)

const columns: ColumnDef<LoanPenaltyResponse>[] = [
  { key: 'id', label: 'ID' },
  { key: 'appliedDate', label: 'Applied', type: 'date' },
  { key: 'reason' },
  { key: 'amount', type: 'currency' },
  { key: 'status', type: 'status' },
  { key: 'createdAt', label: 'Created', type: 'datetime' },
  { key: 'actions', label: '', class: 'text-right' }
]

const fields: FieldDef[] = [
  { name: 'appliedDate', type: 'date', required: true, placeholder: 'Select date' },
  { name: 'amount', type: 'number', required: true, prefix: '$', min: 0.01, step: 0.01 },
  { name: 'reason', type: 'textarea', required: true }
]

const showCreate = ref(false)
const creating = ref(false)
const error = ref('')
const marking = ref<number | null>(null)
const waiving = ref<number | null>(null)
const createForm = ref<Record<string, any>>({})

function openCreate() {
  createForm.value = { appliedDate: '', amount: undefined, reason: '' }
  error.value = ''
  showCreate.value = true
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    const payload: LoanPenaltyRequest = {
      amount: values.amount,
      reason: values.reason,
      appliedDate: values.appliedDate
    }
    await api(`/loans/${loanId}/penalties`, { method: 'POST', body: payload })
    toast.add({ title: 'Penalty added', color: 'green' })
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
    await api(`/loans/${loanId}/penalties/${id}/pay`, { method: 'PUT' })
    toast.add({ title: 'Penalty marked as paid', color: 'green' })
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
    await api(`/loans/${loanId}/penalties/${id}/waive`, { method: 'PUT' })
    toast.add({ title: 'Penalty waived', color: 'green' })
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    waiving.value = null
  }
}
</script>
