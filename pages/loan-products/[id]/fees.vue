<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">Fees</span>
          <UButton v-if="isAdmin" size="xs" icon="i-heroicons-plus" @click="openCreate">Add fee</UButton>
        </div>
      </template>

      <DataTable :rows="fees ?? []" :columns="columns" :loading="pending">
        <template #actions-data="{ row }">
          <div class="flex gap-1 justify-end">
            <UButton v-if="isAdmin" size="2xs" variant="soft" icon="i-heroicons-pencil" @click="openEdit(row)" />
            <UButton v-if="isAdmin" size="2xs" color="red" variant="soft" icon="i-heroicons-trash" @click="confirmDeleteId = row.id" />
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-banknotes"
            title="No fees configured"
            description="Add origination, processing, late-payment or other fees for this product."
          >
            <template v-if="isAdmin" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">Add fee</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>
    </UCard>

    <UModal v-model="showForm">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ editingId ? 'Edit fee' : 'Add fee' }}</span>
        </template>
        <DynamicForm
          v-model="form"
          :fields="fields"
          :loading="saving"
          :error="error"
          :submit-label="editingId ? 'Save changes' : 'Add'"
          cancelable
          @submit="onSubmit"
          @cancel="showForm = false"
        />
      </UCard>
    </UModal>

    <ConfirmModal
      :model-value="confirmDeleteId !== null"
      title="Delete this fee?"
      description="This removes the fee from the product. This action cannot be undone."
      confirm-label="Delete"
      color="red"
      :loading="deleting"
      @update:model-value="(v: boolean) => { if (!v) confirmDeleteId = null }"
      @confirm="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { LoanProductFeeRequest, LoanProductFeeResponse } from '~/features/loan-products/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())

const productId = route.params.id as string

const { data: fees, pending, refresh } = await useAsyncData(
  `loan-product-${productId}-fees`,
  () => api<LoanProductFeeResponse[]>(`/loan-products/${productId}/fees`)
)

const columns: ColumnDef<LoanProductFeeResponse>[] = [
  { key: 'name' },
  { key: 'type', type: 'enum' },
  { key: 'amount', value: row => (row.calculationMethod === 'PERCENTAGE' ? `${row.amount}%` : formatCurrency(row.amount)) },
  { key: 'chargeTiming', label: 'Charged', type: 'enum' },
  { key: 'createdAt', label: 'Created', type: 'datetime' },
  { key: 'actions', label: '', class: 'text-right' }
]

const fields: FieldDef[] = [
  { name: 'name', required: true, wrapper: 'half' },
  {
    name: 'type',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: 'Origination', value: 'ORIGINATION' },
      { label: 'Processing', value: 'PROCESSING' },
      { label: 'Late payment', value: 'LATE_PAYMENT' },
      { label: 'Prepayment', value: 'PREPAYMENT' },
      { label: 'Other', value: 'OTHER' }
    ]
  },
  {
    name: 'calculationMethod',
    label: 'Calculation',
    type: 'select',
    required: true,
    default: 'FLAT',
    wrapper: 'half',
    options: [
      { label: 'Flat amount', value: 'FLAT' },
      { label: 'Percentage', value: 'PERCENTAGE' }
    ]
  },
  { name: 'amount', type: 'number', required: true, min: 0, step: 0.01, hint: 'Flat $ or % depending on calculation method', wrapper: 'half' },
  {
    name: 'chargeTiming',
    label: 'Charged',
    type: 'select',
    required: true,
    default: 'UPFRONT',
    options: [
      { label: 'Upfront (application)', value: 'UPFRONT' },
      { label: 'On disbursement', value: 'ON_DISBURSEMENT' },
      { label: 'Recurring', value: 'RECURRING' }
    ]
  }
]

const showForm = ref(false)
const saving = ref(false)
const error = ref('')
const deleting = ref(false)
const confirmDeleteId = ref<number | null>(null)
const editingId = ref<number | null>(null)
const form = ref<Record<string, any>>({})

function openCreate() {
  editingId.value = null
  form.value = { name: '', type: undefined, calculationMethod: 'FLAT', amount: undefined, chargeTiming: 'UPFRONT' }
  error.value = ''
  showForm.value = true
}

function openEdit(row: LoanProductFeeResponse) {
  editingId.value = row.id
  form.value = {
    name: row.name,
    type: row.type,
    calculationMethod: row.calculationMethod,
    amount: row.amount,
    chargeTiming: row.chargeTiming
  }
  error.value = ''
  showForm.value = true
}

async function onSubmit(values: Record<string, any>) {
  saving.value = true
  error.value = ''
  try {
    const payload: LoanProductFeeRequest = {
      name: values.name,
      type: values.type,
      calculationMethod: values.calculationMethod,
      amount: values.amount,
      chargeTiming: values.chargeTiming
    }
    if (editingId.value) {
      await api(`/loan-products/${productId}/fees/${editingId.value}`, { method: 'PUT', body: payload })
      toast.add({ title: 'Fee updated', color: 'green' })
    } else {
      await api(`/loan-products/${productId}/fees`, { method: 'POST', body: payload })
      toast.add({ title: 'Fee added', color: 'green' })
    }
    showForm.value = false
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    saving.value = false
  }
}

async function onDelete() {
  if (confirmDeleteId.value === null) return
  deleting.value = true
  try {
    await api(`/loan-products/${productId}/fees/${confirmDeleteId.value}`, { method: 'DELETE' })
    toast.add({ title: 'Fee deleted', color: 'green' })
    confirmDeleteId.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    deleting.value = false
  }
}
</script>
