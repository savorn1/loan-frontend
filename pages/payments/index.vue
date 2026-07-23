<template>
  <div>
    <PageHeader title="Payments" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">New Payment</UButton>
      </template>
    </PageHeader>

    <UCard class="mb-6">
      <div class="flex flex-wrap items-center gap-3">
        <USelectMenu
          v-model="filterLoan"
          :options="loanOptions"
          option-attribute="label"
          searchable
          placeholder="Filter by loan"
          class="max-w-xs w-full sm:w-auto"
        />
        <USelectMenu v-model="statusFilter" :options="statusOptions" option-attribute="label" value-attribute="value" class="w-40" />
        <UButton v-if="filterLoan || statusFilter" variant="ghost" color="gray" icon="i-heroicons-x-mark" @click="clearFilters">
          Clear filters
        </UButton>
      </div>
    </UCard>

    <UCard>
      <DataTable :rows="rows" :columns="columns" :loading="pending" v-model:sort="sort">
        <template #actions-data="{ row }">
          <div class="flex gap-1 justify-end">
            <UButton v-if="row.status !== 'PAID'" size="2xs" variant="soft" :loading="markingPaid === row.id" @click="onMarkPaid(row.id)">
              Mark paid
            </UButton>
            <UButton v-if="isAdmin" size="2xs" color="red" variant="soft" icon="i-heroicons-trash" @click="confirmDeleteId = row.id" />
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            :icon="hasFilters ? 'i-heroicons-magnifying-glass' : 'i-heroicons-credit-card'"
            :title="hasFilters ? 'No matches' : 'No payments found'"
            :description="hasFilters ? 'Try clearing the loan or status filter.' : 'Payments appear here once a schedule is generated or created manually.'"
          >
            <template v-if="!hasFilters" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">New Payment</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">New Payment</span>
        </template>
        <DynamicForm
          v-model="createForm"
          :fields="paymentFields"
          :loading="creating"
          :error="error"
          submit-label="Create"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </UCard>
    </UModal>

    <ConfirmModal
      :model-value="confirmDeleteId !== null"
      title="Delete this payment?"
      description="This removes the installment from the schedule. This action cannot be undone."
      confirm-label="Delete"
      color="red"
      :loading="deleting"
      @update:model-value="(v: boolean) => { if (!v) confirmDeleteId = null }"
      @confirm="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { LoanResponse } from '~/features/loans/types'
import type { PaymentRequest, PaymentResponse, PaymentStatus } from '~/features/payments/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())

type LoanOption = { label: string; value: number }

const filterLoan = ref<LoanOption | undefined>(undefined)

const { data: payments, pending, refresh } = await useAsyncData(
  'payments',
  () => (filterLoan.value ? api<PaymentResponse[]>(`/payments/loan/${filterLoan.value.value}`) : api<PaymentResponse[]>('/payments')),
  { watch: [filterLoan] }
)
const { data: loansRaw } = await useAsyncData('payments-loans', () => api<LoanResponse[]>('/loans'))

const loanOptions = computed<LoanOption[]>(() =>
  (loansRaw.value ?? []).map(l => ({ label: `#${l.id} — ${l.customerName} (${l.status})`, value: l.id }))
)

const statusOptions: { label: string; value: PaymentStatus | '' }[] = [
  { label: 'All statuses', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Overdue', value: 'OVERDUE' }
]
const statusFilter = ref<PaymentStatus | ''>('')

const filteredByStatus = computed(() =>
  statusFilter.value ? (payments.value ?? []).filter(p => p.status === statusFilter.value) : payments.value
)

const { page, pageSize, sort, total, rows } = useClientTable(filteredByStatus, { pageSize: 10 })

const hasFilters = computed(() => !!filterLoan.value || !!statusFilter.value)

const totalLabel = computed(() => {
  const count = payments.value?.length ?? 0
  return count === 1 ? '1 payment' : `${count} payments`
})

function clearFilters() {
  filterLoan.value = undefined
  statusFilter.value = ''
}

const columns: ColumnDef<PaymentResponse>[] = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'loanId', label: 'Loan', type: 'link', sortable: true, href: row => `/loans/${row.loanId}`, prefix: () => '#' },
  { key: 'installmentNumber', label: '#', sortable: true },
  { key: 'amount', type: 'currency', sortable: true },
  { key: 'dueDate', label: 'Due', type: 'date', sortable: true },
  { key: 'status', type: 'status', sortable: true },
  { key: 'createdAt', label: 'Created', type: 'datetime', sortable: true },
  { key: 'actions', label: '', class: 'text-right' }
]

const showCreate = ref(false)
const creating = ref(false)
const error = ref('')
const markingPaid = ref<number | null>(null)
const deleting = ref(false)
const confirmDeleteId = ref<number | null>(null)

// Declarative field defs for <DynamicForm> — required/select/date validation
// is handled there (these controls have no native browser validation).
const paymentFields = computed<FieldDef[]>(() => [
  { name: 'loanId', label: 'Loan', type: 'select', required: true, options: loanOptions.value, placeholder: 'Select a loan' },
  { name: 'amount', type: 'number', required: true, prefix: '$', min: 0.01, step: 0.01 },
  { name: 'dueDate', type: 'date', required: true, placeholder: 'Select due date' },
  { name: 'note', type: 'text' }
])

const createForm = ref<Record<string, any>>({})

function openCreate() {
  createForm.value = { loanId: undefined, amount: undefined, dueDate: '', note: '' }
  error.value = ''
  showCreate.value = true
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    const payload: PaymentRequest = {
      loanId: values.loanId,
      amount: values.amount,
      dueDate: values.dueDate,
      note: values.note || undefined
    }
    await api('/payments', { method: 'POST', body: payload })
    toast.add({ title: 'Payment created', color: 'green' })
    showCreate.value = false
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}

async function onMarkPaid(id: number) {
  markingPaid.value = id
  try {
    await api(`/payments/${id}/pay`, { method: 'PUT' })
    toast.add({ title: 'Payment marked as paid', color: 'green' })
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    markingPaid.value = null
  }
}

async function onDelete() {
  if (confirmDeleteId.value === null) return
  deleting.value = true
  try {
    await api(`/payments/${confirmDeleteId.value}`, { method: 'DELETE' })
    toast.add({ title: 'Payment deleted', color: 'green' })
    confirmDeleteId.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    deleting.value = false
  }
}
</script>
