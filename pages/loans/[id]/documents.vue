<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">{{ t('loans.documents.title') }}</span>
          <UButton v-if="isAdmin" size="xs" icon="i-heroicons-plus" @click="openCreate"
            >{{ t('loans.documents.add') }}</UButton
          >
        </div>
      </template>

      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

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
          <UButton
            v-if="isAdmin"
            size="2xs"
            color="red"
            variant="soft"
            icon="i-heroicons-trash"
            :aria-label="t('common.delete')"
            @click="confirmDeleteId = row.id"
          />
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-document-text"
            :title="t('loans.documents.empty.title')"
            :description="t('loans.documents.empty.description')"
          >
            <template v-if="isAdmin" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">{{ t('loans.documents.add') }}</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('loans.documents.add') }}</span>
        </template>
        <DynamicForm
          v-model="createForm"
          :fields="fields"
          :loading="creating"
          :error="error"
          :submit-label="t('loans.documents.submit')"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </UCard>
    </UModal>

    <ConfirmModal
      :model-value="confirmDeleteId !== null"
      :title="t('loans.documents.confirmDelete.title')"
      :description="t('loans.documents.confirmDelete.description')"
      :confirm-label="t('common.delete')"
      color="red"
      :loading="deleting"
      @update:model-value="
        (v: boolean) => {
          if (!v) confirmDeleteId = null
        }
      "
      @confirm="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type {
  LoanDocumentRequest,
  LoanDocumentResponse,
  LoanDocumentStatus
} from '~/features/loans/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())
const { t } = useI18n()

const loanId = route.params.id as string

const {
  data: documents,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData(`loan-${loanId}-documents`, () =>
  api<LoanDocumentResponse[]>(`/loans/${loanId}/documents`)
)

const columns = computed<ColumnDef<LoanDocumentResponse>[]>(() => [
  { key: 'name', label: t('loans.documents.columns.name') },
  { key: 'status', label: t('loans.documents.columns.status') },
  { key: 'notes', label: t('loans.documents.columns.notes') },
  { key: 'createdAt', label: t('loans.documents.columns.created'), type: 'datetime' },
  { key: 'actions', label: t('loans.documents.columns.actions'), class: 'text-right' }
])

const statusOptions = computed<{ label: string; value: LoanDocumentStatus }[]>(() => [
  { label: t('loans.documents.statusOptions.pending'), value: 'PENDING' },
  { label: t('loans.documents.statusOptions.submitted'), value: 'SUBMITTED' },
  { label: t('loans.documents.statusOptions.verified'), value: 'VERIFIED' },
  { label: t('loans.documents.statusOptions.rejected'), value: 'REJECTED' }
])

const fields = computed<FieldDef[]>(() => [
  { name: 'name', label: t('loans.documents.fields.name'), required: true },
  {
    name: 'status',
    label: t('loans.documents.fields.status'),
    type: 'select',
    required: true,
    default: 'PENDING',
    options: statusOptions.value
  },
  { name: 'notes', label: t('loans.documents.fields.notes'), type: 'textarea' }
])

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
    toast.add({ title: t('loans.documents.toast.added'), color: 'green' })
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
    toast.add({ title: t('loans.documents.toast.statusUpdated'), color: 'green' })
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
    toast.add({ title: t('loans.documents.toast.deleted'), color: 'green' })
    confirmDeleteId.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    deleting.value = false
  }
}
</script>
