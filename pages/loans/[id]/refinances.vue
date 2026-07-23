<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">Refinances</span>
          <UButton v-if="isAdmin" size="xs" icon="i-heroicons-plus" @click="openCreate"
            >Add refinance</UButton
          >
        </div>
      </template>

      <DataTable :rows="refinances ?? []" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-arrows-right-left"
            title="No refinances"
            description="Log that this loan was replaced by a new loan — create the replacement loan first, then link it here."
          >
            <template v-if="isAdmin" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">Add refinance</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">Add refinance</span>
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
import type {
  LoanRefinanceRequest,
  LoanRefinanceResponse,
  LoanResponse
} from '~/features/loans/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())

const loanId = route.params.id as string

const {
  data: refinances,
  pending,
  refresh
} = await useAsyncData(`loan-${loanId}-refinances`, () =>
  api<LoanRefinanceResponse[]>(`/loans/${loanId}/refinances`)
)
const { data: allLoans } = await useAsyncData(`loan-${loanId}-refinances-loans`, () =>
  api<LoanResponse[]>('/loans')
)

const loanOptions = computed(() =>
  (allLoans.value ?? [])
    .filter((l) => String(l.id) !== loanId)
    .map((l) => ({ label: `#${l.id} — ${l.customerName} (${l.status})`, value: l.id }))
)

const columns: ColumnDef<LoanRefinanceResponse>[] = [
  { key: 'effectiveDate', label: 'Effective', type: 'date' },
  {
    key: 'newLoanId',
    label: 'Replacement loan',
    type: 'link',
    href: (row) => `/loans/${row.newLoanId}`,
    prefix: () => '#'
  },
  { key: 'reason' },
  { key: 'createdAt', label: 'Created', type: 'datetime' }
]

const fields = computed<FieldDef[]>(() => [
  {
    name: 'newLoanId',
    label: 'Replacement loan',
    type: 'select',
    required: true,
    options: loanOptions.value,
    placeholder: 'Select the new loan'
  },
  { name: 'effectiveDate', type: 'date', required: true },
  { name: 'reason', type: 'textarea', required: true }
])

const showCreate = ref(false)
const creating = ref(false)
const error = ref('')
const createForm = ref<Record<string, any>>({})

function openCreate() {
  createForm.value = { newLoanId: undefined, effectiveDate: '', reason: '' }
  error.value = ''
  showCreate.value = true
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    const payload: LoanRefinanceRequest = {
      newLoanId: values.newLoanId,
      effectiveDate: values.effectiveDate,
      reason: values.reason
    }
    await api(`/loans/${loanId}/refinances`, { method: 'POST', body: payload })
    toast.add({ title: 'Refinance recorded', color: 'green' })
    showCreate.value = false
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}
</script>
