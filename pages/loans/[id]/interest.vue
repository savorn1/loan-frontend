<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">Interest accruals</span>
          <UButton v-if="isAdmin" size="xs" icon="i-heroicons-plus" @click="openCreate">Add accrual</UButton>
        </div>
      </template>

      <DataTable :rows="interest ?? []" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-chart-bar"
            title="No interest accruals"
            description="Interest accrual entries for this loan will appear here."
          >
            <template v-if="isAdmin" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">Add accrual</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">Add interest accrual</span>
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
import type { LoanInterestRequest, LoanInterestResponse } from '~/features/loans/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())

const loanId = route.params.id as string

const { data: interest, pending, refresh } = await useAsyncData(
  `loan-${loanId}-interest`,
  () => api<LoanInterestResponse[]>(`/loans/${loanId}/interest`)
)

const columns: ColumnDef<LoanInterestResponse>[] = [
  { key: 'id', label: 'ID' },
  { key: 'periodStart', label: 'Period start', type: 'date' },
  { key: 'periodEnd', label: 'Period end', type: 'date' },
  { key: 'rate', type: 'percent' },
  { key: 'amount', type: 'currency' },
  { key: 'accruedAt', label: 'Accrued', type: 'date' },
  { key: 'createdAt', label: 'Created', type: 'datetime' }
]

const fields: FieldDef[] = [
  { name: 'periodStart', type: 'date', required: true, wrapper: 'half' },
  { name: 'periodEnd', type: 'date', required: true, wrapper: 'half' },
  { name: 'rate', type: 'number', required: true, suffix: '%', min: 0.01, max: 100, step: 0.01, wrapper: 'half' },
  { name: 'amount', type: 'number', required: true, prefix: '$', min: 0.01, step: 0.01, wrapper: 'half' }
]

const showCreate = ref(false)
const creating = ref(false)
const error = ref('')
const createForm = ref<Record<string, any>>({})

function openCreate() {
  createForm.value = { periodStart: '', periodEnd: '', rate: undefined, amount: undefined }
  error.value = ''
  showCreate.value = true
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    const payload: LoanInterestRequest = {
      periodStart: values.periodStart,
      periodEnd: values.periodEnd,
      rate: values.rate,
      amount: values.amount
    }
    await api(`/loans/${loanId}/interest`, { method: 'POST', body: payload })
    toast.add({ title: 'Interest accrual added', color: 'green' })
    showCreate.value = false
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}
</script>
