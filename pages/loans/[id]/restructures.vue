<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">Restructures</span>
          <UButton v-if="isAdmin" size="xs" icon="i-heroicons-plus" @click="openCreate">Add restructure</UButton>
        </div>
      </template>

      <DataTable :rows="restructures ?? []" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-arrow-path-rounded-square"
            title="No restructures"
            description="Log a change to this loan's term or rate — e.g. a hardship extension or rate adjustment."
          >
            <template v-if="isAdmin" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">Add restructure</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">Add restructure</span>
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
import type { LoanRestructureRequest, LoanRestructureResponse } from '~/features/loans/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())

const loanId = route.params.id as string

const { data: restructures, pending, refresh } = await useAsyncData(
  `loan-${loanId}-restructures`,
  () => api<LoanRestructureResponse[]>(`/loans/${loanId}/restructures`)
)

const columns: ColumnDef<LoanRestructureResponse>[] = [
  { key: 'effectiveDate', label: 'Effective', type: 'date' },
  { key: 'newTermMonths', label: 'New term', suffix: ' months' },
  { key: 'newInterestRate', label: 'New rate', type: 'percent' },
  { key: 'reason' },
  { key: 'createdAt', label: 'Created', type: 'datetime' }
]

const fields: FieldDef[] = [
  { name: 'newTermMonths', label: 'New term (months)', type: 'number', required: true, min: 1, wrapper: 'half' },
  { name: 'newInterestRate', label: 'New interest rate', type: 'number', suffix: '%', min: 0.01, max: 100, step: 0.01, hint: 'Optional — leave blank to keep the current rate', wrapper: 'half' },
  { name: 'effectiveDate', type: 'date', required: true },
  { name: 'reason', type: 'textarea', required: true }
]

const showCreate = ref(false)
const creating = ref(false)
const error = ref('')
const createForm = ref<Record<string, any>>({})

function openCreate() {
  createForm.value = { newTermMonths: undefined, newInterestRate: undefined, effectiveDate: '', reason: '' }
  error.value = ''
  showCreate.value = true
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    const payload: LoanRestructureRequest = {
      newTermMonths: values.newTermMonths,
      newInterestRate: values.newInterestRate || undefined,
      effectiveDate: values.effectiveDate,
      reason: values.reason
    }
    await api(`/loans/${loanId}/restructures`, { method: 'POST', body: payload })
    toast.add({ title: 'Restructure recorded', color: 'green' })
    showCreate.value = false
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}
</script>
