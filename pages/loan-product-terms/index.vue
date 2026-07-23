<template>
  <div>
    <PageHeader title="Loan Product Terms" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">Assign Term</UButton>
      </template>
    </PageHeader>

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search by product or term..."
          class="max-w-xs"
        >
          <template v-if="search" #trailing>
            <UButton color="gray" variant="link" icon="i-heroicons-x-mark" :padded="false" @click="search = ''" />
          </template>
        </UInput>
      </template>

      <DataTable :rows="rows" :columns="columns" :loading="pending" v-model:sort="sort">
        <template #actions-data="{ row }">
          <div class="flex gap-1 justify-end">
            <UButton
              v-if="!row.isDefault"
              size="2xs"
              variant="soft"
              icon="i-heroicons-star"
              title="Set as default"
              @click="onSetDefault(row)"
            />
            <UButton size="2xs" variant="soft" icon="i-heroicons-pencil" @click="openEdit(row)" />
            <UButton size="2xs" color="red" variant="soft" icon="i-heroicons-trash" @click="confirmDelete = row" />
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            :icon="search ? 'i-heroicons-magnifying-glass' : 'i-heroicons-clock'"
            :title="search ? 'No matches' : 'No term assignments yet'"
            :description="search ? `Nothing matches “${search}”.` : 'Assign a reusable term template to a loan product.'"
          >
            <template v-if="!search" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">Assign Term</UButton>
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
          <span class="font-semibold">Assign Term</span>
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
          <span class="font-semibold">Edit Term Assignment</span>
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
      description="This removes the term from the loan product. This action cannot be undone."
      confirm-label="Remove"
      color="red"
      :loading="deleting"
      @update:model-value="(v: boolean) => { if (!v) confirmDelete = null }"
      @confirm="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type {
  LoanProductTermRequest,
  LoanProductTermResponse,
  LoanProductResponse
} from '~/features/loan-products/types'
import type { TermTemplateResponse } from '~/features/loan-configuration/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const api = useApi()
const toast = useToast()

const { data: terms, pending, refresh } = await useAsyncData('loan-product-terms', () =>
  api<LoanProductTermResponse[]>('/loan-products/terms')
)
const { data: products } = await useAsyncData('loan-product-terms-products', () =>
  api<LoanProductResponse[]>('/loan-products')
)
const { data: templates } = await useAsyncData('loan-product-terms-templates', () =>
  api<TermTemplateResponse[]>('/term-templates')
)

const productMap = computed(() => new Map((products.value ?? []).map(p => [p.id, p])))
function productLabel(id: string) {
  const p = productMap.value.get(id)
  return p ? `${p.name} (${p.code})` : id
}

const productOptions = computed(() => (products.value ?? []).map(p => ({ label: `${p.name} (${p.code})`, value: p.id })))
const templateOptions = computed(() => (templates.value ?? []).map(t => ({ label: `${t.name} (${t.code}) — ${t.termValue}`, value: t.id })))

const columns: ColumnDef<LoanProductTermResponse>[] = [
  { key: 'loanProductId', label: 'Loan product', value: row => productLabel(row.loanProductId) },
  { key: 'termTemplateName', label: 'Term', value: row => `${row.termTemplateName} (${row.termTemplateCode}) — ${row.termValue}` },
  { key: 'isDefault', label: 'Default', type: 'boolean', trueLabel: 'Default', falseLabel: '', trueColor: 'teal' },
  { key: 'status', type: 'status', sortable: true },
  { key: 'actions', label: '', class: 'text-right' }
]

const { search, page, pageSize, sort, total, rows } = useClientTable(
  computed(() => (terms.value ?? []).map(t => ({ ...t, searchLabel: `${productLabel(t.loanProductId)} ${t.termTemplateName} ${t.termTemplateCode}` }))),
  { searchFields: ['searchLabel'], pageSize: 15 }
)

const totalLabel = computed(() => {
  const count = terms.value?.length ?? 0
  return count === 1 ? '1 assignment' : `${count} assignments`
})

// Shared by both forms; create additionally picks the owning loan product
// (fixed for the lifetime of the assignment — it's the path param, not part
// of the request body, so it isn't editable afterwards).
const commonFields: FieldDef[] = [
  { name: 'isDefault', label: 'Default term for this product', type: 'switch', wrapper: 'half' },
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
  { name: 'loanProductId', label: 'Loan product', type: 'select', required: true, wrapper: 'half', options: productOptions.value },
  { name: 'termTemplateId', label: 'Term template', type: 'select', required: true, wrapper: 'half', options: templateOptions.value },
  ...commonFields
])

const editFields = computed<FieldDef[]>(() => [
  { name: 'termTemplateId', label: 'Term template', type: 'select', required: true, wrapper: 'half', options: templateOptions.value },
  ...commonFields
])

const showCreate = ref(false)
const creating = ref(false)
const error = ref('')
const createForm = ref<Record<string, any>>({})

function openCreate() {
  createForm.value = {
    loanProductId: undefined,
    termTemplateId: undefined,
    isDefault: false,
    status: 'ACTIVE'
  }
  error.value = ''
  showCreate.value = true
}

function toPayload(values: Record<string, any>): LoanProductTermRequest {
  return {
    termTemplateId: values.termTemplateId,
    isDefault: values.isDefault ?? false,
    status: values.status
  }
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    await api(`/loan-products/${values.loanProductId}/terms`, { method: 'POST', body: toPayload(values) })
    toast.add({ title: 'Term assigned', color: 'green' })
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
const editingRow = ref<LoanProductTermResponse | null>(null)
const editForm = ref<Record<string, any>>({})

function openEdit(row: LoanProductTermResponse) {
  editingRow.value = row
  editForm.value = {
    termTemplateId: row.termTemplateId,
    isDefault: row.isDefault,
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
    await api(`/loan-products/${editingRow.value.loanProductId}/terms/${editingRow.value.id}`, {
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

async function onSetDefault(row: LoanProductTermResponse) {
  try {
    await api(`/loan-products/${row.loanProductId}/terms/${row.id}/set-default`, { method: 'PUT' })
    toast.add({ title: 'Default term updated', color: 'green' })
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  }
}

const deleting = ref(false)
const confirmDelete = ref<LoanProductTermResponse | null>(null)

async function onDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await api(`/loan-products/${confirmDelete.value.loanProductId}/terms/${confirmDelete.value.id}`, { method: 'DELETE' })
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
