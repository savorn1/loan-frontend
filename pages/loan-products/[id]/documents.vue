<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">Required documents</span>
          <UButton v-if="isAdmin" size="xs" icon="i-heroicons-plus" @click="openCreate">Add document</UButton>
        </div>
      </template>

      <DataTable :rows="documents ?? []" :columns="columns" :loading="pending">
        <template #actions-data="{ row }">
          <div class="flex gap-1 justify-end">
            <UButton v-if="isAdmin" size="2xs" variant="soft" icon="i-heroicons-pencil" @click="openEdit(row)" />
            <UButton v-if="isAdmin" size="2xs" color="red" variant="soft" icon="i-heroicons-trash" @click="confirmDeleteId = row.id" />
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-document-check"
            title="No documents configured"
            description="List the documents applicants must provide for this loan product."
          >
            <template v-if="isAdmin" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">Add document</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>
    </UCard>

    <UModal v-model="showForm">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ editingId ? 'Edit document' : 'Add document' }}</span>
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
      title="Delete this document?"
      description="This removes it from the product's document checklist. This action cannot be undone."
      confirm-label="Delete"
      color="red"
      :loading="deleting"
      @update:model-value="(v: boolean) => { if (!v) confirmDeleteId = null }"
      @confirm="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { LoanProductDocumentRequest, LoanProductDocumentResponse } from '~/features/loan-products/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())

const productId = route.params.id as string

const { data: documents, pending, refresh } = await useAsyncData(
  `loan-product-${productId}-documents`,
  () => api<LoanProductDocumentResponse[]>(`/loan-products/${productId}/documents`)
)

const columns: ColumnDef<LoanProductDocumentResponse>[] = [
  { key: 'name' },
  { key: 'description' },
  { key: 'required', label: 'Status', type: 'boolean', trueLabel: 'Required', falseLabel: 'Optional', trueColor: 'orange', falseColor: 'gray' },
  { key: 'createdAt', label: 'Created', type: 'datetime' },
  { key: 'actions', label: '', class: 'text-right' }
]

const fields: FieldDef[] = [
  { name: 'name', required: true },
  { name: 'description', type: 'textarea' },
  { name: 'required', label: 'Required', type: 'switch', default: true }
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
  form.value = { name: '', description: '', required: true }
  error.value = ''
  showForm.value = true
}

function openEdit(row: LoanProductDocumentResponse) {
  editingId.value = row.id
  form.value = { name: row.name, description: row.description ?? '', required: row.required }
  error.value = ''
  showForm.value = true
}

async function onSubmit(values: Record<string, any>) {
  saving.value = true
  error.value = ''
  try {
    const payload: LoanProductDocumentRequest = {
      name: values.name,
      description: values.description || undefined,
      required: values.required
    }
    if (editingId.value) {
      await api(`/loan-products/${productId}/documents/${editingId.value}`, { method: 'PUT', body: payload })
      toast.add({ title: 'Document updated', color: 'green' })
    } else {
      await api(`/loan-products/${productId}/documents`, { method: 'POST', body: payload })
      toast.add({ title: 'Document added', color: 'green' })
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
    await api(`/loan-products/${productId}/documents/${confirmDeleteId.value}`, { method: 'DELETE' })
    toast.add({ title: 'Document deleted', color: 'green' })
    confirmDeleteId.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    deleting.value = false
  }
}
</script>
