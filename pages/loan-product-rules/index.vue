<template>
  <div>
    <PageHeader :title="t('loanConfig.loanProductRules.title')" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">{{
          t('loanConfig.loanProductRules.assignRule')
        }}</UButton>
      </template>
    </PageHeader>

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          :placeholder="t('loanConfig.loanProductRules.searchPlaceholder')"
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
            :icon="search ? 'i-heroicons-magnifying-glass' : 'i-heroicons-shield-check'"
            :title="search ? t('common.noMatches') : t('loanConfig.loanProductRules.emptyTitle')"
            :description="
              search
                ? t('common.nothingMatches', { query: search })
                : t('loanConfig.loanProductRules.emptyDescription')
            "
          >
            <template v-if="!search" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">{{
                t('loanConfig.loanProductRules.assignRule')
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
          <span class="font-semibold">{{ t('loanConfig.loanProductRules.assignRule') }}</span>
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
          <span class="font-semibold">{{ t('loanConfig.loanProductRules.editHeader') }}</span>
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
      :description="t('loanConfig.loanProductRules.removeDescription')"
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
  LoanProductRuleRequest,
  LoanProductRuleResponse,
  LoanProductResponse
} from '~/features/loan-products/types'
import type { RuleTemplateResponse } from '~/features/loan-configuration/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const api = useApi()
const toast = useToast()
const { t } = useI18n()

const {
  data: rules,
  pending,
  refresh
} = await useAsyncData('loan-product-rules', () =>
  api<LoanProductRuleResponse[]>('/loan-products/rules')
)
const { data: products } = await useAsyncData('loan-product-rules-products', () =>
  api<LoanProductResponse[]>('/loan-products')
)
const { data: templates } = await useAsyncData('loan-product-rules-templates', () =>
  api<RuleTemplateResponse[]>('/rule-templates')
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
    label: `${t.name} (${t.code}) — ${formatEnum(t.field)} ${formatEnum(t.operator)} ${t.value}`,
    value: t.id
  }))
)

const columns = computed<ColumnDef<LoanProductRuleResponse>[]>(() => [
  {
    key: 'loanProductId',
    label: t('loanConfig.shared.loanProductColumn'),
    value: (row) => productLabel(row.loanProductId)
  },
  {
    key: 'ruleTemplateName',
    label: t('loanConfig.loanProductRules.ruleColumn'),
    value: (row) => `${row.ruleTemplateName} (${row.ruleTemplateCode})`
  },
  { key: 'field', label: t('loanConfig.shared.fieldColumn'), type: 'enum' },
  { key: 'operator', label: t('loanConfig.shared.operatorColumn'), type: 'enum' },
  { key: 'value', label: t('loanConfig.shared.valueColumn'), to: 'value2', toEmpty: '' },
  { key: 'status', label: t('loanConfig.shared.statusColumn'), type: 'status', sortable: true },
  { key: 'actions', label: '', class: 'text-right' }
])

const { search, page, pageSize, sort, total, rows } = useClientTable(
  computed(() =>
    (rules.value ?? []).map((r) => ({
      ...r,
      searchLabel: `${productLabel(r.loanProductId)} ${r.ruleTemplateName} ${r.ruleTemplateCode}`
    }))
  ),
  { searchFields: ['searchLabel'], pageSize: 15 }
)

const totalLabel = computed(() => {
  const count = rules.value?.length ?? 0
  return count === 1
    ? t('loanConfig.loanProductRules.total.one')
    : t('loanConfig.loanProductRules.total.other', { count })
})

// Shared by both forms; create additionally picks the owning loan product
// (fixed for the lifetime of the assignment — it's the path param, not part
// of the request body, so it isn't editable afterwards).
const commonFields = computed<FieldDef[]>(() => [
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
    name: 'ruleTemplateId',
    label: t('loanConfig.loanProductRules.ruleTemplateFieldLabel'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: templateOptions.value
  },
  ...commonFields.value
])

const editFields = computed<FieldDef[]>(() => [
  {
    name: 'ruleTemplateId',
    label: t('loanConfig.loanProductRules.ruleTemplateFieldLabel'),
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
    ruleTemplateId: undefined,
    status: 'ACTIVE'
  }
  error.value = ''
  showCreate.value = true
}

function toPayload(values: Record<string, any>): LoanProductRuleRequest {
  return {
    ruleTemplateId: values.ruleTemplateId,
    status: values.status
  }
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    await api(`/loan-products/${values.loanProductId}/rules`, {
      method: 'POST',
      body: toPayload(values)
    })
    toast.add({ title: t('loanConfig.loanProductRules.ruleAssignedToast'), color: 'green' })
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
const editingRow = ref<LoanProductRuleResponse | null>(null)
const editForm = ref<Record<string, any>>({})

function openEdit(row: LoanProductRuleResponse) {
  editingRow.value = row
  editForm.value = {
    ruleTemplateId: row.ruleTemplateId,
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
    await api(`/loan-products/${editingRow.value.loanProductId}/rules/${editingRow.value.id}`, {
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

const deleting = ref(false)
const confirmDelete = ref<LoanProductRuleResponse | null>(null)

async function onDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await api(
      `/loan-products/${confirmDelete.value.loanProductId}/rules/${confirmDelete.value.id}`,
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
