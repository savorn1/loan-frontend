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
      <UTable :rows="rows" :columns="columns" :loading="pending" v-model:sort="sort">
        <template #status-data="{ row }">
          <StatusBadge :status="row.status" />
        </template>
        <template #amount-data="{ row }">{{ formatCurrency(row.amount) }}</template>
        <template #dueDate-data="{ row }">{{ formatDate(row.dueDate) }}</template>
        <template #loanId-data="{ row }">
          <NuxtLink :to="`/loans/${row.loanId}`" class="text-primary-500 font-medium">#{{ row.loanId }}</NuxtLink>
        </template>
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
      </UTable>

      <div v-if="total > pageSize" class="flex justify-end pt-4">
        <UPagination v-model="page" :page-count="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">New Payment</span>
        </template>
        <UForm :state="form" class="space-y-4" @submit="onCreate">
          <UFormGroup label="Loan" name="loanId" required>
            <USelectMenu
              v-model="selectedLoan"
              :options="loanOptions"
              option-attribute="label"
              searchable
              placeholder="Select a loan"
            />
          </UFormGroup>
          <UFormGroup label="Amount" name="amount" required>
            <UInput v-model.number="form.amount" type="number" min="0.01" step="0.01" required />
          </UFormGroup>
          <UFormGroup label="Due date" name="dueDate" required>
            <UInput v-model="form.dueDate" type="date" required />
          </UFormGroup>
          <UFormGroup label="Note" name="note">
            <UInput v-model="form.note" />
          </UFormGroup>
          <UAlert v-if="error" color="red" variant="subtle" :title="error" />
          <div class="flex justify-end">
            <UButton type="submit" :loading="creating">Create</UButton>
          </div>
        </UForm>
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

const columns = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'loanId', label: 'Loan', sortable: true },
  { key: 'installmentNumber', label: '#', sortable: true },
  { key: 'amount', label: 'Amount', sortable: true },
  { key: 'dueDate', label: 'Due', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'actions', label: '', class: 'text-right' }
]

const showCreate = ref(false)
const creating = ref(false)
const error = ref('')
const markingPaid = ref<number | null>(null)
const deleting = ref(false)
const confirmDeleteId = ref<number | null>(null)

const selectedLoan = ref<LoanOption | undefined>(undefined)
const form = reactive<Omit<PaymentRequest, 'loanId'>>({ amount: 0, dueDate: '', note: '' })

function openCreate() {
  selectedLoan.value = undefined
  form.amount = 0
  form.dueDate = ''
  form.note = ''
  error.value = ''
  showCreate.value = true
}

async function onCreate() {
  if (!selectedLoan.value) {
    error.value = 'Please select a loan'
    return
  }
  creating.value = true
  error.value = ''
  try {
    const payload: PaymentRequest = { loanId: selectedLoan.value.value, ...form }
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
