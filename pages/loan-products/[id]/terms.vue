<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">Terms</span>
          <UButton v-if="isAdmin" size="xs" icon="i-heroicons-plus" @click="openCreate">Add term</UButton>
        </div>
      </template>

      <DataTable :rows="terms ?? []" :columns="columns" :loading="pending">
        <template #actions-data="{ row }">
          <div class="flex gap-1 justify-end">
            <UButton v-if="isAdmin && !row.isDefault" size="2xs" variant="soft" :loading="settingDefault === row.id" @click="onSetDefault(row.id)">
              Set default
            </UButton>
            <UButton v-if="isAdmin" size="2xs" variant="soft" icon="i-heroicons-pencil" @click="openEdit(row)" />
            <UButton v-if="isAdmin" size="2xs" color="red" variant="soft" icon="i-heroicons-trash" @click="confirmDeleteId = row.id" />
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-calendar-days"
            title="No terms configured"
            description="Add the specific loan durations selectable within this product's min/max term range."
          >
            <template v-if="isAdmin" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">Add term</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>
    </UCard>

    <UModal v-model="showForm">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ editingId ? 'Edit term' : 'Add term' }}</span>
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
      title="Delete this term?"
      description="This removes the term option from the product. This action cannot be undone."
      confirm-label="Delete"
      color="red"
      :loading="deleting"
      @update:model-value="(v: boolean) => { if (!v) confirmDeleteId = null }"
      @confirm="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { LoanProductResponse, LoanProductTermRequest, LoanProductTermResponse } from '~/features/loan-products/types'
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

const { data: terms, pending, refresh } = await useAsyncData(
  `loan-product-${productId}-terms`,
  () => api<LoanProductTermResponse[]>(`/loan-products/${productId}/terms`)
)

const columns: ColumnDef<LoanProductTermResponse>[] = [
  { key: 'termValue', label: 'Term', suffix: row => ` ${termUnitLabel(row.termValue)}` },
  { key: 'isDefault', label: '', type: 'boolean', trueLabel: 'Default', falseLabel: '' },
  { key: 'createdAt', label: 'Created', type: 'datetime' },
  { key: 'actions', label: '', class: 'text-right' }
]

// Term values are interpreted using the parent product's termUnit (DAY/MONTH/YEAR).
function termUnitLabel(value: number) {
  const unit = (product.value?.termUnit ?? 'MONTH').toLowerCase()
  return value === 1 ? unit : `${unit}s`
}

const fields = computed<FieldDef[]>(() => [
  { name: 'termValue', label: `Term (${(product.value?.termUnit ?? 'MONTH').toLowerCase()}s)`, type: 'number', required: true, min: 1 },
  { name: 'isDefault', label: 'Set as default term', type: 'switch', default: false }
])

const showForm = ref(false)
const saving = ref(false)
const error = ref('')
const deleting = ref(false)
const settingDefault = ref<number | null>(null)
const confirmDeleteId = ref<number | null>(null)
const editingId = ref<number | null>(null)
const form = ref<Record<string, any>>({})

function openCreate() {
  editingId.value = null
  form.value = { termValue: undefined, isDefault: false }
  error.value = ''
  showForm.value = true
}

function openEdit(row: LoanProductTermResponse) {
  editingId.value = row.id
  form.value = { termValue: row.termValue, isDefault: row.isDefault }
  error.value = ''
  showForm.value = true
}

async function onSubmit(values: Record<string, any>) {
  saving.value = true
  error.value = ''
  try {
    const payload: LoanProductTermRequest = {
      termValue: values.termValue,
      isDefault: values.isDefault
    }
    if (editingId.value) {
      await api(`/loan-products/${productId}/terms/${editingId.value}`, { method: 'PUT', body: payload })
      toast.add({ title: 'Term updated', color: 'green' })
    } else {
      await api(`/loan-products/${productId}/terms`, { method: 'POST', body: payload })
      toast.add({ title: 'Term added', color: 'green' })
    }
    showForm.value = false
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    saving.value = false
  }
}

async function onSetDefault(id: number) {
  settingDefault.value = id
  try {
    await api(`/loan-products/${productId}/terms/${id}/set-default`, { method: 'PUT' })
    toast.add({ title: 'Default term updated', color: 'green' })
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    settingDefault.value = null
  }
}

async function onDelete() {
  if (confirmDeleteId.value === null) return
  deleting.value = true
  try {
    await api(`/loan-products/${productId}/terms/${confirmDeleteId.value}`, { method: 'DELETE' })
    toast.add({ title: 'Term deleted', color: 'green' })
    confirmDeleteId.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    deleting.value = false
  }
}
</script>
