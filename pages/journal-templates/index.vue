<template>
  <div>
    <PageHeader title="Journal Templates" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">New Journal Template</UButton>
      </template>
    </PageHeader>

    <UCard>
      <DataTable v-model:sort="sort" :rows="rows" :columns="columns" :loading="pending">
        <template #actions-data="{ row }">
          <div class="flex gap-1 justify-end">
            <UButton size="2xs" variant="soft" icon="i-heroicons-pencil" @click="openEdit(row)" />
            <UButton
              size="2xs"
              color="red"
              variant="soft"
              icon="i-heroicons-trash"
              @click="confirmDelete = row"
            />
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-document-text"
            title="No journal templates yet"
            description="Define the debit/credit legs that fire for a transaction type — e.g. every DISBURSEMENT debits Loan Receivable and credits Cash."
          >
            <template #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">New Journal Template</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model="showCreate" :ui="{ width: 'sm:max-w-2xl' }">
      <UCard>
        <template #header>
          <span class="font-semibold">New Journal Template</span>
        </template>
        <UForm :state="createForm" class="space-y-4" @submit="onCreate">
          <JournalTemplateFields v-model="createForm" />
          <UAlert v-if="error" color="red" variant="subtle" :title="error" />
          <div class="flex justify-end gap-2 pt-2">
            <UButton color="gray" variant="ghost" @click="showCreate = false">Cancel</UButton>
            <UButton type="submit" :loading="creating">Create</UButton>
          </div>
        </UForm>
      </UCard>
    </UModal>

    <UModal v-model="showEdit" :ui="{ width: 'sm:max-w-2xl' }">
      <UCard>
        <template #header>
          <span class="font-semibold">Edit Journal Template</span>
        </template>
        <UForm :state="editForm" class="space-y-4" @submit="onEdit">
          <JournalTemplateFields v-model="editForm" />
          <UAlert v-if="editError" color="red" variant="subtle" :title="editError" />
          <div class="flex justify-end gap-2 pt-2">
            <UButton color="gray" variant="ghost" @click="showEdit = false">Cancel</UButton>
            <UButton type="submit" :loading="editing">Save changes</UButton>
          </div>
        </UForm>
      </UCard>
    </UModal>

    <ConfirmModal
      :model-value="confirmDelete !== null"
      title="Delete this journal template?"
      description="This permanently removes the template and its lines and cannot be undone."
      confirm-label="Delete"
      color="red"
      :loading="deleting"
      @update:model-value="
        (v: boolean) => {
          if (!v) confirmDelete = null
        }
      "
      @confirm="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type {
  JournalTemplateLineRequest,
  JournalTemplateRequest,
  JournalTemplateResponse,
  TransactionType
} from '~/features/accounting/types'
import type { ColumnDef } from '~/shared/types'

// Structurally matches JournalTemplateFields.vue's own model type — kept as a
// plain (non-exported) interface here since <script setup> can't export runtime
// bindings and duplicating a 6-field shape is cheaper than a type-export workaround.
interface JournalTemplateFormValue {
  code: string
  name: string
  transactionType: TransactionType | undefined
  description: string
  status: 'ACTIVE' | 'INACTIVE'
  lines: JournalTemplateLineRequest[]
}

const api = useApi()
const toast = useToast()

const {
  data: templates,
  pending,
  refresh
} = await useAsyncData('journal-templates', () =>
  api<JournalTemplateResponse[]>('/journal-templates')
)

const columns: ColumnDef<JournalTemplateResponse>[] = [
  { key: 'code', sortable: true },
  { key: 'name', sortable: true },
  { key: 'transactionType', label: 'Transaction type', type: 'enum', sortable: true },
  { key: 'lines', label: 'Lines', value: (row) => row.lines.length },
  { key: 'status', type: 'status', sortable: true },
  { key: 'actions', label: '', class: 'text-right' }
]

const { page, pageSize, sort, total, rows } = useClientTable(templates, { pageSize: 10 })

const totalLabel = computed(() => {
  const count = templates.value?.length ?? 0
  return count === 1 ? '1 journal template' : `${count} journal templates`
})

function emptyForm(): JournalTemplateFormValue {
  return {
    code: '',
    name: '',
    transactionType: undefined,
    description: '',
    status: 'ACTIVE',
    lines: [
      { lineNo: 1, accountRole: '', entrySide: 'DEBIT', description: '' },
      { lineNo: 2, accountRole: '', entrySide: 'CREDIT', description: '' }
    ]
  }
}

function toPayload(values: JournalTemplateFormValue): JournalTemplateRequest {
  return {
    code: values.code,
    name: values.name,
    transactionType: values.transactionType!,
    description: values.description || undefined,
    status: values.status,
    lines: values.lines.map((l, i) => ({ ...l, lineNo: i + 1 }))
  }
}

const showCreate = ref(false)
const creating = ref(false)
const error = ref('')
const createForm = ref<JournalTemplateFormValue>(emptyForm())

function openCreate() {
  createForm.value = emptyForm()
  error.value = ''
  showCreate.value = true
}

async function onCreate() {
  creating.value = true
  error.value = ''
  try {
    await api('/journal-templates', { method: 'POST', body: toPayload(createForm.value) })
    toast.add({ title: 'Journal template created', color: 'green' })
    showCreate.value = false
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}

const showEdit = ref(false)
const editing = ref(false)
const editError = ref('')
const editingId = ref<number | null>(null)
const editForm = ref<JournalTemplateFormValue>(emptyForm())

function openEdit(row: JournalTemplateResponse) {
  editingId.value = row.id
  editForm.value = {
    code: row.code,
    name: row.name,
    transactionType: row.transactionType,
    description: row.description ?? '',
    status: row.status,
    lines: row.lines.length
      ? row.lines.map((l) => ({
          lineNo: l.lineNo,
          accountRole: l.accountRole,
          entrySide: l.entrySide,
          description: l.description ?? ''
        }))
      : emptyForm().lines
  }
  editError.value = ''
  showEdit.value = true
}

async function onEdit() {
  if (editingId.value === null) return
  editing.value = true
  editError.value = ''
  try {
    await api(`/journal-templates/${editingId.value}`, {
      method: 'PUT',
      body: toPayload(editForm.value)
    })
    toast.add({ title: 'Journal template updated', color: 'green' })
    showEdit.value = false
    await refresh()
  } catch (err) {
    editError.value = apiErrorMessage(err)
  } finally {
    editing.value = false
  }
}

const deleting = ref(false)
const confirmDelete = ref<JournalTemplateResponse | null>(null)

async function onDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await api(`/journal-templates/${confirmDelete.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Journal template deleted', color: 'green' })
    confirmDelete.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    deleting.value = false
  }
}
</script>
