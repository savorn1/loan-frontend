<template>
  <div>
    <PageHeader :title="t('loanConfig.loanProductInterestSchemes.title')" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">{{
          t('loanConfig.loanProductInterestSchemes.assignInterestScheme')
        }}</UButton>
      </template>
    </PageHeader>

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          :placeholder="t('loanConfig.loanProductInterestSchemes.searchPlaceholder')"
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
            :icon="search ? 'i-heroicons-magnifying-glass' : 'i-heroicons-chart-bar-square'"
            :title="search ? t('common.noMatches') : t('loanConfig.loanProductInterestSchemes.emptyTitle')"
            :description="
              search
                ? t('common.nothingMatches', { query: search })
                : t('loanConfig.loanProductInterestSchemes.emptyDescription')
            "
          >
            <template v-if="!search" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">{{
                t('loanConfig.loanProductInterestSchemes.assignInterestScheme')
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
          <span class="font-semibold">{{
            t('loanConfig.loanProductInterestSchemes.assignInterestScheme')
          }}</span>
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
          <span class="font-semibold">{{ t('loanConfig.loanProductInterestSchemes.editHeader') }}</span>
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
      :description="t('loanConfig.loanProductInterestSchemes.removeDescription')"
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
  LoanProductInterestSchemeRequest,
  LoanProductInterestSchemeResponse,
  LoanProductResponse
} from '~/features/loan-products/types'
import type { InterestSchemeResponse } from '~/features/loan-configuration/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const api = useApi()
const toast = useToast()
const { t } = useI18n()

const {
  data: mappings,
  pending,
  refresh
} = await useAsyncData('loan-product-interest-schemes', () =>
  api<LoanProductInterestSchemeResponse[]>('/loan-products/interest-schemes')
)
const { data: products } = await useAsyncData('loan-product-interest-schemes-products', () =>
  api<LoanProductResponse[]>('/loan-products')
)
const { data: schemes } = await useAsyncData('loan-product-interest-schemes-schemes', () =>
  api<InterestSchemeResponse[]>('/interest-schemes')
)

const productMap = computed(() => new Map((products.value ?? []).map((p) => [p.id, p])))
function productLabel(id: string) {
  const p = productMap.value.get(id)
  return p ? `${p.name} (${p.code})` : id
}

const productOptions = computed(() =>
  (products.value ?? []).map((p) => ({ label: `${p.name} (${p.code})`, value: p.id }))
)
const schemeOptions = computed(() =>
  (schemes.value ?? []).map((s) => ({ label: `${s.name} (${s.code})`, value: s.id }))
)

const columns = computed<ColumnDef<LoanProductInterestSchemeResponse>[]>(() => [
  {
    key: 'loanProductId',
    label: t('loanConfig.shared.loanProductColumn'),
    value: (row) => productLabel(row.loanProductId)
  },
  {
    key: 'interestSchemeName',
    label: t('loanConfig.loanProductInterestSchemes.interestSchemeColumn'),
    value: (row) => `${row.interestSchemeName} (${row.interestSchemeCode})`
  },
  { key: 'priority', label: t('loanConfig.shared.priorityColumn'), sortable: true },
  {
    key: 'isDefault',
    label: t('loanConfig.shared.defaultLabel'),
    type: 'boolean',
    trueLabel: t('loanConfig.shared.defaultLabel'),
    falseLabel: '',
    trueColor: 'teal'
  },
  {
    key: 'effectiveFrom',
    label: t('loanConfig.shared.effectiveColumn'),
    type: 'date',
    to: 'effectiveTo',
    toEmpty: t('loanConfig.shared.openEnded')
  },
  { key: 'status', label: t('loanConfig.shared.statusColumn'), type: 'status', sortable: true },
  { key: 'actions', label: '', class: 'text-right' }
])

const { search, page, pageSize, sort, total, rows } = useClientTable(
  computed(() =>
    (mappings.value ?? []).map((m) => ({
      ...m,
      searchLabel: `${productLabel(m.loanProductId)} ${m.interestSchemeName} ${m.interestSchemeCode}`
    }))
  ),
  { searchFields: ['searchLabel'], pageSize: 15 }
)

const totalLabel = computed(() => {
  const count = mappings.value?.length ?? 0
  return count === 1
    ? t('loanConfig.loanProductInterestSchemes.total.one')
    : t('loanConfig.loanProductInterestSchemes.total.other', { count })
})

// Shared by both forms; create additionally picks the owning loan product
// (fixed for the lifetime of the assignment — it's the path param, not part
// of the request body, so it isn't editable afterwards).
const commonFields = computed<FieldDef[]>(() => [
  { name: 'priority', label: t('loanConfig.shared.priorityColumn'), type: 'number', required: true, min: 0, wrapper: 'half' },
  {
    name: 'isDefault',
    label: t('loanConfig.loanProductInterestSchemes.defaultSchemeFieldLabel'),
    type: 'switch',
    wrapper: 'half'
  },
  {
    name: 'effectiveFrom',
    label: t('loanConfig.shared.effectiveFromLabel'),
    type: 'date',
    required: true,
    wrapper: 'half'
  },
  {
    name: 'effectiveTo',
    label: t('loanConfig.shared.effectiveToLabel'),
    type: 'date',
    hint: t('loanConfig.shared.effectiveToHint'),
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
    name: 'interestSchemeId',
    label: t('loanConfig.loanProductInterestSchemes.interestSchemeColumn'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: schemeOptions.value
  },
  ...commonFields.value
])

const editFields = computed<FieldDef[]>(() => [
  {
    name: 'interestSchemeId',
    label: t('loanConfig.loanProductInterestSchemes.interestSchemeColumn'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: schemeOptions.value
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
    interestSchemeId: undefined,
    priority: 0,
    isDefault: false,
    effectiveFrom: '',
    effectiveTo: '',
    status: 'ACTIVE'
  }
  error.value = ''
  showCreate.value = true
}

function toPayload(values: Record<string, any>): LoanProductInterestSchemeRequest {
  return {
    interestSchemeId: values.interestSchemeId,
    priority: values.priority,
    isDefault: values.isDefault ?? false,
    effectiveFrom: values.effectiveFrom,
    effectiveTo: values.effectiveTo || undefined,
    status: values.status
  }
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    await api(`/loan-products/${values.loanProductId}/interest-schemes`, {
      method: 'POST',
      body: toPayload(values)
    })
    toast.add({ title: t('loanConfig.loanProductInterestSchemes.interestSchemeAssignedToast'), color: 'green' })
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
const editingRow = ref<LoanProductInterestSchemeResponse | null>(null)
const editForm = ref<Record<string, any>>({})

function openEdit(row: LoanProductInterestSchemeResponse) {
  editingRow.value = row
  editForm.value = {
    interestSchemeId: row.interestSchemeId,
    priority: row.priority,
    isDefault: row.isDefault,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo ?? '',
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
    await api(
      `/loan-products/${editingRow.value.loanProductId}/interest-schemes/${editingRow.value.id}`,
      {
        method: 'PUT',
        body: toPayload(values)
      }
    )
    toast.add({ title: t('loanConfig.shared.assignmentUpdated'), color: 'green' })
    showEdit.value = false
    await refresh()
  } catch (err) {
    editError.value = apiErrorMessage(err)
  } finally {
    editing.value = false
  }
}

async function onSetDefault(row: LoanProductInterestSchemeResponse) {
  try {
    await api(`/loan-products/${row.loanProductId}/interest-schemes/${row.id}/set-default`, {
      method: 'PUT'
    })
    toast.add({ title: t('loanConfig.loanProductInterestSchemes.setDefaultToast'), color: 'green' })
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  }
}

const deleting = ref(false)
const confirmDelete = ref<LoanProductInterestSchemeResponse | null>(null)

async function onDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await api(
      `/loan-products/${confirmDelete.value.loanProductId}/interest-schemes/${confirmDelete.value.id}`,
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
