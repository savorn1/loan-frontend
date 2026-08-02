<template>
  <div>
    <PageHeader :title="t('loanConfig.loanProductTerms.title')" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">{{
          t('loanConfig.loanProductTerms.assignTerm')
        }}</UButton>
      </template>
    </PageHeader>

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          :placeholder="t('loanConfig.loanProductTerms.searchPlaceholder')"
          class="max-w-xs"
        >
          <template v-if="search" #trailing>
            <UButton
              color="gray"
              variant="link"
              icon="i-heroicons-x-mark"
              :aria-label="t('common.clearSearch')"
              :padded="false"
              @click="search = ''"
            />
          </template>
        </UInput>
      </template>

      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable v-model:sort="sort" :rows="rows" :columns="columns" :loading="pending">
        <template #actions-data="{ row }">
          <div class="flex gap-1 justify-end">
            <UButton
              v-if="!row.isDefault"
              size="2xs"
              variant="soft"
              icon="i-heroicons-star"
              :title="t('loanConfig.shared.setAsDefault')"
              :aria-label="t('loanConfig.shared.setAsDefault')"
              @click="onSetDefault(row)"
            />
            <UButton size="2xs" variant="soft" icon="i-heroicons-pencil" :aria-label="t('common.edit')" @click="openEdit(row)" />
            <UButton
              size="2xs"
              color="red"
              variant="soft"
              icon="i-heroicons-trash"
              :aria-label="t('common.delete')"
              @click="confirmDelete = row"
            />
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            :icon="search ? 'i-heroicons-magnifying-glass' : 'i-heroicons-clock'"
            :title="search ? t('common.noMatches') : t('loanConfig.loanProductTerms.emptyTitle')"
            :description="
              search
                ? t('common.nothingMatches', { query: search })
                : t('loanConfig.loanProductTerms.emptyDescription')
            "
          >
            <template v-if="!search" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">{{
                t('loanConfig.loanProductTerms.assignTerm')
              }}</UButton>
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
          <span class="font-semibold">{{ t('loanConfig.loanProductTerms.assignTerm') }}</span>
        </template>
        <DynamicForm
          v-model="createForm"
          :fields="createFields"
          :loading="creating"
          :error="error"
          :submit-label="t('loanConfig.shared.assign')"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </UCard>
    </UModal>

    <UModal v-model="showEdit">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('loanConfig.loanProductTerms.editHeader') }}</span>
        </template>
        <DynamicForm
          v-model="editForm"
          :fields="editFields"
          :loading="editing"
          :error="editError"
          :submit-label="t('common.saveChanges')"
          cancelable
          @submit="onEdit"
          @cancel="showEdit = false"
        />
      </UCard>
    </UModal>

    <ConfirmModal
      :model-value="confirmDelete !== null"
      :title="t('loanConfig.shared.removeConfirmTitle')"
      :description="t('loanConfig.loanProductTerms.removeDescription')"
      :confirm-label="t('loanConfig.shared.removeLabel')"
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
  LoanProductTermRequest,
  LoanProductTermResponse,
  LoanProductResponse
} from '~/features/loan-products/types'
import type { TermTemplateResponse } from '~/features/loan-configuration/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const api = useApi()
const toast = useToast()
const { t } = useI18n()

const {
  data: terms,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData('loan-product-terms', () =>
  api<LoanProductTermResponse[]>('/loan-products/terms')
)
const { data: products } = await useAsyncData('loan-product-terms-products', () =>
  api<LoanProductResponse[]>('/loan-products')
)
const { data: templates } = await useAsyncData('loan-product-terms-templates', () =>
  api<TermTemplateResponse[]>('/term-templates')
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
  (templates.value ?? []).map((t) => ({
    label: `${t.name} (${t.code}) — ${t.termValue}`,
    value: t.id
  }))
)

const columns = computed<ColumnDef<LoanProductTermResponse>[]>(() => [
  {
    key: 'loanProductId',
    label: t('loanConfig.shared.loanProductColumn'),
    value: (row) => productLabel(row.loanProductId)
  },
  {
    key: 'termTemplateName',
    label: t('loanConfig.loanProductTerms.termColumn'),
    value: (row) => `${row.termTemplateName} (${row.termTemplateCode}) — ${row.termValue}`
  },
  {
    key: 'isDefault',
    label: t('loanConfig.shared.defaultLabel'),
    type: 'boolean',
    trueLabel: t('loanConfig.shared.defaultLabel'),
    falseLabel: '',
    trueColor: 'teal'
  },
  { key: 'status', label: t('loanConfig.shared.statusColumn'), type: 'status', sortable: true },
  { key: 'actions', label: '', class: 'text-right' }
])

const { search, page, pageSize, sort, total, rows } = useClientTable(
  computed(() =>
    (terms.value ?? []).map((t) => ({
      ...t,
      searchLabel: `${productLabel(t.loanProductId)} ${t.termTemplateName} ${t.termTemplateCode}`
    }))
  ),
  { searchFields: ['searchLabel'], pageSize: 15 }
)

const totalLabel = computed(() => {
  const count = terms.value?.length ?? 0
  return count === 1
    ? t('loanConfig.loanProductTerms.total.one')
    : t('loanConfig.loanProductTerms.total.other', { count })
})

// Shared by both forms; create additionally picks the owning loan product
// (fixed for the lifetime of the assignment — it's the path param, not part
// of the request body, so it isn't editable afterwards).
const commonFields = computed<FieldDef[]>(() => [
  {
    name: 'isDefault',
    label: t('loanConfig.loanProductTerms.defaultTermFieldLabel'),
    type: 'switch',
    wrapper: 'half'
  },
  {
    name: 'status',
    label: t('loanConfig.shared.statusColumn'),
    type: 'select',
    required: true,
    default: 'ACTIVE',
    wrapper: 'half',
    options: [
      { label: t('common.active'), value: 'ACTIVE' },
      { label: t('common.inactive'), value: 'INACTIVE' }
    ]
  }
])

const createFields = computed<FieldDef[]>(() => [
  {
    name: 'loanProductId',
    label: t('loanConfig.shared.loanProductColumn'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: productOptions.value
  },
  {
    name: 'termTemplateId',
    label: t('loanConfig.loanProductTerms.termTemplateFieldLabel'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: templateOptions.value
  },
  ...commonFields.value
])

const editFields = computed<FieldDef[]>(() => [
  {
    name: 'termTemplateId',
    label: t('loanConfig.loanProductTerms.termTemplateFieldLabel'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: templateOptions.value
  },
  ...commonFields.value
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
    await api(`/loan-products/${values.loanProductId}/terms`, {
      method: 'POST',
      body: toPayload(values)
    })
    toast.add({ title: t('loanConfig.loanProductTerms.termAssignedToast'), color: 'green' })
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
    toast.add({ title: t('loanConfig.shared.assignmentUpdated'), color: 'green' })
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
    toast.add({ title: t('loanConfig.loanProductTerms.setDefaultToast'), color: 'green' })
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
    await api(
      `/loan-products/${confirmDelete.value.loanProductId}/terms/${confirmDelete.value.id}`,
      { method: 'DELETE' }
    )
    toast.add({ title: t('loanConfig.shared.assignmentRemoved'), color: 'green' })
    confirmDelete.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    deleting.value = false
  }
}
</script>
