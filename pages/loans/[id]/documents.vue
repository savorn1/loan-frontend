<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">Documents</span>
          <UButton v-if="isAdmin" size="xs" icon="i-heroicons-plus" @click="openCreate">Add document</UButton>
        </div>
      </template>

      <DataTable :rows="documents ?? []" :columns="columns" :loading="pending">
        <template #status-data="{ row }">
          <USelectMenu
            v-if="isAdmin"
            :model-value="row.status"
            :options="statusOptions"
            option-attribute="label"
            value-attribute="value"
            size="xs"
            @update:model-value="(status: LoanDocumentStatus) => onUpdateStatus(row.id, status)"
          >
            <template #label>
              <StatusBadge :status="row.status" />
            </template>
          </USelectMenu>
          <StatusBadge v-else :status="row.status" />
        </template>
        <template #actions-data="{ row }">
          <UButton v-if="isAdmin" size="2xs" color="red" variant="soft" icon="i-heroicons-trash" @click="confirmDeleteId = row.id" />
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-document-text"
            title="No documents tracked"
            description="Track the documents this applicant needs to submit and their verification status."
          >
            <template v-if="isAdmin" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">Add document</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">Add document</span>
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

    <ConfirmModal
      :model-value="confirmDeleteId !== null"
      title="Delete this document?"
      description="This removes it from the loan's document list. This action cannot be undone."
      confirm-label="Delete"
      color="red"
      :loading="deleting"
      @update:model-value="(v: boolean) => { if (!v) confirmDeleteId = null }"
      @confirm="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { LoanDocumentRequest, LoanDocumentResponse, LoanDocumentStatus } from '~/features/loans/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())

const loanId = route.params.id as string

const { data: documents, pending, refresh } = await useAsyncData(
  `loan-${loanId}-documents`,
  () => api<LoanDocumentResponse[]>(`/loans/${loanId}/documents`)
)

const columns: ColumnDef<LoanDocumentResponse>[] = [
  { key: 'name' },
  { key: 'status' },
  { key: 'notes' },
  { key: 'createdAt', label: 'Created', type: 'datetime' },
  { key: 'actions', label: '', class: 'text-right' }
]

const statusOptions: { label: string; value: LoanDocumentStatus }[] = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Verified', value: 'VERIFIED' },
  { label: 'Rejected', value: 'REJECTED' }
]

const fields: FieldDef[] = [
  { name: 'name', required: true },
  {
    name: 'status',
    type: 'select',
    required: true,
    default: 'PENDING',
    options: statusOptions
  },
  { name: 'notes', type: 'textarea' }
]

const showCreate = ref(false)
const creating = ref(false)
const error = ref('')
const deleting = ref(false)
const confirmDeleteId = ref<number | null>(null)
const createForm = ref<Record<string, any>>({})

function openCreate() {
  createForm.value = { name: '', status: 'PENDING', notes: '' }
  error.value = ''
  showCreate.value = true
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    const payload: LoanDocumentRequest = {
      name: values.name,
      status: values.status,
      notes: values.notes || undefined
    }
    await api(`/loans/${loanId}/documents`, { method: 'POST', body: payload })
    toast.add({ title: 'Document added', color: 'green' })
    showCreate.value = false
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}

async function onUpdateStatus(id: number, status: LoanDocumentStatus) {
  try {
    await api(`/loans/${loanId}/documents/${id}/status`, { method: 'PUT', body: { status } })
    toast.add({ title: 'Document status updated', color: 'green' })
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  }
}

async function onDelete() {
  if (confirmDeleteId.value === null) return
  deleting.value = true
  try {
    await api(`/loans/${loanId}/documents/${confirmDeleteId.value}`, { method: 'DELETE' })
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
