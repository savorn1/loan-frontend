<template>
  <div>
    <PageHeader title="Loan Product Documents" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">Assign Document</UButton>
      </template>
    </PageHeader>

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search by product or document..."
          class="max-w-xs"
        >
          <template v-if="search" #trailing>
            <UButton
              color="gray"
              variant="link"
              icon="i-heroicons-x-mark"
              :padded="false"
              @click="search = ''"
            />
          </template>
        </UInput>
      </template>

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
            :icon="search ? 'i-heroicons-magnifying-glass' : 'i-heroicons-document-check'"
            :title="search ? 'No matches' : 'No document assignments yet'"
            :description="
              search
                ? `Nothing matches “${search}”.`
                : 'Assign a reusable document template to a loan product\'s checklist.'
            "
          >
            <template v-if="!search" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">Assign Document</UButton>
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
          <span class="font-semibold">Assign Document</span>
        </template>
        <DynamicForm
          v-model="createForm"
          :fields="createFields"
          :loading="creating"
          :error="error"
          submit-label="Assign"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </UCard>
    </UModal>

    <UModal v-model="showEdit">
      <UCard>
        <template #header>
          <span class="font-semibold">Edit Document Assignment</span>
        </template>
        <DynamicForm
          v-model="editForm"
          :fields="editFields"
          :loading="editing"
          :error="editError"
          submit-label="Save changes"
          cancelable
          @submit="onEdit"
          @cancel="showEdit = false"
        />
      </UCard>
    </UModal>

    <ConfirmModal
      :model-value="confirmDelete !== null"
      title="Remove this assignment?"
      description="This removes the document from the loan product's checklist. This action cannot be undone."
      confirm-label="Remove"
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
  LoanProductDocumentRequest,
  LoanProductDocumentResponse,
  LoanProductResponse
} from '~/features/loan-products/types'
import type { DocumentTemplateResponse } from '~/features/loan-configuration/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const api = useApi()
const toast = useToast()

const {
  data: documents,
  pending,
  refresh
} = await useAsyncData('loan-product-documents', () =>
  api<LoanProductDocumentResponse[]>('/loan-products/documents')
)
const { data: products } = await useAsyncData('loan-product-documents-products', () =>
  api<LoanProductResponse[]>('/loan-products')
)
const { data: templates } = await useAsyncData('loan-product-documents-templates', () =>
  api<DocumentTemplateResponse[]>('/document-templates')
)

const productMap = computed(() => new Map((products.value ?? []).map((p) => [p.id, p])))
function productLabel(id: string) {
  const p = productMap.value.get(id)
  return p ? `${p.name} (${p.code})` : id
}

const productOptions = computed(() =>
  (products.value ?? []).map((p) => ({ label: `${p.name} (${p.code})`, value: p.id }))
)
const templateOptions = computed(() =>
  (templates.value ?? []).map((t) => ({ label: `${t.name} (${t.code})`, value: t.id }))
)

const columns: ColumnDef<LoanProductDocumentResponse>[] = [
  { key: 'loanProductId', label: 'Loan product', value: (row) => productLabel(row.loanProductId) },
  {
    key: 'documentTemplateName',
    label: 'Document',
    value: (row) => `${row.documentTemplateName} (${row.documentTemplateCode})`
  },
  {
    key: 'required',
    label: 'Required',
    type: 'boolean',
    trueLabel: 'Required',
    falseLabel: 'Optional',
    trueColor: 'teal',
    falseColor: 'gray'
  },
  { key: 'status', type: 'status', sortable: true },
  { key: 'actions', label: '', class: 'text-right' }
]

const { search, page, pageSize, sort, total, rows } = useClientTable(
  computed(() =>
    (documents.value ?? []).map((d) => ({
      ...d,
      searchLabel: `${productLabel(d.loanProductId)} ${d.documentTemplateName} ${d.documentTemplateCode}`
    }))
  ),
  { searchFields: ['searchLabel'], pageSize: 15 }
)

const totalLabel = computed(() => {
  const count = documents.value?.length ?? 0
  return count === 1 ? '1 assignment' : `${count} assignments`
})

// Shared by both forms; create additionally picks the owning loan product
// (fixed for the lifetime of the assignment — it's the path param, not part
// of the request body, so it isn't editable afterwards).
const commonFields: FieldDef[] = [
  { name: 'required', label: 'Required', type: 'switch', wrapper: 'half' },
  {
    name: 'status',
    type: 'select',
    required: true,
    default: 'ACTIVE',
    wrapper: 'half',
    options: [
      { label: 'Active', value: 'ACTIVE' },
      { label: 'Inactive', value: 'INACTIVE' }
    ]
  }
]

const createFields = computed<FieldDef[]>(() => [
  {
    name: 'loanProductId',
    label: 'Loan product',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: productOptions.value
  },
  {
    name: 'documentTemplateId',
    label: 'Document template',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: templateOptions.value
  },
  ...commonFields
])

const editFields = computed<FieldDef[]>(() => [
  {
    name: 'documentTemplateId',
    label: 'Document template',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: templateOptions.value
  },
  ...commonFields
])

const showCreate = ref(false)
const creating = ref(false)
const error = ref('')
const createForm = ref<Record<string, any>>({})

function openCreate() {
  createForm.value = {
    loanProductId: undefined,
    documentTemplateId: undefined,
    required: true,
    status: 'ACTIVE'
  }
  error.value = ''
  showCreate.value = true
}

function toPayload(values: Record<string, any>): LoanProductDocumentRequest {
  return {
    documentTemplateId: values.documentTemplateId,
    required: values.required ?? false,
    status: values.status
  }
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    await api(`/loan-products/${values.loanProductId}/documents`, {
      method: 'POST',
      body: toPayload(values)
    })
    toast.add({ title: 'Document assigned', color: 'green' })
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
const editingRow = ref<LoanProductDocumentResponse | null>(null)
const editForm = ref<Record<string, any>>({})

function openEdit(row: LoanProductDocumentResponse) {
  editingRow.value = row
  editForm.value = {
    documentTemplateId: row.documentTemplateId,
    required: row.required,
    status: row.status
  }
  editError.value = ''
  showEdit.value = true
}

async function onEdit(values: Record<string, any>) {
  if (!editingRow.value) return
  editing.value = true
  editError.value = ''
  try {
    await api(`/loan-products/${editingRow.value.loanProductId}/documents/${editingRow.value.id}`, {
      method: 'PUT',
      body: toPayload(values)
    })
    toast.add({ title: 'Assignment updated', color: 'green' })
    showEdit.value = false
    await refresh()
  } catch (err) {
    editError.value = apiErrorMessage(err)
  } finally {
    editing.value = false
  }
}

const deleting = ref(false)
const confirmDelete = ref<LoanProductDocumentResponse | null>(null)

async function onDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await api(
      `/loan-products/${confirmDelete.value.loanProductId}/documents/${confirmDelete.value.id}`,
      { method: 'DELETE' }
    )
    toast.add({ title: 'Assignment removed', color: 'green' })
    confirmDelete.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    deleting.value = false
  }
}
</script>
