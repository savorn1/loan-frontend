<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-bold">Payments</h1>
      <UButton icon="i-heroicons-plus" @click="openCreate">New Payment</UButton>
    </div>

    <UCard class="mb-6">
      <div class="flex items-center gap-3">
        <USelectMenu
          v-model="filterLoan"
          :options="loanOptions"
          option-attribute="label"
          searchable
          placeholder="Filter by loan"
          class="max-w-xs w-full"
        />
        <UButton v-if="filterLoan" variant="ghost" color="gray" icon="i-heroicons-x-mark" @click="filterLoan = undefined">Clear</UButton>
      </div>
    </UCard>

    <UCard>
      <UTable :rows="payments ?? []" :columns="columns" :loading="pending">
        <template #status-data="{ row }">
          <StatusBadge :status="row.status" />
        </template>
        <template #amount-data="{ row }">{{ formatCurrency(row.amount) }}</template>
        <template #dueDate-data="{ row }">{{ formatDate(row.dueDate) }}</template>
        <template #loanId-data="{ row }">
          <NuxtLink :to="`/loans/${row.loanId}`" class="text-primary-500">#{{ row.loanId }}</NuxtLink>
        </template>
        <template #actions-data="{ row }">
          <div class="flex gap-1">
            <UButton v-if="row.status !== 'PAID'" size="2xs" variant="soft" :loading="markingPaid === row.id" @click="onMarkPaid(row.id)">
              Mark paid
            </UButton>
            <UButton v-if="isAdmin" size="2xs" color="red" variant="soft" @click="confirmDeleteId = row.id">
              Delete
            </UButton>
          </div>
        </template>
      </UTable>
      <p v-if="!pending && (payments ?? []).length === 0" class="text-sm text-gray-500 py-4 text-center">
        No payments found.
      </p>
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
import type { PaymentRequest, PaymentResponse } from '~/features/payments/types'

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

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'loanId', label: 'Loan' },
  { key: 'installmentNumber', label: '#' },
  { key: 'amount', label: 'Amount' },
  { key: 'dueDate', label: 'Due' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '' }
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
