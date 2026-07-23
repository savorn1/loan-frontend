<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">Interest rates</span>
          <UButton v-if="isAdmin" size="xs" icon="i-heroicons-plus" @click="openCreate">Add rate</UButton>
        </div>
      </template>

      <DataTable :rows="rates ?? []" :columns="columns" :loading="pending">
        <template #actions-data="{ row }">
          <div class="flex gap-1 justify-end">
            <UButton v-if="isAdmin" size="2xs" variant="soft" icon="i-heroicons-pencil" @click="openEdit(row)" />
            <UButton v-if="isAdmin" size="2xs" color="red" variant="soft" icon="i-heroicons-trash" @click="confirmDeleteId = row.id" />
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-percent-badge"
            title="No interest rates configured"
            description="Add a rate tier scoped to a term and amount range, with a validity window."
          >
            <template v-if="isAdmin" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">Add rate</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>
    </UCard>

    <UModal v-model="showForm">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ editingId ? 'Edit interest rate' : 'Add interest rate' }}</span>
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
      title="Delete this rate?"
      description="This removes the rate tier from the product. This action cannot be undone."
      confirm-label="Delete"
      color="red"
      :loading="deleting"
      @update:model-value="(v: boolean) => { if (!v) confirmDeleteId = null }"
      @confirm="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { LoanProductInterestRateRequest, LoanProductInterestRateResponse, LoanProductResponse } from '~/features/loan-products/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())

const productId = route.params.id as string

// Same useAsyncData key as the tab shell (pages/loan-products/[id].vue) — Nuxt
// dedupes the request so this doesn't refetch the product a second time.
const { data: product } = await useAsyncData(`loan-product-${productId}`, () =>
  api<LoanProductResponse>(`/loan-products/${productId}`)
)

const { data: rates, pending, refresh } = await useAsyncData(
  `loan-product-${productId}-interest-rates`,
  () => api<LoanProductInterestRateResponse[]>(`/loan-products/${productId}/interest-rates`)
)

const termUnitLabel = computed(() => (product.value?.termUnit ?? 'MONTH').toLowerCase() + 's')

const columns: ColumnDef<LoanProductInterestRateResponse>[] = [
  { key: 'minTerm', label: 'Term range', to: 'maxTerm', suffix: () => ` ${termUnitLabel.value}` },
  { key: 'minAmount', label: 'Amount range', type: 'currency', to: 'maxAmount' },
  { key: 'interestRate', label: 'Rate', type: 'percent' },
  { key: 'interestType', label: 'Type', type: 'badge', color: row => (row.interestType === 'FLAT' ? 'primary' : 'orange') },
  { key: 'effectiveFrom', label: 'Effective', type: 'date', to: 'effectiveTo', toEmpty: 'open' },
  { key: 'status', type: 'status' },
  { key: 'createdAt', label: 'Created', type: 'datetime' },
  { key: 'actions', label: '', class: 'text-right' }
]

const fields: FieldDef[] = [
  { name: 'minTerm', label: 'Min term', type: 'number', required: true, min: 1, wrapper: 'half' },
  { name: 'maxTerm', label: 'Max term', type: 'number', required: true, min: 1, wrapper: 'half' },
  { name: 'minAmount', label: 'Min amount', type: 'number', required: true, prefix: '$', min: 0, step: 0.01, wrapper: 'half' },
  { name: 'maxAmount', label: 'Max amount', type: 'number', required: true, prefix: '$', min: 0, step: 0.01, wrapper: 'half' },
  { name: 'interestRate', label: 'Interest rate', type: 'number', required: true, suffix: '%', min: 0.01, max: 100, step: 0.01, wrapper: 'half' },
  {
    name: 'interestType',
    label: 'Interest type',
    type: 'select',
    required: true,
    default: 'FLAT',
    wrapper: 'half',
    options: [
      { label: 'Flat', value: 'FLAT' },
      { label: 'Reducing', value: 'REDUCING' }
    ]
  },
  { name: 'effectiveFrom', label: 'Effective from', type: 'date', required: true, wrapper: 'half' },
  { name: 'effectiveTo', label: 'Effective to', type: 'date', hint: 'Optional — leave blank for open-ended', wrapper: 'half' },
  {
    name: 'status',
    type: 'select',
    required: true,
    default: 'ACTIVE',
    options: [
      { label: 'Active', value: 'ACTIVE' },
      { label: 'Inactive', value: 'INACTIVE' }
    ]
  }
]

const showForm = ref(false)
const saving = ref(false)
const error = ref('')
const deleting = ref(false)
const confirmDeleteId = ref<string | null>(null)
const editingId = ref<string | null>(null)
const form = ref<Record<string, any>>({})

function openCreate() {
  editingId.value = null
  form.value = {
    minTerm: undefined,
    maxTerm: undefined,
    minAmount: undefined,
    maxAmount: undefined,
    interestRate: undefined,
    interestType: 'FLAT',
    effectiveFrom: '',
    effectiveTo: '',
    status: 'ACTIVE'
  }
  error.value = ''
  showForm.value = true
}

function openEdit(row: LoanProductInterestRateResponse) {
  editingId.value = row.id
  form.value = {
    minTerm: row.minTerm,
    maxTerm: row.maxTerm,
    minAmount: row.minAmount,
    maxAmount: row.maxAmount,
    interestRate: row.interestRate,
    interestType: row.interestType,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo ?? '',
    status: row.status
  }
  error.value = ''
  showForm.value = true
}

async function onSubmit(values: Record<string, any>) {
  saving.value = true
  error.value = ''
  try {
    const payload: LoanProductInterestRateRequest = {
      minTerm: values.minTerm,
      maxTerm: values.maxTerm,
      minAmount: values.minAmount,
      maxAmount: values.maxAmount,
      interestRate: values.interestRate,
      interestType: values.interestType,
      effectiveFrom: values.effectiveFrom,
      effectiveTo: values.effectiveTo || undefined,
      status: values.status
    }
    if (editingId.value) {
      await api(`/loan-products/${productId}/interest-rates/${editingId.value}`, { method: 'PUT', body: payload })
      toast.add({ title: 'Interest rate updated', color: 'green' })
    } else {
      await api(`/loan-products/${productId}/interest-rates`, { method: 'POST', body: payload })
      toast.add({ title: 'Interest rate added', color: 'green' })
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
    await api(`/loan-products/${productId}/interest-rates/${confirmDeleteId.value}`, { method: 'DELETE' })
    toast.add({ title: 'Interest rate deleted', color: 'green' })
    confirmDeleteId.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    deleting.value = false
  }
}
</script>
